from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from chatbot.models import SupportCallbackRequest
from common.timezones import format_local_datetime, local_datetime_to_utc
from notifications.models import EmailOutbox


class SupportCallbackApiTests(TestCase):
    def setUp(self):
        self.client = APIClient(HTTP_HOST="127.0.0.1")
        self.callback_date = date.today() + timedelta(days=10)
        self.payload = {
            "parent_name": "Nithin Parent",
            "parent_email": "parent@example.com",
            "preferred_date": self.callback_date.isoformat(),
            "preferred_time": "10:30",
            "timezone": "America/New_York",
            "topic": "Question about a trial class",
        }

    def test_callback_is_persisted_and_confirmed_in_parent_local_time(self):
        response = self.client.post("/api/support/callbacks/", self.payload, format="json")
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(SupportCallbackRequest.objects.count(), 1)
        callback = SupportCallbackRequest.objects.get()
        expected_utc = local_datetime_to_utc(
            datetime.combine(self.callback_date, time(10, 30)), "America/New_York",
        )
        self.assertEqual(callback.preferred_start_utc, expected_utc)
        self.assertEqual(callback.parent_email, "parent@example.com")
        self.assertEqual(callback.status, SupportCallbackRequest.Status.SCHEDULED)
        self.assertRegex(response.data["reference"], r"^CALL-\d{8}-[A-F0-9]{6}$")
        self.assertEqual(response.data["local_time"], format_local_datetime(expected_utc, "America/New_York"))
        self.assertIn("No real phone call", response.data["demo_notice"])
        self.assertEqual(EmailOutbox.objects.count(), 0)

    def test_callback_rejects_missing_details_and_invalid_timezone(self):
        missing = self.client.post("/api/support/callbacks/", {**self.payload, "topic": ""}, format="json")
        self.assertEqual(missing.status_code, 400)
        invalid_zone = self.client.post("/api/support/callbacks/", {**self.payload, "timezone": "Asia/India/Kolkata"}, format="json")
        self.assertEqual(invalid_zone.status_code, 400)
        self.assertEqual(SupportCallbackRequest.objects.count(), 0)

    def test_callback_rejects_past_and_nonexistent_dst_times(self):
        past = self.client.post("/api/support/callbacks/", {
            **self.payload,
            "preferred_date": (date.today() - timedelta(days=1)).isoformat(),
        }, format="json")
        self.assertEqual(past.status_code, 400)

        dst_gap = self.client.post("/api/support/callbacks/", {
            **self.payload,
            "preferred_date": "2027-03-14",
            "preferred_time": "02:30",
        }, format="json")
        self.assertEqual(dst_gap.status_code, 400)
        self.assertIn("daylight-saving", dst_gap.data["detail"])
        self.assertEqual(SupportCallbackRequest.objects.count(), 0)

    def test_callback_rejects_ambiguous_dst_time(self):
        response = self.client.post("/api/support/callbacks/", {
            **self.payload,
            "preferred_date": "2026-11-01",
            "preferred_time": "01:30",
        }, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertIn("occurs twice", response.data["detail"])

    def test_admin_callback_list_is_staff_only(self):
        self.assertIn(self.client.get("/api/admin/support-callbacks/").status_code, (401, 403))
        self.client.post("/api/support/callbacks/", self.payload, format="json")
        staff = get_user_model().objects.create_user(username="support-admin", password="local-test-pass", is_staff=True)
        self.client.force_authenticate(staff)
        response = self.client.get("/api/admin/support-callbacks/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data[0]["parent_email"], "parent@example.com")
        self.assertTrue(response.data[0]["demo_only"])

    def test_health_endpoint_exposes_configured_trial_duration(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["trial_class_duration_minutes"], settings.TRIAL_CLASS_DURATION_MINUTES)
