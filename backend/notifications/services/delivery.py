"""Deliver committed email outbox records through Django's configured backend."""
import logging

from django.conf import settings
from django.core.mail import EmailMessage

from notifications.models import EmailOutbox

logger = logging.getLogger(__name__)


def deliver_outbox_email(email_id: int) -> None:
    """Send one pending outbox message and persist the delivery result."""
    try:
        message = EmailOutbox.objects.get(pk=email_id)
    except EmailOutbox.DoesNotExist:
        logger.error("Email outbox record %s disappeared before delivery", email_id)
        return

    if message.status != EmailOutbox.Status.PENDING:
        return

    recipient_domain = message.recipient.rsplit("@", 1)[-1].casefold()
    if recipient_domain == "example" or recipient_domain.endswith(".example"):
        logger.warning("Skipping email delivery to reserved .example domain for outbox record %s", email_id)
        EmailOutbox.objects.filter(pk=message.pk, status=EmailOutbox.Status.PENDING).update(
            status=EmailOutbox.Status.FAILED,
        )
        return

    try:
        email = EmailMessage(
            subject=message.subject,
            body=message.body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[message.recipient],
        )
        delivered = email.send(fail_silently=False)
        if delivered != 1:
            raise RuntimeError("Email backend did not accept the outbox message.")
    except Exception:
        logger.exception("Email outbox delivery failed for record %s", email_id)
        final_status = EmailOutbox.Status.FAILED
    else:
        final_status = EmailOutbox.Status.SENT

    EmailOutbox.objects.filter(pk=message.pk, status=EmailOutbox.Status.PENDING).update(
        status=final_status,
    )
