from datetime import datetime, timezone
from secrets import token_hex

from common.timezones import format_local_datetime, local_datetime_candidates, utc_to_local
from chatbot.models import SupportCallbackRequest

UTC = timezone.utc


def create_callback_request(data):
    local_start = datetime.combine(data["preferred_date"], data["preferred_time"])
    candidates = local_datetime_candidates(local_start, data["timezone"])
    if not candidates:
        raise ValueError("That local time does not exist because of a daylight-saving clock change. Choose another time.")
    if len(candidates) > 1:
        raise ValueError("That local time occurs twice because of a daylight-saving clock change. Choose another time.")
    start_utc = candidates[0]
    if start_utc <= datetime.now(UTC):
        raise ValueError("Choose a future date and time for the callback request.")

    while True:
        reference = f"CALL-{data['preferred_date']:%Y%m%d}-{token_hex(3).upper()}"
        if not SupportCallbackRequest.objects.filter(reference=reference).exists():
            break

    callback = SupportCallbackRequest.objects.create(
        reference=reference,
        parent_name=data["parent_name"],
        parent_email=data["parent_email"],
        preferred_start_utc=start_utc,
        timezone=data["timezone"],
        topic=data["topic"],
    )
    local_start = utc_to_local(callback.preferred_start_utc, callback.timezone)
    return {
        "reference": callback.reference,
        "parent_name": callback.parent_name,
        "date": local_start.strftime("%A, %B %d, %Y"),
        "local_time": format_local_datetime(callback.preferred_start_utc, callback.timezone),
        "timezone": callback.timezone,
        "topic": callback.topic,
        "status": callback.status,
        "demo_notice": "This is a demo callback request. No real phone call or callback email will be sent.",
    }
