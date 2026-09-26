"""Read mentor load using each mentor's own local calendar day."""
from datetime import datetime, timezone

from bookings.models import Appointment
from common.timezones import local_day_bounds_utc, utc_to_local
from mentors.models import Mentor

UTC = timezone.utc
ACTIVE_APPOINTMENT_STATUSES = (Appointment.Status.SCHEDULED, Appointment.Status.COMPLETED)


def get_mentor_local_daily_capacity(*, now=None) -> list[dict]:
    """Return today's class count and capacity for each active mentor in their timezone."""
    instant = now or datetime.now(UTC)
    if instant.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    instant = instant.astimezone(UTC)

    rows = []
    for mentor in Mentor.objects.filter(active=True).order_by("name"):
        local_date = utc_to_local(instant, mentor.timezone).date()
        start_utc, end_utc = local_day_bounds_utc(local_date, mentor.timezone)
        classes_today = Appointment.objects.filter(
            mentor=mentor,
            status__in=ACTIVE_APPOINTMENT_STATUSES,
            start_time_utc__gte=start_utc,
            start_time_utc__lt=end_utc,
        ).count()
        rows.append({
            "id": mentor.pk,
            "name": mentor.name,
            "continent": mentor.continent,
            "country": mentor.country,
            "state_region": mentor.state_region,
            "city": mentor.city,
            "timezone": mentor.timezone,
            "local_date": local_date.isoformat(),
            "classes_today": classes_today,
            "daily_capacity": 2,
        })
    return rows
