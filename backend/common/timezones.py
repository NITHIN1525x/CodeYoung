"""Shared IANA timezone validation and conversion utilities."""
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.core.exceptions import ValidationError


def validate_iana_timezone(name: str) -> None:
    try:
        ZoneInfo(name)
    except (ZoneInfoNotFoundError, TypeError) as exc:
        raise ValidationError("Enter a valid IANA timezone identifier.", code="invalid_timezone") from exc


def get_iana_timezone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, TypeError) as exc:
        raise ValueError(f"Invalid IANA timezone: {name!r}") from exc


def local_datetime_candidates(local_value: datetime, timezone_name: str) -> list[datetime]:
    """Resolve a naive wall time. DST gaps return none and folds return both UTC instants."""
    if local_value.tzinfo is not None:
        raise ValueError("Expected a naive local datetime")
    zone = get_iana_timezone(timezone_name)
    candidates = set()
    for fold in (0, 1):
        utc_value = local_value.replace(tzinfo=zone, fold=fold).astimezone(timezone.utc)
        if utc_value.astimezone(zone).replace(tzinfo=None) == local_value:
            candidates.add(utc_value)
    return sorted(candidates)


def local_datetime_to_utc(local_value: datetime, timezone_name: str, *, fold: int | None = None) -> datetime:
    candidates = local_datetime_candidates(local_value, timezone_name)
    if not candidates:
        raise ValueError(f"{local_value} does not exist in {timezone_name}")
    if len(candidates) > 1:
        if fold not in (0, 1):
            raise ValueError(f"{local_value} is ambiguous in {timezone_name}; specify fold=0 or fold=1")
        return local_value.replace(tzinfo=get_iana_timezone(timezone_name), fold=fold).astimezone(timezone.utc)
    return candidates[0]


def utc_to_local(instant: datetime, timezone_name: str) -> datetime:
    if instant.tzinfo is None:
        raise ValueError("Expected an aware UTC instant")
    return instant.astimezone(get_iana_timezone(timezone_name))


def local_day_bounds_utc(local_date: date, timezone_name: str) -> tuple[datetime, datetime]:
    """Return UTC bounds for a local calendar day, including 23/25-hour DST days."""
    def valid_midnight(day: date) -> datetime:
        wall = datetime.combine(day, time.min)
        for _ in range(1440):
            candidates = local_datetime_candidates(wall, timezone_name)
            if candidates:
                return candidates[0]
            wall += timedelta(minutes=1)
        raise ValueError(f"No valid time found for {day} in {timezone_name}")

    return valid_midnight(local_date), valid_midnight(local_date + timedelta(days=1))


def format_local_datetime(instant: datetime, timezone_name: str) -> str:
    local_value = utc_to_local(instant, timezone_name)
    clock = local_value.strftime("%I:%M %p %Z").lstrip("0")
    return clock
