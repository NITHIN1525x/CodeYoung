from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, time, timedelta, timezone
from threading import Barrier
from typing import Any, Protocol, cast
from unittest import skipUnless
from unittest.mock import patch
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core import mail
from django.db import close_old_connections, connection
from django.test import TransactionTestCase, override_settings
from rest_framework.test import APIClient

from bookings.models import Appointment, Parent
from bookings.services.creation import BookingValidationError, IdempotencyConflict, NoAvailableMentor, create_booking
from common.timezones import local_datetime_to_utc
from mentors.models import Mentor
from notifications.models import EmailOutbox


class DRFTestResponse(Protocol):
    """The attributes exposed by a rendered Django REST Framework test response."""

    status_code: int
    data: Any
    content: bytes


def api_get(client: APIClient, *args: Any, **kwargs: Any) -> DRFTestResponse:
    """Describe APIClient's DRF Response type at the test-client boundary."""
    return cast(DRFTestResponse, client.get(*args, **kwargs))


def api_post(client: APIClient, *args: Any, **kwargs: Any) -> DRFTestResponse:
    """Describe APIClient's DRF Response type at the test-client boundary."""
    return cast(DRFTestResponse, client.post(*args, **kwargs))


def next_future_edt_weekday():
    candidate = date.today() + timedelta(days=1)
    new_york = ZoneInfo("America/New_York")
    while candidate.weekday() >= 5 or datetime.combine(candidate, time(8), tzinfo=new_york).tzname() != "EDT":
        candidate += timedelta(days=1)
    return candidate


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class BookingWorkflowTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.booking_date = date.today() + timedelta(days=3)
        self.parent_data = {
            "name": "Casey Parent",
            "email": "casey@example.com",
            "continent": "Asia",
            "country": "India",
            "state_region": "Karnataka",
            "city": "Bengaluru",
            "timezone": "Asia/Kolkata",
            "selected_date": self.booking_date,
            "selected_time": time(17, 0),
        }
        hours = {str(day): {"start": "09:00", "end": "22:00"} for day in range(1, 8)}
        self.mentor = Mentor.objects.create(
            name="Rahul Mentor",
            email="rahul.mentor@gmail.com",
            continent="Asia",
            country="India",
            state_region="Karnataka",
            city="Mangalore",
            timezone="Asia/Kolkata",
            working_hours=hours,
        )

    def add_mentor(self, name, email):
        return Mentor.objects.create(
            name=name,
            email=email,
            continent="Asia",
            country="India",
            state_region="Karnataka",
            city="Bengaluru",
            timezone="Asia/Kolkata",
            working_hours=self.mentor.working_hours,
        )

    def add_appointment(self, mentor, starts_at, key):
        parent = Parent.objects.create(
            name=f"Existing {key}", email=f"{key}@example.com",
            continent="Asia", country="India", state_region="Karnataka",
            city="Bengaluru", timezone="Asia/Kolkata",
        )
        return Appointment.objects.create(
            parent=parent, mentor=mentor, start_time_utc=starts_at,
            end_time_utc=starts_at + timedelta(minutes=30),
            meeting_link=f"https://codeyoung.demo/class/test-{key}", idempotency_key=key,
        )

    def test_success_assigns_least_loaded_and_creates_matching_outbox_messages(self):
        less_loaded = self.add_mentor("Ananya Mentor", "ananya.mentor@gmail.com")
        existing_start = datetime.combine(self.booking_date, time(10), tzinfo=timezone.utc)
        self.add_appointment(less_loaded, existing_start, "existing-load")
        appointment, created = create_booking(self.parent_data, "success-001")
        self.assertTrue(created)
        self.assertEqual(appointment.mentor_id, self.mentor.pk)
        messages = list(EmailOutbox.objects.filter(appointment=appointment).order_by("email_type"))
        self.assertEqual(len(messages), 2)
        by_type = {message.email_type: message for message in messages}
        self.assertEqual(by_type[EmailOutbox.EmailType.BOOKING_CONFIRMATION].recipient, "casey@example.com")
        self.assertEqual(by_type[EmailOutbox.EmailType.MENTOR_NOTIFICATION].recipient, self.mentor.email)
        self.assertTrue(all(appointment.meeting_link in message.body for message in messages))
        self.assertIn("5:00 PM IST", by_type[EmailOutbox.EmailType.BOOKING_CONFIRMATION].body)
        self.assertIn("5:00 PM IST", by_type[EmailOutbox.EmailType.MENTOR_NOTIFICATION].body)
        self.assertIn("Asia → India → Karnataka → Bengaluru", by_type[EmailOutbox.EmailType.BOOKING_CONFIRMATION].body)
        self.assertIn("Asia → India → Karnataka → Mangalore", by_type[EmailOutbox.EmailType.MENTOR_NOTIFICATION].body)

    def test_mentor_email_failure_does_not_invalidate_booking_or_parent_delivery(self):
        def fail_mentor_email(message, *, fail_silently=False):
            if message.to == [self.mentor.email]:
                raise OSError("SMTP unavailable")
            return 1

        with patch("notifications.services.delivery.EmailMessage.send", autospec=True, side_effect=fail_mentor_email) as send_email:
            with self.assertLogs("notifications.services.delivery", level="ERROR"):
                appointment, created = create_booking(self.parent_data, "smtp-mentor-failure-001")

        self.assertTrue(created)
        self.assertTrue(Appointment.objects.filter(pk=appointment.pk).exists())
        self.assertEqual(send_email.call_count, 2)
        parent_message = appointment.outbox_emails.get(email_type=EmailOutbox.EmailType.BOOKING_CONFIRMATION)
        mentor_message = appointment.outbox_emails.get(email_type=EmailOutbox.EmailType.MENTOR_NOTIFICATION)
        self.assertEqual(parent_message.status, EmailOutbox.Status.SENT)
        self.assertEqual(mentor_message.status, EmailOutbox.Status.FAILED)
        self.assertEqual(appointment.outbox_emails.count(), 2)

    def test_reserved_example_mentor_email_is_not_sent_and_parent_email_is_independent(self):
        self.mentor.email = "unroutable@codeyoung.example"
        self.mentor.save(update_fields=["email"])
        with patch("notifications.services.delivery.EmailMessage.send", autospec=True, return_value=1) as send_email:
            appointment, created = create_booking(self.parent_data, "reserved-mentor-address")

        self.assertTrue(created)
        self.assertEqual(send_email.call_count, 1)
        self.assertEqual(send_email.call_args.args[0].to, ["casey@example.com"])
        parent_message = appointment.outbox_emails.get(email_type=EmailOutbox.EmailType.BOOKING_CONFIRMATION)
        mentor_message = appointment.outbox_emails.get(email_type=EmailOutbox.EmailType.MENTOR_NOTIFICATION)
        self.assertEqual(parent_message.status, EmailOutbox.Status.SENT)
        self.assertEqual(mentor_message.status, EmailOutbox.Status.FAILED)
        self.assertEqual(mentor_message.recipient, "unroutable@codeyoung.example")

    def test_invalid_email_is_rejected(self):
        data = {**self.parent_data, "email": "bad address"}
        with self.assertRaises(BookingValidationError):
            create_booking(data, "invalid-email-001")

    def test_past_booking_is_rejected(self):
        data = {**self.parent_data, "selected_date": date.today() - timedelta(days=1)}
        with self.assertRaises(BookingValidationError):
            create_booking(data, "past-001")

    def test_no_available_mentor_returns_conflict(self):
        Mentor.objects.update(active=False)
        with self.assertRaises(NoAvailableMentor):
            create_booking(self.parent_data, "no-mentor-001")

    def test_local_day_limit_excludes_mentor_after_two_classes(self):
        self.add_appointment(self.mentor, datetime.combine(self.booking_date, time(10), tzinfo=timezone.utc), "daily-1")
        self.add_appointment(self.mentor, datetime.combine(self.booking_date, time(11), tzinfo=timezone.utc), "daily-2")
        with self.assertRaises(NoAvailableMentor):
            create_booking(self.parent_data, "daily-cap-001")

    def test_overlapping_appointment_excludes_mentor(self):
        starts_at = local_datetime_to_utc(datetime.combine(self.booking_date, time(17)), "Asia/Kolkata")
        self.add_appointment(self.mentor, starts_at, "overlap-existing")
        with self.assertRaises(NoAvailableMentor):
            create_booking(self.parent_data, "overlap-request")

    def test_idempotency_returns_original_booking_without_duplicate_outbox_or_parent_email(self):
        mail.outbox.clear()
        first, created = create_booking(self.parent_data, "idempotent-001")
        second, created_again = create_booking(self.parent_data, "idempotent-001")
        self.assertTrue(created)
        self.assertFalse(created_again)
        self.assertEqual(first.pk, second.pk)
        self.assertEqual(Appointment.objects.filter(idempotency_key="idempotent-001").count(), 1)
        self.assertEqual(EmailOutbox.objects.filter(appointment=first).count(), 2)
        self.assertEqual(len([message for message in mail.outbox if message.to == [self.parent_data["email"]]]), 1)

    def test_idempotency_retry_replays_existing_booking_after_its_start_time(self):
        appointment, _ = create_booking(self.parent_data, "late-network-retry")
        real_datetime = datetime

        class FutureDateTime(real_datetime):
            @classmethod
            def now(cls, tz=None):
                future = real_datetime(2099, 1, 1, tzinfo=timezone.utc)
                return future if tz is None else future.astimezone(tz)

        with patch("bookings.services.creation.datetime", FutureDateTime):
            replay, created = create_booking(self.parent_data, "late-network-retry")
        self.assertFalse(created)
        self.assertEqual(replay.pk, appointment.pk)
        self.assertEqual(EmailOutbox.objects.filter(appointment=appointment).count(), 2)

    def test_idempotency_key_reuse_with_different_payload_is_rejected(self):
        create_booking(self.parent_data, "idempotent-mismatch")
        changed = {**self.parent_data, "city": "Mysuru"}
        with self.assertRaises(IdempotencyConflict):
            create_booking(changed, "idempotent-mismatch")

    def test_meeting_links_are_unique(self):
        first, _ = create_booking(self.parent_data, "unique-link-001")
        second_data = {**self.parent_data, "selected_time": time(18)}
        second, _ = create_booking(second_data, "unique-link-002")
        self.assertNotEqual(first.meeting_link, second.meeting_link)

    def test_api_rejects_invalid_email_and_creates_booking(self):
        client = APIClient()
        invalid = {**self.parent_data, "selected_date": self.booking_date.isoformat(), "selected_time": "17:00", "email": "bad"}
        response = api_post(client, "/api/bookings/", invalid, format="json", HTTP_IDEMPOTENCY_KEY="api-invalid")
        self.assertEqual(response.status_code, 400)

        valid = {**invalid, "email": "api-parent@example.com"}
        response = api_post(client, "/api/bookings/", valid, format="json", HTTP_IDEMPOTENCY_KEY="api-valid")
        self.assertEqual(response.status_code, 201)
        self.assertIn("mentor", response.data)
        self.assertNotIn("mentor_id", response.data)


    def test_mentor_dashboard_api_lists_mentor_and_minimal_booking_data(self):
        appointment, _ = create_booking(self.parent_data, "mentor-view-001")
        client = APIClient()
        mentors = api_get(client, "/api/mentors/")
        self.assertEqual(mentors.status_code, 200)
        self.assertEqual(mentors.data[0]["name"], "Rahul Mentor")
        self.assertNotIn("email", mentors.data[0])
        response = api_get(client, f"/api/mentors/{self.mentor.pk}/bookings/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["mentor"]["timezone"], "Asia/Kolkata")
        booking = response.data["bookings"][0]
        self.assertEqual(booking["parent"]["name"], "Casey Parent")
        self.assertEqual(booking["mentor"]["local_time"], "5:00 PM IST")
        self.assertEqual(booking["meeting_link"], appointment.meeting_link)
        self.assertNotIn("email", booking["parent"])

    def test_admin_operational_apis_remain_staff_protected(self):
        client = APIClient()
        self.assertIn(api_get(client, "/api/admin/bookings/").status_code, (401, 403))
        self.assertIn(api_get(client, "/api/admin/email-outbox/").status_code, (401, 403))


    def test_one_existing_class_keeps_mentor_eligible(self):
        self.add_appointment(self.mentor, datetime.combine(self.booking_date, time(9), tzinfo=timezone.utc), "daily-one")
        appointment, created = create_booking(self.parent_data, "daily-two")
        self.assertTrue(created)
        self.assertEqual(appointment.mentor_id, self.mentor.pk)

    def test_booking_api_replay_returns_same_booking_after_network_retry(self):
        client = APIClient()
        payload = {
            **self.parent_data,
            "selected_date": self.booking_date.isoformat(),
            "selected_time": "17:00",
        }
        first = api_post(client, "/api/bookings/", payload, format="json", HTTP_IDEMPOTENCY_KEY="retry-network")
        retry = api_post(client, "/api/bookings/", payload, format="json", HTTP_IDEMPOTENCY_KEY="retry-network")
        self.assertEqual(first.status_code, 201)
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(first.data["id"], retry.data["id"])
        self.assertEqual(Appointment.objects.filter(idempotency_key="retry-network").count(), 1)
        self.assertEqual(EmailOutbox.objects.filter(appointment_id=first.data["id"]).count(), 2)

    def test_parent_cannot_submit_a_mentor_identifier(self):
        client = APIClient()
        payload = {
            **self.parent_data,
            "selected_date": self.booking_date.isoformat(),
            "selected_time": "17:00",
            "mentor_id": self.mentor.pk,
        }
        response = api_post(client, "/api/bookings/", payload, format="json", HTTP_IDEMPOTENCY_KEY="no-client-mentor")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(Appointment.objects.count(), 0)

    def test_nithin_new_york_to_mangalore_end_to_end_booking(self):
        booking_date = next_future_edt_weekday()
        expected_utc = datetime.combine(booking_date, time(12), tzinfo=timezone.utc)
        payload = {
            "name": "Nithin",
            "email": "nnitin90430@gmail.com",
            "continent": "North America",
            "country": "United States",
            "state_region": "New York",
            "city": "New York City",
            "timezone": "America/New_York",
            "selected_date": booking_date.isoformat(),
            "selected_time": "08:00",
        }
        client = APIClient()
        availability = api_get(client, "/api/availability/", {"date": booking_date.isoformat(), "timezone": payload["timezone"]})
        self.assertEqual(availability.status_code, 200)
        slot = next(item for item in availability.data["slots"] if item["parent_local_display"] == "8:00 AM EDT")
        self.assertEqual(slot["start_time_utc"], expected_utc.isoformat())
        self.assertEqual(slot["mentor_local_time"], "5:30 PM IST")

        response = api_post(client, "/api/bookings/", payload, format="json", HTTP_IDEMPOTENCY_KEY="nithin-e2e")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["start_time_utc"], expected_utc.isoformat())
        self.assertEqual(response.data["parent"]["email"], payload["email"])
        self.assertEqual(response.data["confirmation_email_status"], EmailOutbox.Status.SENT)
        self.assertEqual(response.data["parent"]["local_time"], "8:00 AM EDT")
        self.assertEqual(response.data["mentor"]["name"], "Rahul Mentor")
        self.assertEqual(response.data["mentor"]["local_time"], "5:30 PM IST")
        self.assertEqual(response.data["parent"]["location"]["city"], "New York City")
        appointment = Appointment.objects.get(pk=response.data["id"])
        self.assertTrue(appointment.meeting_link.startswith(settings.FRONTEND_BASE_URL + "/class/"))
        meeting_id = appointment.meeting_link.rsplit("/", 1)[-1]
        demo_class = api_get(client, f"/api/demo-classes/{meeting_id}/")
        self.assertEqual(demo_class.status_code, 200)
        self.assertEqual(demo_class.data["mentor"]["name"], "Rahul Mentor")
        self.assertEqual(demo_class.data["mentor"]["local_time"], "5:30 PM IST")
        self.assertEqual(demo_class.data["parent_time"]["local_time"], "8:00 AM EDT")
        self.assertNotIn("email", demo_class.data)
        self.assertEqual(api_get(client, "/api/demo-classes/not-a-meeting/").status_code, 404)
        self.assertEqual(appointment.start_time_utc, expected_utc)
        self.assertEqual(appointment.mentor.email, self.mentor.email)

        outbox = list(EmailOutbox.objects.filter(appointment=appointment))
        by_type = {item.email_type: item for item in outbox}
        parent_mail = by_type[EmailOutbox.EmailType.BOOKING_CONFIRMATION]
        mentor_mail = by_type[EmailOutbox.EmailType.MENTOR_NOTIFICATION]
        self.assertEqual(len(outbox), 2)
        self.assertEqual(parent_mail.recipient, "nnitin90430@gmail.com")
        self.assertEqual(mentor_mail.recipient, self.mentor.email)
        self.assertEqual(parent_mail.status, EmailOutbox.Status.SENT)
        self.assertEqual(mentor_mail.status, EmailOutbox.Status.SENT)
        self.assertEqual(parent_mail.appointment_id, appointment.pk)
        self.assertEqual(mentor_mail.appointment_id, appointment.pk)
        self.assertIn(appointment.meeting_link, parent_mail.body)
        self.assertIn(appointment.meeting_link, mentor_mail.body)
        parent_local_date = appointment.start_time_utc.astimezone(ZoneInfo("America/New_York")).strftime("%A, %B %d, %Y")
        mentor_local_date = appointment.start_time_utc.astimezone(ZoneInfo("Asia/Kolkata")).strftime("%A, %B %d, %Y")
        self.assertIn(parent_local_date, parent_mail.body)
        self.assertIn(mentor_local_date, parent_mail.body)
        self.assertIn(parent_local_date, mentor_mail.body)
        self.assertIn(mentor_local_date, mentor_mail.body)
        self.assertIn("8:00 AM EDT", parent_mail.body)
        self.assertIn("North America → United States → New York → New York City", parent_mail.body)
        self.assertIn("Asia → India → Karnataka → Mangalore", parent_mail.body)
        self.assertIn("5:30 PM IST", parent_mail.body)
        self.assertIn("5:30 PM IST", mentor_mail.body)
        self.assertIn("8:00 AM EDT", mentor_mail.body)
        self.assertIn("Nithin", mentor_mail.body)
        self.assertIn("nnitin90430@gmail.com", mentor_mail.body)
        self.assertIn("Asia → India → Karnataka → Mangalore", mentor_mail.body)
        self.assertIn("North America → United States → New York → New York City", mentor_mail.body)
        self.assertIn(parent_local_date, mentor_mail.body)
        self.assertIn(mentor_local_date, mentor_mail.body)
        self.assertEqual(response.data["mentor_email_status"], EmailOutbox.Status.SENT)
        sent_parent_email = next(
            message for message in mail.outbox
            if message.to == ["nnitin90430@gmail.com"]
            and message.subject == parent_mail.subject
        )
        sent_mentor_email = next(
            message for message in mail.outbox
            if message.to == [self.mentor.email]
            and message.subject == mentor_mail.subject
        )
        self.assertEqual(sent_parent_email.subject, "Your CodeYoung Trial Class is Confirmed!")
        self.assertIn("Hi Nithin,", sent_parent_email.body)
        self.assertIn("Your trial class has been successfully booked.", sent_parent_email.body)
        self.assertIn("Join your trial class:", sent_parent_email.body)
        self.assertIn(appointment.meeting_link, sent_parent_email.body)
        self.assertIn(appointment.meeting_link, sent_mentor_email.body)
        self.assertIn(parent_local_date, sent_parent_email.body)
        self.assertIn(mentor_local_date, sent_parent_email.body)

        wrong_parent = api_get(client, f"/api/bookings/{appointment.pk}/", {"email": "other@example.com"})
        self.assertEqual(wrong_parent.status_code, 404)
        mentor_view = api_get(client, f"/api/mentors/{self.mentor.pk}/bookings/")
        self.assertEqual(mentor_view.status_code, 200)
        self.assertEqual(mentor_view.data["bookings"][0]["parent"]["local_time"], "8:00 AM EDT")
        self.assertNotIn("email", mentor_view.data["bookings"][0]["parent"])
        self.assertEqual(mentor_view.data["bookings"][0]["meeting_link"], appointment.meeting_link)

        from django.contrib.auth import get_user_model
        staff = get_user_model().objects.create_user(username="grader", password="grader-pass", is_staff=True)
        client.force_authenticate(user=staff)
        admin_view = api_get(client, "/api/admin/bookings/")
        outbox_view = api_get(client, "/api/admin/email-outbox/")
        capacity_view = api_get(client, "/api/admin/mentor-capacity/")
        self.assertEqual(admin_view.status_code, 200)
        self.assertEqual(capacity_view.status_code, 200)
        capacity_row = next(row for row in capacity_view.data if row["id"] == self.mentor.pk)
        self.assertEqual(capacity_row["timezone"], "Asia/Kolkata")
        self.assertEqual(capacity_row["classes_today"], 0)
        self.assertEqual(capacity_row["daily_capacity"], 2)
        self.assertEqual(admin_view.data[0]["id"], appointment.pk)
        self.assertEqual(outbox_view.status_code, 200)
        self.assertEqual(len(outbox_view.data), 2)
        self.assertTrue(all(message["status"] == EmailOutbox.Status.SENT for message in outbox_view.data))
        self.assertEqual({message["recipient"] for message in outbox_view.data}, {"nnitin90430@gmail.com", self.mentor.email})
        self.assertTrue(all(appointment.meeting_link in message["body"] for message in outbox_view.data))


