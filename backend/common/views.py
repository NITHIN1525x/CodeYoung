import json

from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login
from django.contrib.auth.forms import PasswordResetForm
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "service": "codeyoung-api", "trial_class_duration_minutes": settings.TRIAL_CLASS_DURATION_MINUTES})


@require_GET
@ensure_csrf_cookie
def csrf_cookie(request):
    return JsonResponse({"csrfToken": get_token(request)})


def _json_body(request):
    try:
        payload = json.loads(request.body or b"{}")
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None
    return payload if isinstance(payload, dict) else None


@require_POST
@csrf_protect
def session_login(request):
    payload = _json_body(request)
    email = payload.get("email", "").strip() if payload and isinstance(payload.get("email", ""), str) else ""
    password = payload.get("password", "") if payload else ""
    if not email or not isinstance(password, str) or not password:
        return JsonResponse({"detail": "Please enter your email address and password."}, status=400)

    user_model = get_user_model()
    users = user_model.objects.filter(email__iexact=email, is_active=True)
    if users.count() != 1:
        return JsonResponse({"detail": "Email or password is incorrect."}, status=401)

    user_record = users.first()
    credentials = {user_model.USERNAME_FIELD: getattr(user_record, user_model.USERNAME_FIELD), "password": password}
    user = authenticate(request, **credentials)
    if user is None:
        return JsonResponse({"detail": "Email or password is incorrect."}, status=401)

    login(request, user)
    if payload.get("remember") is False:
        request.session.set_expiry(0)
    role = "admin" if user.is_staff else "account"
    return JsonResponse({
        "user": {
            "email": user.email,
            "display_name": user.get_full_name() or user.email,
            "role": role,
            "is_staff": user.is_staff,
        },
    })


@require_POST
@csrf_protect
def request_password_reset(request):
    payload = _json_body(request)
    email = payload.get("email", "").strip() if payload and isinstance(payload.get("email", ""), str) else ""
    form = PasswordResetForm({"email": email})
    if form.is_valid():
        form.save(request=request, from_email=settings.DEFAULT_FROM_EMAIL)
    # Do not reveal whether an account exists for this address.
    return JsonResponse({
        "detail": "If an active account uses that email, password reset instructions will be sent.",
    })
