from rest_framework import serializers

from common.timezones import validate_iana_timezone


class AvailabilityQuerySerializer(serializers.Serializer):
    date = serializers.DateField(input_formats=["%Y-%m-%d"])
    timezone = serializers.CharField(max_length=64, validators=[validate_iana_timezone])


class BookingRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=160, trim_whitespace=True)
    email = serializers.EmailField(max_length=254, trim_whitespace=True)
    continent = serializers.CharField(max_length=80, trim_whitespace=True)
    country = serializers.CharField(max_length=100, trim_whitespace=True)
    state_region = serializers.CharField(max_length=100, trim_whitespace=True)
    city = serializers.CharField(max_length=100, trim_whitespace=True)
    timezone = serializers.CharField(max_length=64, validators=[validate_iana_timezone])
    selected_date = serializers.DateField(input_formats=["%Y-%m-%d"])
    selected_time = serializers.TimeField(input_formats=["%H:%M"])
    fold = serializers.ChoiceField(choices=[0, 1], required=False)

    def validate(self, attrs):
        if "mentor" in self.initial_data or "mentor_id" in self.initial_data:
            raise serializers.ValidationError("Mentor assignment is automatic; do not provide a mentor.")
        for field in ("name", "continent", "country", "state_region", "city", "timezone"):
            if not attrs[field].strip():
                raise serializers.ValidationError({field: "This field may not be blank."})
        return attrs
