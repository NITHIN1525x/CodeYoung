from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response

from chatbot.models import SupportCallbackRequest
from chatbot.serializers import SupportCallbackRequestSerializer
from chatbot.services import create_callback_request
from common.timezones import format_local_datetime


@api_view(["POST"])
@permission_classes([AllowAny])
def create_support_callback(request):
    serializer = SupportCallbackRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    try:
        result = create_callback_request(serializer.validated_data)
    except ValueError as exc:
        return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
    return Response(result, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_support_callbacks(request):
    callbacks = SupportCallbackRequest.objects.order_by("-created_at")
    return Response([
        {
            "reference": item.reference,
            "parent_name": item.parent_name,
            "parent_email": item.parent_email,
            "preferred_start_utc": item.preferred_start_utc.isoformat(),
            "timezone": item.timezone,
            "local_time": format_local_datetime(item.preferred_start_utc, item.timezone),
            "topic": item.topic,
            "status": item.status,
            "created_at": item.created_at.isoformat(),
            "demo_only": True,
        }
        for item in callbacks
    ])
