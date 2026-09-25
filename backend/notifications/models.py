from django.db import models


class EmailOutbox(models.Model):
    class EmailType(models.TextChoices):
        BOOKING_CONFIRMATION = "booking_confirmation", "Booking confirmation"
        MENTOR_NOTIFICATION = "mentor_notification", "Mentor notification"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    appointment = models.ForeignKey("bookings.Appointment", on_delete=models.PROTECT, related_name="outbox_emails")
    recipient = models.EmailField(max_length=254)
    email_type = models.CharField(max_length=32, choices=EmailType.choices)
    subject = models.CharField(max_length=255)
    body = models.TextField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["status", "created_at"], name="outbox_status_created_idx")]
        constraints = [models.UniqueConstraint(
            fields=["appointment", "recipient", "email_type"],
            name="outbox_appointment_recipient_type_uniq",
        )]

    def __str__(self):
        return f"{self.email_type} to {self.recipient} ({self.status})"
