"""Transactional booking orchestration and automatic mentor assignment."""
from datetime import date, datetime, time, timedelta, timezone
import hashlib
import json
from uuid import uuid4

from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.validators import EmailValidator
from django.db import transaction

from bookings.models import Appointment, Parent
from notifications.models import EmailOutbox
from notifications.services.delivery import deliver_outbox_email
from common.timezones import (
    format_local_datetime,
    get_iana_timezone,
    local_datetime_candidates,
    local_day_bounds_utc,
    utc_to_local,
    validate_iana_timezone,
)
from mentors.models import Mentor
from mentors.services.availability import _working_intervals

UTC = timezone.utc
ACTIVE_APPOINTMENT_STATUSES = (Appointment.Status.SCHEDULED, Appointment.Status.COMPLETED)


class BookingValidationError(ValueError):
    """The submitted booking request is invalid."""


class IdempotencyConflict(Exception):
    """An idempotency key was reused for a different request."""


class NoAvailableMentor(Exception):
    """No mentor can take the requested slot."""


def _validate_parent(data: dict) -> dict:
    required = ("name", "email", "continent", "country", "state_region", "city", "timezone")
    cleaned = {}
    for field in required:
        value = data.get(field)
        if not isinstance(value, str) or not value.strip():
            raise BookingValidationError(f"{field} is required.")
        cleaned[field] = value.strip()

    field_limits = {"email": 254, "continent": 80, "country": 100, "state_region": 100, "city": 100, "timezone": 64}
    for field, limit in field_limits.items():
        if len(cleaned[field]) > limit:
            raise BookingValidationError(f"{field} must be at most {limit} characters.")
    if len(cleaned["name"]) > 160:
        raise BookingValidationError("Parent name must be at most 160 characters.")
    try:
        EmailValidator()(cleaned["email"])
        validate_iana_timezone(cleaned["timezone"])
    except DjangoValidationError as exc:
        raise BookingValidationError("; ".join(exc.messages)) from exc
    return cleaned


def _resolve_parent_start(
    data: dict, parent_timezone: str, fold: int | None, *, reject_past: bool = True,
) -> datetime:
    selected_date = data.get("selected_date")
    selected_time = data.get("selected_time")
    if not isinstance(selected_date, date) or isinstance(selected_date, datetime):
        raise BookingValidationError("selected_date must be a valid calendar date.")
    if not isinstance(selected_time, time):
        raise BookingValidationError("selected_time must be a valid local time.")
    if selected_time.tzinfo is not None:
        raise BookingValidationError("selected_time must be a local wall time without an offset.")
    if selected_time.second or selected_time.microsecond:
        raise BookingValidationError("Select a time on a whole minute.")
    local_start = datetime.combine(selected_date, selected_time)
    candidates = local_datetime_candidates(local_start, parent_timezone)
    if not candidates:
        raise BookingValidationError("The selected local time does not exist because of a daylight-saving transition.")
    if len(candidates) > 1:
        if fold not in (0, 1):
            raise BookingValidationError("This local time occurs twice; submit fold=0 or fold=1.")
        start_utc = local_start.replace(tzinfo=get_iana_timezone(parent_timezone), fold=fold).astimezone(UTC)
    else:
        if fold not in (None, 0, 1):
            raise BookingValidationError("fold must be 0 or 1.")
        start_utc = candidates[0]
    if reject_past and start_utc <= datetime.now(UTC):
        raise BookingValidationError("The selected appointment time is in the past.")
    return start_utc


def _mentor_is_working(mentor: Mentor, start_utc: datetime, end_utc: datetime, step_minutes: int) -> bool:
    local_start = utc_to_local(start_utc, mentor.timezone)
    local_end = utc_to_local(end_utc, mentor.timezone).replace(tzinfo=None)
    local_wall_start = local_start.replace(tzinfo=None)
    try:
        intervals = _working_intervals(mentor.working_hours, local_start.isoweekday())
    except ValueError:
        return False
    for interval_start, interval_end in intervals:
        window_start = datetime.combine(local_start.date(), interval_start)
        window_end = datetime.combine(local_start.date(), interval_end)
        minute_offset = (local_wall_start - window_start).total_seconds() / 60
        aligned = minute_offset >= 0 and minute_offset % step_minutes == 0 and local_start.second == 0
        if aligned and window_start <= local_wall_start < window_end and window_start <= local_end <= window_end:
            return True
    return False


