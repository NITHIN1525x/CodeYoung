from datetime import date, datetime, timedelta, timezone

from django.test import SimpleTestCase

from common.timezones import (
    format_local_datetime,
    local_datetime_candidates,
    local_datetime_to_utc,
    local_day_bounds_utc,
    utc_to_local,
)


class TimezoneConversionTests(SimpleTestCase):
    def test_parent_and_mentor_views_are_the_same_utc_instant(self):
        instant = datetime(2026, 4, 10, 12, tzinfo=timezone.utc)
        parent_time = utc_to_local(instant, "America/New_York")
        mentor_time = utc_to_local(instant, "Asia/Kolkata")
        self.assertEqual(parent_time.strftime("%-I:%M %p %Z"), "8:00 AM EDT")
        self.assertEqual(mentor_time.strftime("%-I:%M %p %Z"), "5:30 PM IST")
        self.assertEqual(parent_time.astimezone(timezone.utc), mentor_time.astimezone(timezone.utc))

    def test_same_utc_instant_displays_for_new_york_london_and_kolkata(self):
        instant = datetime(2026, 4, 10, 12, tzinfo=timezone.utc)
        self.assertEqual(format_local_datetime(instant, "America/New_York"), "8:00 AM EDT")
        self.assertEqual(format_local_datetime(instant, "Europe/London"), "1:00 PM BST")
        self.assertEqual(format_local_datetime(instant, "Asia/Kolkata"), "5:30 PM IST")
        self.assertEqual(local_datetime_to_utc(datetime(2026, 4, 10, 8), "America/New_York"), instant)

    def test_spring_forward_gap_is_rejected(self):
        nonexistent = datetime(2026, 3, 8, 2, 30)
        self.assertEqual(local_datetime_candidates(nonexistent, "America/New_York"), [])
        with self.assertRaises(ValueError):
            local_datetime_to_utc(nonexistent, "America/New_York")

    def test_fall_back_fold_has_two_explicit_instants(self):
        repeated = datetime(2026, 11, 1, 1, 30)
        candidates = local_datetime_candidates(repeated, "America/New_York")
        self.assertEqual(len(candidates), 2)
        self.assertEqual(candidates[1] - candidates[0], timedelta(hours=1))
        with self.assertRaises(ValueError):
            local_datetime_to_utc(repeated, "America/New_York")
        first = local_datetime_to_utc(repeated, "America/New_York", fold=0)
        second = local_datetime_to_utc(repeated, "America/New_York", fold=1)
        self.assertEqual(second - first, timedelta(hours=1))
        self.assertEqual(format_local_datetime(first, "America/New_York"), "1:30 AM EDT")
        self.assertEqual(format_local_datetime(second, "America/New_York"), "1:30 AM EST")

    def test_local_day_bounds_follow_dst_not_fixed_utc_duration(self):
        spring_start, spring_end = local_day_bounds_utc(date(2026, 3, 8), "America/New_York")
        fall_start, fall_end = local_day_bounds_utc(date(2026, 11, 1), "America/New_York")
        self.assertEqual(spring_end - spring_start, timedelta(hours=23))
        self.assertEqual(fall_end - fall_start, timedelta(hours=25))
