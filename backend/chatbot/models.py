from django.core.validators import EmailValidator
from django.db import models

from common.timezones import validate_iana_timezone


class SupportCallbackRequest(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Scheduled"

    reference = models.CharField(max_length=32, unique=True)
    parent_name = models.CharField(max_length=160)
    parent_email = models.EmailField(max_length=254, validators=[EmailValidator()])
    preferred_start_utc = models.DateTimeField()
    timezone = models.CharField(max_length=64, validators=[validate_iana_timezone])
    topic = models.CharField(max_length=200)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.SCHEDULED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["preferred_start_utc"], name="support_call_start_idx")]

    def __str__(self):
        return f"{self.reference} for {self.parent_name}"
