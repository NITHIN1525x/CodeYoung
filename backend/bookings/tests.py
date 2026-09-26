from datetime import datetime, timedelta, timezone

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from bookings.models import Appointment, Parent
from common.timezones import get_iana_timezone
from mentors.models import Mentor


class ModelValidationTests(TestCase):
    def test_timezone_validator_accepts_iana_and_rejects_invalid_name(self):
        parent = Parent(
            name="Taylor Example", email="taylor@example.com", continent="North America",
            country="United States", state_region="New York", city="New York City",
            timezone="America/New_York",
        )
        parent.full_clean()
        self.assertEqual(get_iana_timezone(parent.timezone).key, "America/New_York")
        parent.timezone = "Asia/India/Kolkata"
        with self.assertRaises(ValidationError):
            parent.full_clean()

    def test_email_validation_rejects_malformed_address(self):
        parent = Parent(
            name="Taylor Example", email="not-an-email", continent="North America",
            country="United States", state_region="New York", city="New York City",
            timezone="America/New_York",
        )
        with self.assertRaises(ValidationError):
            parent.full_clean()

    def test_appointment_requires_positive_duration_and_keeps_single_utc_instant(self):
        parent = Parent.objects.create(
            name="Taylor Example", email="taylor@example.com", continent="North America",
            country="United States", state_region="New York", city="New York City",
            timezone="America/New_York",
        )
        mentor = Mentor.objects.create(
            name="Aarav Nair", email="aarav@codeyoung.example", continent="Asia", country="India",
            state_region="Karnataka", city="Mangalore", timezone="Asia/Kolkata",
            working_hours={"1": {"start": "09:00", "end": "18:00"}},
        )
        start = datetime(2026, 4, 10, 14, 0, tzinfo=timezone.utc)
        appointment = Appointment.objects.create(
            parent=parent, mentor=mentor, start_time_utc=start,
            end_time_utc=start + timedelta(minutes=30), idempotency_key="model-test-key",
        )
        self.assertEqual(appointment.start_time_utc, start)
        self.assertFalse(hasattr(appointment, "parent_time"))
        self.assertFalse(hasattr(appointment, "mentor_time"))
        with self.assertRaises(IntegrityError), transaction.atomic():
            Appointment.objects.create(
                parent=parent, mentor=mentor, start_time_utc=start,
                end_time_utc=start, idempotency_key="invalid-duration-key",
            )


class MentorModelTests(TestCase):
    def test_seed_command_creates_ten_multi_timezone_mentors_idempotently(self):
        from django.core.management import call_command

        call_command("seed_mentors", verbosity=0)
        mentors = list(Mentor.objects.filter(active=True).order_by("name"))
        self.assertEqual(len(mentors), 10)
        self.assertGreaterEqual(len({mentor.timezone for mentor in mentors}), 7)
        expected = {
            ("India", "Karnataka", "Mangalore", "Asia/Kolkata"),
            ("India", "Maharashtra", "Mumbai", "Asia/Kolkata"),
            ("United Kingdom", "England", "London", "Europe/London"),
            ("United States", "New York", "New York City", "America/New_York"),
            ("United States", "Illinois", "Chicago", "America/Chicago"),
            ("United States", "Colorado", "Denver", "America/Denver"),
            ("United States", "California", "Los Angeles", "America/Los_Angeles"),
            ("Australia", "New South Wales", "Sydney", "Australia/Sydney"),
            ("Singapore", "Singapore", "Singapore", "Asia/Singapore"),
            ("Japan", "Tokyo", "Tokyo", "Asia/Tokyo"),
        }
        actual = {(m.country, m.state_region, m.city, m.timezone) for m in mentors}
        self.assertEqual(actual, expected)
        call_command("seed_mentors", verbosity=0)
        self.assertEqual(Mentor.objects.filter(active=True).count(), 10)
        self.assertEqual({m.timezone for m in Mentor.objects.filter(active=True)}, {row[3] for row in expected})