@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class SeededMentorCapacityTests(TransactionTestCase):
    def test_ten_seeded_mentors_allow_twenty_daily_bookings_but_reject_twenty_first(self):
        from django.core.management import call_command

        call_command("seed_mentors", verbosity=0)
        mentors = list(Mentor.objects.filter(active=True).order_by("pk"))
        self.assertEqual(len(mentors), 10)
        self.assertGreaterEqual(len({mentor.timezone for mentor in mentors}), 7)
        for mentor in mentors:
            mentor.working_hours = {str(day): {"start": "00:00", "end": "23:59"} for day in range(1, 8)}
            mentor.save(update_fields=["working_hours"])

        booking_date = date.today() + timedelta(days=1)
        while booking_date.weekday() >= 5:
            booking_date += timedelta(days=1)

        client = APIClient()
        assigned_by_time = []
        booking_number = 0
        for requested_time in (time(16, 30), time(17, 0)):
            assigned_for_slot = set()
            for _ in range(10):
                booking_number += 1
                payload = {
                    "name": f"Capacity Parent {booking_number}",
                    "email": f"capacity-parent-{booking_number}@example.com",
                    "continent": "Asia",
                    "country": "India",
                    "state_region": "Karnataka",
                    "city": "Bengaluru",
                    "timezone": "Asia/Kolkata",
                    "selected_date": booking_date.isoformat(),
                    "selected_time": requested_time.isoformat(timespec="minutes"),
                }
                response = api_post(client,
                    "/api/bookings/",
                    payload,
                    format="json",
                    HTTP_IDEMPOTENCY_KEY=f"ten-mentor-capacity-{booking_number}",
                )
                self.assertEqual(response.status_code, 201, response.content)
                assigned_for_slot.add(
                    Appointment.objects.values_list("mentor_id", flat=True).get(pk=response.data["id"])
                )
            self.assertEqual(len(assigned_for_slot), 10)
            assigned_by_time.append(assigned_for_slot)

        all_assigned = assigned_by_time[0] | assigned_by_time[1]
        self.assertEqual(all_assigned, {mentor.pk for mentor in mentors})
        self.assertEqual(Appointment.objects.count(), 20)
        for mentor in mentors:
            appointments = list(Appointment.objects.filter(mentor=mentor).select_related("mentor"))
            self.assertEqual(len(appointments), 2)
            by_local_day = {}
            for appointment in appointments:
                local_day = appointment.start_time_utc.astimezone(ZoneInfo(mentor.timezone)).date()
                by_local_day[local_day] = by_local_day.get(local_day, 0) + 1
            self.assertTrue(all(count <= 2 for count in by_local_day.values()))
            mentor_days = {
                appointment.start_time_utc.astimezone(ZoneInfo(mentor.timezone)).date()
                for appointment in appointments
            }
            self.assertEqual(mentor_days, {appointments[0].start_time_utc.astimezone(ZoneInfo(mentor.timezone)).date()})

        twenty_first = api_post(
            client,
            "/api/bookings/",
            {
                "name": "Capacity Parent 21",
                "email": "capacity-parent-21@example.com",
                "continent": "Asia",
                "country": "India",
                "state_region": "Karnataka",
                "city": "Bengaluru",
                "timezone": "Asia/Kolkata",
                "selected_date": booking_date.isoformat(),
                "selected_time": "17:30",
            },
            format="json",
            HTTP_IDEMPOTENCY_KEY="ten-mentor-capacity-21",
        )
        self.assertEqual(twenty_first.status_code, 409, twenty_first.content)
        self.assertEqual(Appointment.objects.count(), 20)
        self.assertEqual(EmailOutbox.objects.count(), 40)


