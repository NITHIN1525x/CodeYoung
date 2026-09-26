from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "service": "codeyoung-api", "trial_class_duration_minutes": settings.TRIAL_CLASS_DURATION_MINUTES})
