"""Timezone-aware mentor availability and slot generation."""
from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Iterable

from django.db.models import Q

from bookings.models import Appointment
from common.timezones import (
    format_local_datetime,
    get_iana_timezone,
    local_datetime_candidates,
    local_day_bounds_utc,
    utc_to_local,
)
from mentors.models import Mentor

UTC = timezone.utc


def _working_intervals(working_hours: dict, weekday: int) -> list[tuple[time, time]]:
    """Read ISO-weekday intervals; each day may contain one interval or a list."""
    raw = working_hours.get(str(weekday), working_hours.get(weekday, []))
    if not raw:
        return []
    if isinstance(raw, dict):
        raw = [raw]
    if not isinstance(raw, list):
        raise ValueError("Working hours must be an interval or list of intervals")
    intervals = []
    for interval in raw:
        try:
            start = time.fromisoformat(interval["start"])
            end = time.fromisoformat(interval["end"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError("Working-hour intervals require valid 'start' and 'end' times") from exc
        if start.tzinfo or end.tzinfo or start >= end:
            raise ValueError("Working hours must be local wall times with start before end")
        intervals.append((start, end))
    return intervals


def compute_available_slots(
    requested_date: date,
    parent_timezone: str,
    mentors: Iterable,
    appointments: Iterable = (),
    *,
    now: datetime | None = None,
    slot_duration_minutes: int = 30,
    slot_step_minutes: int = 30,
    daily_limit: int = 2,
) -> list[dict]:
    """Build parent-local slots from mentor-local schedules and existing UTC appointments.

    This pure computation accepts records as arguments for isolated tests. The
    database-backed get_available_slots function loads active mentors and bookings.
    An appointment counts against the mentor-local calendar date on which it starts.
    """
    get_iana_timezone(parent_timezone)
    if slot_duration_minutes <= 0 or slot_step_minutes <= 0 or daily_limit <= 0:
        raise ValueError("Slot duration, step, and daily limit must be positive")
    if now is None:
        now = datetime.now(UTC)
    elif now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    now = now.astimezone(UTC)

    parent_day_start, parent_day_end = local_day_bounds_utc(requested_date, parent_timezone)
    duration = timedelta(minutes=slot_duration_minutes)
    step = timedelta(minutes=slot_step_minutes)
    appointments = [
        a for a in appointments
        if a.status in {Appointment.Status.SCHEDULED, Appointment.Status.COMPLETED}
    ]
    candidates: dict[datetime, list[tuple[object, date]]] = defaultdict(list)

    for mentor in mentors:
        if not mentor.active:
            continue
        get_iana_timezone(mentor.timezone)
        first_day = utc_to_local(parent_day_start, mentor.timezone).date()
        last_day = utc_to_local(parent_day_end - timedelta(microseconds=1), mentor.timezone).date()
        current_day = first_day
        while current_day <= last_day:
            for local_start, local_end in _working_intervals(mentor.working_hours, current_day.isoweekday()):
                window_start = datetime.combine(current_day, local_start)
                window_end = datetime.combine(current_day, local_end)
                wall_start = window_start
                while wall_start + duration <= window_end:
                    for utc_start in local_datetime_candidates(wall_start, mentor.timezone):
                        if not (parent_day_start <= utc_start < parent_day_end):
                            continue
                        local_end_wall = utc_to_local(utc_start + duration, mentor.timezone).replace(tzinfo=None)
                        # Appointment duration is elapsed time. This comparison allows
                        # the displayed wall clock to move backward during a DST fold.
                        if not (window_start <= local_end_wall <= window_end):
                            continue
                        if utc_start > now:
                            candidates[utc_start].append((mentor, current_day))
                    wall_start += step
            current_day += timedelta(days=1)

    results = []
    for utc_start, possible_mentors in sorted(candidates.items()):
        utc_end = utc_start + duration
        parent_local = utc_to_local(utc_start, parent_timezone)
        available_count = 0
        seen = set()
        for mentor, mentor_day in possible_mentors:
            if mentor.pk in seen:
                continue
            seen.add(mentor.pk)
            day_start, day_end = local_day_bounds_utc(mentor_day, mentor.timezone)
            daily_count = sum(
                1 for appointment in appointments
                if appointment.mentor_id == mentor.pk
                and day_start <= appointment.start_time_utc < day_end
            )
            has_conflict = any(
                appointment.mentor_id == mentor.pk
                and appointment.start_time_utc < utc_end
                and appointment.end_time_utc > utc_start
                for appointment in appointments
            )
            if daily_count < daily_limit and not has_conflict:
                available_count += 1

        display_tz = sorted({m.timezone for m, _ in possible_mentors})[0]
        results.append({
            "start_time_utc": utc_start.isoformat(),
            "end_time_utc": utc_end.isoformat(),
            "parent_local_time": parent_local.isoformat(),
            "fold": parent_local.fold,
            "parent_local_display": format_local_datetime(utc_start, parent_timezone),
            "mentor_local_time": format_local_datetime(utc_start, display_tz),
            "mentor_timezone": display_tz,
            "mentor_local_times": sorted({
                f"{format_local_datetime(utc_start, tz)} ({tz})"
                for tz in {m.timezone for m, _ in possible_mentors}
            }),
            "available_mentor_count": available_count,
            "available": available_count > 0,
        })
    return results


def get_available_slots(
    requested_date: date,
    parent_timezone: str,
    *,
    now: datetime | None = None,
    slot_duration_minutes: int = 30,
    slot_step_minutes: int = 30,
    daily_limit: int = 2,
) -> list[dict]:
    """Load scheduling records and return bookable/displayable slots without mentor IDs."""
    parent_start, parent_end = local_day_bounds_utc(requested_date, parent_timezone)
    mentors = list(Mentor.objects.filter(active=True))
    if not mentors:
        return []

    day_bounds = []
    for mentor in mentors:
        first = utc_to_local(parent_start, mentor.timezone).date()
        last = utc_to_local(parent_end - timedelta(microseconds=1), mentor.timezone).date()
        day = first
        while day <= last:
            day_bounds.append(local_day_bounds_utc(day, mentor.timezone))
            day += timedelta(days=1)
    lower = min(bounds[0] for bounds in day_bounds)
    upper = max(bounds[1] for bounds in day_bounds)
    appointments = list(
        Appointment.objects.filter(status__in=[Appointment.Status.SCHEDULED, Appointment.Status.COMPLETED])
        .filter(
            Q(start_time_utc__gte=lower, start_time_utc__lt=upper)
            | Q(start_time_utc__lt=parent_end, end_time_utc__gt=parent_start)
        )
        .select_related("mentor")
    )
    return compute_available_slots(
        requested_date, parent_timezone, mentors, appointments,
        now=now, slot_duration_minutes=slot_duration_minutes,
        slot_step_minutes=slot_step_minutes, daily_limit=daily_limit,
    )
