from django.core.validators import EmailValidator
from django.db import models
from django.db.models.functions import Lower

from common.timezones import validate_iana_timezone


class Parent(models.Model):
    name = models.CharField(max_length=160)
    email = models.EmailField(max_length=254, validators=[EmailValidator()])
    continent = models.CharField(max_length=80)
    country = models.CharField(max_length=100)
    state_region = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    timezone = models.CharField(max_length=64, validators=[validate_iana_timezone])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["created_at"], name="parent_created_idx")]
        constraints = [models.UniqueConstraint(Lower("email"), name="parent_email_ci_uniq")]

    def __str__(self):
        return f"{self.name} <{self.email}>"


class Appointment(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    parent = models.ForeignKey(Parent, on_delete=models.PROTECT, related_name="appointments")
    mentor = models.ForeignKey("mentors.Mentor", on_delete=models.PROTECT, related_name="appointments")
    start_time_utc = models.DateTimeField()
    end_time_utc = models.DateTimeField()
    meeting_link = models.URLField(max_length=500, unique=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SCHEDULED)
    idempotency_key = models.CharField(max_length=128, unique=True)
    request_fingerprint = models.CharField(max_length=64, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["start_time_utc"]
        indexes = [
            models.Index(fields=["mentor", "start_time_utc"], name="appt_mentor_start_idx"),
            models.Index(fields=["parent", "start_time_utc"], name="appt_parent_start_idx"),
            models.Index(fields=["status", "start_time_utc"], name="appt_status_start_idx"),
        ]
        constraints = [models.CheckConstraint(
            condition=models.Q(end_time_utc__gt=models.F("start_time_utc")),
            name="appointment_end_after_start",
        )]

    def __str__(self):
        return f"Appointment {self.pk}: {self.start_time_utc}"