@skipUnless(connection.features.has_select_for_update, "Concurrency locking requires PostgreSQL row locks.")
@override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
class ConcurrentBookingTests(TransactionTestCase):
    reset_sequences = True

    def test_only_one_parent_gets_last_mentor_for_overlapping_slot(self):
        booking_date = date.today() + timedelta(days=3)
        mentor = Mentor.objects.create(
            name="Only Mentor", email="only.mentor@gmail.com",
            continent="Asia", country="India", state_region="Karnataka", city="Mangalore",
            timezone="Asia/Kolkata",
            working_hours={str(day): {"start": "09:00", "end": "22:00"} for day in range(1, 8)},
        )
        barrier = Barrier(2)

        def attempt(number):
            close_old_connections()
            data = {
                "name": f"Parent {number}", "email": f"parent-{number}@example.com",
                "continent": "Asia", "country": "India", "state_region": "Karnataka",
                "city": "Mangalore", "timezone": "Asia/Kolkata",
                "selected_date": booking_date, "selected_time": time(17),
            }
            try:
                barrier.wait(timeout=10)
                appointment, created = create_booking(data, f"concurrent-{number}")
                return ("created", appointment.pk) if created else ("replayed", appointment.pk)
            except NoAvailableMentor:
                return ("unavailable", None)
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt, (1, 2)))

        self.assertEqual(sum(result[0] == "created" for result in results), 1)
        self.assertEqual(sum(result[0] == "unavailable" for result in results), 1)
        self.assertEqual(Appointment.objects.filter(mentor=mentor).count(), 1)
        self.assertEqual(EmailOutbox.objects.count(), 2)
