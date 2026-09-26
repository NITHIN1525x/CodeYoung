from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from common.timezones import validate_iana_timezone


class SupportCallbackRequestSerializer(serializers.Serializer):
    parent_name = serializers.CharField(max_length=160, trim_whitespace=True)
    parent_email = serializers.EmailField(max_length=254, trim_whitespace=True)
    preferred_date = serializers.DateField()
    preferred_time = serializers.TimeField()
    timezone = serializers.CharField(max_length=64, trim_whitespace=True)
    topic = serializers.CharField(max_length=200, trim_whitespace=True)

    def validate_timezone(self, value):
        try:
            validate_iana_timezone(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError("Enter a valid IANA timezone.") from exc
        return value

    def validate_preferred_time(self, value):
        if value.tzinfo is not None:
            raise serializers.ValidationError("Enter a local time without a UTC offset.")
        if value.second or value.microsecond:
            raise serializers.ValidationError("Choose a time on a whole minute.")
        return value
