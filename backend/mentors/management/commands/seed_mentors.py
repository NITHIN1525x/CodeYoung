import os

from django.core.management.base import BaseCommand, CommandError

from mentors.models import Mentor


MENTORS = [
    ("Aarav Nair", "aarav.nair@codeyoung.example", "Karnataka", "Mangalore"),
    ("Ananya Rao", "ananya.rao@codeyoung.example", "Karnataka", "Bengaluru"),
    ("Ishaan Menon", "ishaan.menon@codeyoung.example", "Kerala", "Kochi"),
    ("Meera Iyer", "meera.iyer@codeyoung.example", "Tamil Nadu", "Chennai"),
    ("Rohan Kulkarni", "rohan.kulkarni@codeyoung.example", "Maharashtra", "Pune"),
    ("Diya Sharma", "diya.sharma@codeyoung.example", "Delhi", "New Delhi"),
    ("Kabir Das", "kabir.das@codeyoung.example", "West Bengal", "Kolkata"),
    ("Saanvi Patel", "saanvi.patel@codeyoung.example", "Gujarat", "Ahmedabad"),
    ("Arjun Reddy", "arjun.reddy@codeyoung.example", "Telangana", "Hyderabad"),
    ("Kavya Joshi", "kavya.joshi@codeyoung.example", "Goa", "Panaji"),
]
DEFAULT_HOURS = {str(day): {"start": "09:00", "end": "18:00"} for day in range(1, 6)}


class Command(BaseCommand):
    help = "Create or update the ten standard CodeYoung mentors. Safe to run repeatedly."

    def handle(self, *args, **options):
        created_count = updated_count = 0
        demo_mentor_email = os.getenv("DEMO_MENTOR_EMAIL", "").strip()
        demo_mentor_name = os.getenv("DEMO_MENTOR_NAME", MENTORS[0][0]).strip()
        if demo_mentor_email:
            if "@" not in demo_mentor_email or demo_mentor_email.casefold().endswith(".example"):
                raise CommandError("DEMO_MENTOR_EMAIL must be a deliverable email address, not a reserved .example address.")
            if demo_mentor_name not in {mentor[0] for mentor in MENTORS}:
                raise CommandError("DEMO_MENTOR_NAME must match one of the seeded mentor names.")
        for name, registered_email, state_region, city in MENTORS:
            email = demo_mentor_email if name == demo_mentor_name and demo_mentor_email else registered_email
            mentor = Mentor.objects.filter(name=name, city=city).first()
            created = mentor is None
            if mentor is None:
                mentor = Mentor(name=name, city=city)
            mentor.email = email
            mentor.continent = "Asia"
            mentor.country = "India"
            mentor.state_region = state_region
            mentor.timezone = "Asia/Kolkata"
            mentor.working_hours = DEFAULT_HOURS
            mentor.active = True
            mentor.save()
            created_count += int(created)
            updated_count += int(not created)
        self.stdout.write(self.style.SUCCESS(
            f"Mentor seed complete: {created_count} created, {updated_count} updated."
        ))
