from django.conf import settings
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from bookings.api.serializers import AvailabilityQuerySerializer, BookingRequestSerializer
from bookings.models import Appointment
from bookings.services.creation import (
    BookingValidationError,
    IdempotencyConflict,
    NoAvailableMentor,
    ParentOverlapConflict,
    create_booking,
    serialize_booking,
)
from mentors.models import Mentor
from mentors.services.capacity import get_mentor_local_daily_capacity
from mentors.services.availability import get_available_slots
from notifications.models import EmailOutbox


@api_view(["GET"])
@permission_classes([AllowAny])
def availability(request):
    serializer = AvailabilityQuerySerializer(data=request.query_params)
    serializer.is_valid(raise_exception=True)
    try:
        slots = get_available_slots(
            serializer.validated_data["date"],
            serializer.validated_data["timezone"],
            slot_duration_minutes=settings.TRIAL_CLASS_DURATION_MINUTES,
            slot_step_minutes=settings.TRIAL_CLASS_SLOT_STEP_MINUTES,
        )
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"date": serializer.validated_data["date"], "timezone": serializer.validated_data["timezone"], "slots": slots})


@api_view(["POST"])
@permission_classes([AllowAny])
def create_booking_view(request):
    serializer = BookingRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    idempotency_key = request.headers.get("Idempotency-Key", "")
    try:
        appointment, created = create_booking(serializer.validated_data, idempotency_key)
    except IdempotencyConflict as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    except BookingValidationError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    except NoAvailableMentor as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    except ParentOverlapConflict as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    return Response(serialize_booking(appointment), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([AllowAny])
def retrieve_booking_view(request, booking_id):
    email = request.query_params.get("email", "").strip()
    if not email:
        return Response({"detail": "email query parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
    appointment = get_object_or_404(
        Appointment.objects.select_related("parent", "mentor"),
        pk=booking_id,
        parent__email__iexact=email,
    )
    return Response(serialize_booking(appointment))


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def mentor_bookings_view(request):
    mentor = get_object_or_404(Mentor, email__iexact=request.user.email)
    appointments = Appointment.objects.filter(mentor=mentor).select_related("parent", "mentor").order_by("start_time_utc")
    return Response([serialize_booking(appointment) for appointment in appointments])


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_bookings_view(request):
    appointments = Appointment.objects.select_related("parent", "mentor").order_by("-created_at")
    return Response([serialize_booking(appointment) for appointment in appointments])


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_mentor_capacity_view(request):
    return Response(get_mentor_local_daily_capacity())


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_outbox_view(request):
    emails = EmailOutbox.objects.select_related("appointment", "appointment__parent", "appointment__mentor").order_by("-created_at")
    return Response([
        {
            "id": email.pk,
            "appointment_id": email.appointment_id,
            "recipient": email.recipient,
            "email_type": email.email_type,
            "subject": email.subject,
            "body": email.body,
            "status": email.status,
            "created_at": email.created_at.isoformat(),
        }
        for email in emails
    ])


@api_view(["GET"])
@permission_classes([AllowAny])
def mentors_list_view(request):
    mentors = Mentor.objects.order_by("name")
    return Response([
        {
            "id": mentor.pk,
            "name": mentor.name,
            "continent": mentor.continent,
            "country": mentor.country,
            "state_region": mentor.state_region,
            "city": mentor.city,
            "timezone": mentor.timezone,
            "active": mentor.active,
        }
        for mentor in mentors
    ])


@api_view(["GET"])
@permission_classes([AllowAny])
def mentor_dashboard_bookings_view(request, mentor_id):
    from common.timezones import format_local_datetime, utc_to_local

    mentor = get_object_or_404(Mentor, pk=mentor_id)
    appointments = Appointment.objects.filter(mentor=mentor).select_related("parent", "mentor").order_by("start_time_utc")
    bookings = []
    for appointment in appointments:
        parent_local = utc_to_local(appointment.start_time_utc, appointment.parent.timezone)
        mentor_local = utc_to_local(appointment.start_time_utc, mentor.timezone)
        bookings.append({
            "id": appointment.pk,
            "status": appointment.status,
            "parent": {
                "name": appointment.parent.name,
                "local_date": parent_local.strftime("%A, %B %d, %Y"),
                "local_time": format_local_datetime(appointment.start_time_utc, appointment.parent.timezone),
            },
            "mentor": {
                "local_date": mentor_local.strftime("%A, %B %d, %Y"),
                "local_time": format_local_datetime(appointment.start_time_utc, mentor.timezone),
            },
            "meeting_link": appointment.meeting_link,
        })
    return Response({
        "mentor": {
            "id": mentor.pk, "name": mentor.name,
            "continent": mentor.continent, "country": mentor.country,
            "state_region": mentor.state_region, "city": mentor.city,
            "timezone": mentor.timezone,
        },
        "bookings": bookings,
    })


@api_view(["GET"])
@permission_classes([AllowAny])
def demo_class_view(request, meeting_id):
    """Return the non-sensitive appointment details needed by the demo class page."""
    if len(meeting_id) != 32 or any(character not in "0123456789abcdef" for character in meeting_id.casefold()):
        return Response({"detail": "Demo class not found."}, status=status.HTTP_404_NOT_FOUND)

    appointment = get_object_or_404(
        Appointment.objects.select_related("parent", "mentor"),
        meeting_link__endswith=f"/class/{meeting_id}",
    )
    from common.timezones import format_local_datetime, utc_to_local

    parent_local = utc_to_local(appointment.start_time_utc, appointment.parent.timezone)
    mentor_local = utc_to_local(appointment.start_time_utc, appointment.mentor.timezone)
    now_utc = timezone.now()
    access_available = now_utc >= appointment.start_time_utc
    response_data = {
        "meeting_id": meeting_id,
        "status": appointment.status,
        "start_time_utc": appointment.start_time_utc.isoformat(),
        "access_available": access_available,
        "duration_minutes": int((appointment.end_time_utc - appointment.start_time_utc).total_seconds() // 60),
        "mentor": {
            "name": appointment.mentor.name,
            "continent": appointment.mentor.continent,
            "country": appointment.mentor.country,
            "state_region": appointment.mentor.state_region,
            "city": appointment.mentor.city,
            "location": {
                "continent": appointment.mentor.continent,
                "country": appointment.mentor.country,
                "state_region": appointment.mentor.state_region,
                "city": appointment.mentor.city,
            },
            "timezone": appointment.mentor.timezone,
            "local_date": mentor_local.strftime("%A, %B %d, %Y"),
            "local_time": format_local_datetime(appointment.start_time_utc, appointment.mentor.timezone),
        },
        "parent_time": {
            "timezone": appointment.parent.timezone,
            "location": {
                "continent": appointment.parent.continent,
                "country": appointment.parent.country,
                "state_region": appointment.parent.state_region,
                "city": appointment.parent.city,
            },
            "local_date": parent_local.strftime("%A, %B %d, %Y"),
            "local_time": format_local_datetime(appointment.start_time_utc, appointment.parent.timezone),
        },
    }
    if access_available:
        response_data["video_url"] = settings.DEMO_CLASS_VIDEO_URL
    return Response(response_data)
