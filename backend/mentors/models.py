from django.core.validators import EmailValidator
from django.db import models
from django.db.models.functions import Lower

from common.timezones import validate_iana_timezone


class Mentor(models.Model):
    name = models.CharField(max_length=160)
    email = models.EmailField(max_length=254, unique=True, validators=[EmailValidator()])
    continent = models.CharField(max_length=80)
    country = models.CharField(max_length=100)
    state_region = models.CharField(max_length=100)
    city = models.CharField(max_length=100)
    timezone = models.CharField(max_length=64, validators=[validate_iana_timezone])
    # ISO weekdays (1=Monday..7=Sunday) map to mentor-local start/end time strings.
    working_hours = models.JSONField(default=dict)
    active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        indexes = [models.Index(fields=["active", "timezone"], name="mentor_active_tz_idx")]
        constraints = [models.UniqueConstraint(Lower("email"), name="mentor_email_ci_uniq")]

    def __str__(self):
        return f"{self.name} <{self.email}>"
