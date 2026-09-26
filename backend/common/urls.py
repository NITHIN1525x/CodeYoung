from django.urls import path

from .views import csrf_cookie, health, request_password_reset, session_login

urlpatterns = [
    path("health/", health, name="health"),
    path("auth/csrf/", csrf_cookie, name="auth-csrf"),
    path("auth/login/", session_login, name="auth-login"),
    path("auth/password-reset/", request_password_reset, name="auth-password-reset"),
]
