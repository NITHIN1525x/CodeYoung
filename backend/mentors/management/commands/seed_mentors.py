import os

from django.core.management.base import BaseCommand, CommandError

from mentors.models import Mentor


# Keep these canonical zones tied to the listed city. Working hours are interpreted
# in each mentor's own local timezone by mentors.services.availability.
MENTORS = [
    ("Aarav Nair", "aarav.nair@codeyoung.example", "Asia", "India", "Karnataka", "Mangalore", "Asia/Kolkata"),
    ("Ananya Rao", "ananya.rao@codeyoung.example", "Asia", "India", "Maharashtra", "Mumbai", "Asia/Kolkata"),
    ("Ishaan Menon", "ishaan.menon@codeyoung.example", "Europe", "United Kingdom", "England", "London", "Europe/London"),
    ("Meera Iyer", "meera.iyer@codeyoung.example", "North America", "United States", "New York", "New York City", "America/New_York"),
    ("Rohan Kulkarni", "rohan.kulkarni@codeyoung.example", "North America", "United States", "Illinois", "Chicago", "America/Chicago"),
    ("Diya Sharma", "diya.sharma@codeyoung.example", "North America", "United States", "Colorado", "Denver", "America/Denver"),
    ("Kabir Das", "kabir.das@codeyoung.example", "North America", "United States", "California", "Los Angeles", "America/Los_Angeles"),
    ("Saanvi Patel", "saanvi.patel@codeyoung.example", "Oceania", "Australia", "New South Wales", "Sydney", "Australia/Sydney"),
    ("Arjun Reddy", "arjun.reddy@codeyoung.example", "Asia", "Singapore", "Singapore", "Singapore", "Asia/Singapore"),
    ("Kavya Joshi", "kavya.joshi@codeyoung.example", "Asia", "Japan", "Tokyo", "Tokyo", "Asia/Tokyo"),
]
DEFAULT_HOURS = {str(day): {"start": "09:00", "end": "18:00"} for day in range(1, 6)}


class Command(BaseCommand):
    help = "Create or update ten CodeYoung mentors across several timezone regions. Safe to rerun."

    def handle(self, *args, **options):
        created_count = updated_count = 0
        demo_mentor_email = os.getenv("DEMO_MENTOR_EMAIL", "").strip()
        demo_mentor_name = os.getenv("DEMO_MENTOR_NAME", MENTORS[0][0]).strip()
        if demo_mentor_email:
            if "@" not in demo_mentor_email or demo_mentor_email.casefold().endswith(".example"):
                raise CommandError("DEMO_MENTOR_EMAIL must be a deliverable email address, not a reserved .example address.")
            if demo_mentor_name not in {mentor[0] for mentor in MENTORS}:
                raise CommandError("DEMO_MENTOR_NAME must match one of the seeded mentor names.")

        for name, registered_email, continent, country, state_region, city, timezone in MENTORS:
            email = demo_mentor_email if name == demo_mentor_name and demo_mentor_email else registered_email
            mentor = Mentor.objects.filter(name=name).first()
            created = mentor is None
            if mentor is None:
                mentor = Mentor(name=name)
            mentor.email = email
            mentor.continent = continent
            mentor.country = country
            mentor.state_region = state_region
            mentor.city = city
            mentor.timezone = timezone
            mentor.working_hours = DEFAULT_HOURS
            mentor.active = True
            mentor.save()
            created_count += int(created)
            updated_count += int(not created)

        self.stdout.write(self.style.SUCCESS(
            f"Mentor seed complete: {created_count} created, {updated_count} updated."
        ))