def _parent_record(data: dict) -> Parent:
    parent = Parent.objects.select_for_update().filter(email__iexact=data["email"]).first()
    if parent is None:
        return Parent.objects.create(**data)
    for field, value in data.items():
        setattr(parent, field, value)
    parent.save(update_fields=list(data))
    return parent


def _request_fingerprint(parent_data: dict, start_utc: datetime) -> str:
    canonical = {**parent_data, "start_time_utc": start_utc.isoformat()}
    payload = json.dumps(canonical, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def create_booking(data: dict, idempotency_key: str) -> tuple[Appointment, bool]:
    """Validate, assign under mentor-row locks, and atomically create appointment and outbox."""
    if not idempotency_key or len(idempotency_key) > 128:
        raise BookingValidationError("A valid Idempotency-Key header is required.")

    parent_data = _validate_parent(data)
    parent_timezone = parent_data["timezone"]
    fold = data.get("fold")
    if fold not in (None, 0, 1):
        raise BookingValidationError("fold must be 0 or 1.")
    # Resolve the wall time before checking idempotency, but defer the past-slot
    # rejection so a valid retry can replay its already-created booking.
    start_utc = _resolve_parent_start(data, parent_timezone, fold, reject_past=False)
    fingerprint = _request_fingerprint(parent_data, start_utc)

    # Fast replay path. Recheck after row locks below to handle concurrent retries.
    existing = Appointment.objects.select_related("parent", "mentor").filter(
        idempotency_key=idempotency_key
    ).first()
    if existing:
        if existing.request_fingerprint and existing.request_fingerprint != fingerprint:
            raise IdempotencyConflict("This Idempotency-Key was already used for a different booking request.")
        return existing, False
    if start_utc <= datetime.now(UTC):
        raise BookingValidationError("The selected appointment time is in the past.")

    from django.conf import settings
    duration_minutes = settings.TRIAL_CLASS_DURATION_MINUTES
    step_minutes = settings.TRIAL_CLASS_SLOT_STEP_MINUTES
    end_utc = start_utc + timedelta(minutes=duration_minutes)

    with transaction.atomic():
        # Lock active mentors in stable order. This serializes competing assignment
        # decisions, so each transaction sees appointments committed by the previous one.
        mentors = list(Mentor.objects.select_for_update().filter(active=True).order_by("pk"))
        existing = Appointment.objects.select_related("parent", "mentor").filter(
            idempotency_key=idempotency_key
        ).first()
        if existing:
            if existing.request_fingerprint and existing.request_fingerprint != fingerprint:
                raise IdempotencyConflict("This Idempotency-Key was already used for a different booking request.")
            return existing, False
        if start_utc <= datetime.now(UTC):
            raise BookingValidationError("The selected appointment time is in the past.")

        eligible = []
        for mentor in mentors:
            if not _mentor_is_working(mentor, start_utc, end_utc, step_minutes):
                continue
            mentor_local_date = utc_to_local(start_utc, mentor.timezone).date()
            day_start, day_end = local_day_bounds_utc(mentor_local_date, mentor.timezone)
            day_classes = Appointment.objects.filter(
                mentor=mentor,
                status__in=ACTIVE_APPOINTMENT_STATUSES,
                start_time_utc__gte=day_start,
                start_time_utc__lt=day_end,
            )
            load = day_classes.count()
            if load >= 2:
                continue
            conflict = Appointment.objects.filter(
                mentor=mentor,
                status__in=ACTIVE_APPOINTMENT_STATUSES,
                start_time_utc__lt=end_utc,
                end_time_utc__gt=start_utc,
            ).exists()
            if not conflict:
                eligible.append((load, mentor.name.casefold(), mentor))

        if not eligible:
            raise NoAvailableMentor("No mentor is available for the selected time.")

        _, _, mentor = min(eligible, key=lambda item: (item[0], item[1], item[2].pk))
        parent = _parent_record(parent_data)
        from django.conf import settings
        meeting_id = uuid4().hex
        appointment = Appointment.objects.create(
            parent=parent,
            mentor=mentor,
            start_time_utc=start_utc,
            end_time_utc=end_utc,
            meeting_link=f"{settings.FRONTEND_BASE_URL}/class/{meeting_id}",
            status=Appointment.Status.SCHEDULED,
            idempotency_key=idempotency_key,
            request_fingerprint=fingerprint,
        )

        parent_local = format_local_datetime(start_utc, parent.timezone)
        mentor_local = format_local_datetime(start_utc, mentor.timezone)
        parent_local_date = utc_to_local(start_utc, parent.timezone).strftime("%A, %B %d, %Y")
        mentor_local_date = utc_to_local(start_utc, mentor.timezone).strftime("%A, %B %d, %Y")
        parent_email = EmailOutbox.objects.create(
            appointment=appointment,
            recipient=parent.email,
            email_type=EmailOutbox.EmailType.BOOKING_CONFIRMATION,
            subject="Your CodeYoung Trial Class is Confirmed!",
            body=(
                f"Your CodeYoung Trial Class is Confirmed!\n\n"
                f"Hi {parent.name},\n\n"
                "Your trial class has been successfully booked.\n\n"
                f"Your Time: {parent_local_date}, {parent_local}\n"
                f"Mentor: {mentor.name}\n"
                f"Mentor's Local Time: {mentor_local_date}, {mentor_local}\n\n"
                f"Join your trial class:\n{appointment.meeting_link}\n\n"
                "Please use this link at your scheduled time.\n\n"
                "See you in class!\nCodeYoung"
            ),
        )
        mentor_email = EmailOutbox.objects.create(
            appointment=appointment,
            recipient=mentor.email,
            email_type=EmailOutbox.EmailType.MENTOR_NOTIFICATION,
            subject="A CodeYoung trial class has been assigned to you",
            body=(
                f"A CodeYoung trial class has been assigned to you.\n\n"
                f"Parent: {parent.name} ({parent.email})\n"
                f"Trial class: {parent_local_date}, {parent_local} parent local time\n"
                f"Your local time: {mentor_local_date}, {mentor_local}\n\n"
                f"Meeting link: {appointment.meeting_link}"
            ),
        )
        transaction.on_commit(
            lambda email_id=parent_email.pk: deliver_outbox_email(email_id),
            robust=True,
        )
        transaction.on_commit(
            lambda email_id=mentor_email.pk: deliver_outbox_email(email_id),
            robust=True,
        )
        return appointment, True


def serialize_booking(appointment: Appointment) -> dict:
    start = appointment.start_time_utc
    end = appointment.end_time_utc
    parent_local = utc_to_local(start, appointment.parent.timezone)
    mentor_local = utc_to_local(start, appointment.mentor.timezone)
    return {
        "id": appointment.pk,
        "status": appointment.status,
        "start_time_utc": start.isoformat(),
        "end_time_utc": end.isoformat(),
        "parent": {
            "name": appointment.parent.name,
            "email": appointment.parent.email,
            "timezone": appointment.parent.timezone,
            "continent": appointment.parent.continent,
            "country": appointment.parent.country,
            "state_region": appointment.parent.state_region,
            "city": appointment.parent.city,
            "location": {"continent": appointment.parent.continent, "country": appointment.parent.country, "state_region": appointment.parent.state_region, "city": appointment.parent.city},
            "local_date": parent_local.strftime("%A, %B %d, %Y"),
            "local_time": format_local_datetime(start, appointment.parent.timezone),
        },
        "mentor": {
            "name": appointment.mentor.name,
            "email": appointment.mentor.email,
            "timezone": appointment.mentor.timezone,
            "continent": appointment.mentor.continent,
            "country": appointment.mentor.country,
            "state_region": appointment.mentor.state_region,
            "city": appointment.mentor.city,
            "location": {"continent": appointment.mentor.continent, "country": appointment.mentor.country, "state_region": appointment.mentor.state_region, "city": appointment.mentor.city},
            "local_date": mentor_local.strftime("%A, %B %d, %Y"),
            "local_time": format_local_datetime(start, appointment.mentor.timezone),
        },
        "meeting_link": appointment.meeting_link,
        "confirmation_email_status": appointment.outbox_emails.filter(
            email_type=EmailOutbox.EmailType.BOOKING_CONFIRMATION,
        ).values_list("status", flat=True).first(),
        "mentor_email_status": appointment.outbox_emails.filter(
            email_type=EmailOutbox.EmailType.MENTOR_NOTIFICATION,
        ).values_list("status", flat=True).first(),
        "created_at": appointment.created_at.isoformat(),
    }
