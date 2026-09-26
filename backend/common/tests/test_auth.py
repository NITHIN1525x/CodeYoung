import json

from django.contrib.auth import get_user_model
from django.core import mail
from django.test import Client, TestCase, override_settings


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class SessionAuthenticationTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            username="parent.account",
            email="parent@example.com",
            password="a-long-demo-password",
            first_name="Jordan",
        )

    def csrf_headers(self):
        response = self.client.get("/api/auth/csrf/")
        self.assertEqual(response.status_code, 200)
        return {"HTTP_X_CSRFTOKEN": response.json()["csrfToken"]}

    def test_login_authenticates_by_email_and_creates_a_session(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": " PARENT@example.com ", "password": "a-long-demo-password", "remember": True}),
            content_type="application/json",
            **self.csrf_headers(),
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], self.user.email)
        self.assertEqual(response.json()["user"]["role"], "account")
        self.assertTrue(int(self.client.session.get("_auth_user_id")) == self.user.pk)

    def test_invalid_credentials_return_a_generic_message(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": self.user.email, "password": "incorrect"}),
            content_type="application/json",
            **self.csrf_headers(),
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.json(), {"detail": "Email or password is incorrect."})

    def test_login_requires_csrf_protection(self):
        response = self.client.post(
            "/api/auth/login/",
            data=json.dumps({"email": self.user.email, "password": "a-long-demo-password"}),
            content_type="application/json",
        )
        self.assertEqual(response.status_code, 403)

    def test_password_reset_response_does_not_disclose_account_existence(self):
        headers = self.csrf_headers()
        known = self.client.post(
            "/api/auth/password-reset/", data=json.dumps({"email": self.user.email}),
            content_type="application/json", **headers,
        )
        unknown = self.client.post(
            "/api/auth/password-reset/", data=json.dumps({"email": "nobody@example.com"}),
            content_type="application/json", **headers,
        )
        self.assertEqual(known.status_code, 200)
        self.assertEqual(known.json(), unknown.json())
        self.assertEqual(len(mail.outbox), 1)
