from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from apps.users.models import CompanyProfile

User = get_user_model()

class CompanyProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyProfile
        fields = [
            'id', 'legal_business_name', 'vat_tax_number', 
            'payment_terms', 'discount_tier', 'credit_limit', 'credit_used'
        ]

class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'password', 'is_b2b', 
            'company_name', 'vat_number', 'shipping_address', 'billing_address'
        ]

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            is_b2b=validated_data.get('is_b2b', False),
            company_name=validated_data.get('company_name', ''),
            vat_number=validated_data.get('vat_number', ''),
            shipping_address=validated_data.get('shipping_address', ''),
            billing_address=validated_data.get('billing_address', '')
        )
        return user


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, data):
        username = data.get('username')
        password = data.get('password')

        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError("Invalid username or password.")
            if not user.is_active:
                raise serializers.ValidationError("User account is disabled.")
        else:
            raise serializers.ValidationError("Must include both username and password.")

        data['user'] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    company_profile = CompanyProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'is_b2b', 
            'company_name', 'vat_number', 'shipping_address', 'billing_address',
            'company_profile'
        ]
        read_only_fields = ['id', 'username', 'is_b2b', 'company_profile']

