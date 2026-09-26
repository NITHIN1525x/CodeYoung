from datetime import date, datetime, time, timezone
from types import SimpleNamespace

from django.test import SimpleTestCase

from bookings.models import Appointment
from mentors.services.availability import compute_available_slots


class AvailabilityTests(SimpleTestCase):
    def setUp(self):
        self.friday = date(2026, 4, 10)
        self.now = datetime(2026, 4, 9, 0, tzinfo=timezone.utc)
        self.mentor = SimpleNamespace(
            pk=1,
            active=True,
            timezone="Asia/Kolkata",
            working_hours={str(day): {"start": "17:00", "end": "18:00"} for day in (1, 2, 5)},
        )

    @staticmethod
    def appointment(mentor_id, start, end=None, status=Appointment.Status.SCHEDULED):
        from datetime import timedelta

        return SimpleNamespace(
            mentor_id=mentor_id,
            start_time_utc=start,
            end_time_utc=end or start + timedelta(minutes=30),
            status=status,
        )

    def slots(self, mentors=None, appointments=(), requested_date=None, now=None):
        return compute_available_slots(
            requested_date or self.friday,
            "America/New_York",
            mentors if mentors is not None else [self.mentor],
            appointments,
            now=now or self.now,
        )

    def test_generates_parent_and_mentor_local_times_for_same_slot(self):
        slots = self.slots()
        target = next(slot for slot in slots if slot["mentor_local_time"] == "5:30 PM IST")
        self.assertEqual(target["parent_local_display"], "8:00 AM EDT")
        self.assertEqual(target["available_mentor_count"], 1)
        self.assertTrue(target["available"])
        self.assertEqual(target["start_time_utc"], "2026-04-10T12:00:00+00:00")

    def test_slots_in_past_are_not_bookable(self):
        slots = self.slots(now=datetime(2026, 4, 10, 13, tzinfo=timezone.utc))
        self.assertEqual(slots, [])

    def test_conflicting_appointment_removes_mentor_from_slot(self):
        taken = self.appointment(1, datetime(2026, 4, 10, 12, tzinfo=timezone.utc))
        slots = self.slots(appointments=[taken])
        target = next(slot for slot in slots if slot["start_time_utc"] == "2026-04-10T12:00:00+00:00")
        self.assertFalse(target["available"])
        self.assertEqual(target["available_mentor_count"], 0)

    def test_two_classes_on_mentor_local_monday_consume_capacity(self):
        monday = date(2026, 4, 13)
        earlier = self.appointment(1, datetime(2026, 4, 13, 12, tzinfo=timezone.utc), status=Appointment.Status.COMPLETED)
        near_midnight = self.appointment(1, datetime(2026, 4, 13, 18, 29, tzinfo=timezone.utc))
        slots = self.slots(appointments=[earlier, near_midnight], requested_date=monday)
        self.assertTrue(slots)
        self.assertTrue(all(slot["available_mentor_count"] == 0 for slot in slots))

    def test_local_midnight_resets_daily_limit_even_when_utc_date_is_same(self):
        # 23:59 Monday IST and 00:00 Tuesday IST are both on Monday UTC.
        monday_late = self.appointment(1, datetime(2026, 4, 13, 18, 29, tzinfo=timezone.utc))
        tuesday_midnight = self.appointment(1, datetime(2026, 4, 13, 18, 30, tzinfo=timezone.utc))
        slots = self.slots(
            appointments=[monday_late, tuesday_midnight],
            requested_date=date(2026, 4, 14),
        )
        self.assertTrue(slots)
        self.assertTrue(all(slot["available_mentor_count"] == 1 for slot in slots))

    def test_mentor_local_daily_limit_uses_mentor_date_not_parent_date(self):
        mentor = SimpleNamespace(
            pk=8, active=True, timezone="Asia/Kolkata",
            working_hours={"2": {"start": "00:00", "end": "02:00"}},
        )
        # Both existing classes are Tuesday for the India mentor but Monday for the
        # New York parent. The Monday parent date must still consume Tuesday capacity.
        existing_one = self.appointment(8, datetime(2026, 4, 13, 19, 0, tzinfo=timezone.utc))
        existing_two = self.appointment(8, datetime(2026, 4, 13, 19, 30, tzinfo=timezone.utc))
        slots = compute_available_slots(
            date(2026, 4, 13), "America/New_York", [mentor], [existing_one, existing_two],
            now=datetime(2026, 4, 13, 18, 0, tzinfo=timezone.utc),
        )
        next_day_in_mentor_zone = [
            slot for slot in slots
            if slot["start_time_utc"] == "2026-04-13T18:30:00+00:00"
        ]
        self.assertEqual(len(next_day_in_mentor_zone), 1)
        self.assertEqual(next_day_in_mentor_zone[0]["available_mentor_count"], 0)
        self.assertEqual(next_day_in_mentor_zone[0]["parent_local_display"], "2:30 PM EDT")
        self.assertEqual(next_day_in_mentor_zone[0]["mentor_local_time"], "12:00 AM IST")

    def test_available_slots_show_local_times_for_each_eligible_timezone(self):
        london = SimpleNamespace(
            pk=11, active=True, timezone="Europe/London",
            working_hours={"5": {"start": "12:00", "end": "14:00"}},
        )
        india = SimpleNamespace(
            pk=12, active=True, timezone="Asia/Kolkata",
            working_hours={"5": {"start": "17:00", "end": "19:00"}},
        )
        slots = compute_available_slots(
            self.friday, "America/New_York", [london, india],
            now=datetime(2026, 4, 10, 11, 0, tzinfo=timezone.utc),
        )
        target = next(slot for slot in slots if slot["start_time_utc"] == "2026-04-10T12:00:00+00:00")
        self.assertEqual(target["available_mentor_count"], 2)
        self.assertEqual(target["mentor_local_times"], ["1:00 PM BST (Europe/London)", "5:30 PM IST (Asia/Kolkata)"])

    def test_fall_back_hour_generates_both_distinct_utc_slots(self):
        mentor = SimpleNamespace(
            pk=3, active=True, timezone="America/New_York",
            working_hours={"7": {"start": "01:00", "end": "02:00"}},
        )
        slots = compute_available_slots(
            date(2026, 11, 1), "America/New_York", [mentor], now=datetime(2026, 11, 1, 4, tzinfo=timezone.utc),
        )
        displays = {slot["parent_local_display"] for slot in slots}
        self.assertIn("1:30 AM EDT", displays)
        self.assertIn("1:30 AM EST", displays)
        self.assertEqual(len({slot["start_time_utc"] for slot in slots}), len(slots))

    def test_second_mentor_remains_available_when_first_has_a_conflict(self):
        second = SimpleNamespace(
            pk=2,
            active=True,
            timezone="Asia/Kolkata",
            working_hours={"5": {"start": "17:00", "end": "18:00"}},
        )
        conflict = self.appointment(1, datetime(2026, 4, 10, 12, tzinfo=timezone.utc))
        slots = self.slots(mentors=[self.mentor, second], appointments=[conflict])
        target = next(slot for slot in slots if slot["start_time_utc"] == "2026-04-10T12:00:00+00:00")
        self.assertTrue(target["available"])
        self.assertEqual(target["available_mentor_count"], 1)
