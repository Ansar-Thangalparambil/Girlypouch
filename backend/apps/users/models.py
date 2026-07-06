from django.contrib.auth.models import AbstractUser
from django.db import models

class CompanyProfile(models.Model):
    legal_business_name = models.CharField(max_length=255, help_text="Legal name of the business entity.")
    vat_tax_number = models.CharField(max_length=100, help_text="Verified VAT / Tax Identification Number.")
    payment_terms = models.CharField(
        max_length=20,
        choices=[('net_30', 'Net-30'), ('net_60', 'Net-60')],
        default='net_30',
        help_text="Pre-negotiated payment terms."
    )
    discount_tier = models.CharField(
        max_length=20,
        choices=[('tier_1', 'Tier 1 (10% off)'), ('tier_2', 'Tier 2 (15% off)')],
        default='tier_1',
        help_text="Assigned contract discount tier."
    )
    credit_limit = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=50000.00,
        help_text="Pre-approved credit line limit."
    )
    credit_used = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        help_text="Current outstanding balance against the credit line."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.legal_business_name


class User(AbstractUser):
    is_b2b = models.BooleanField(
        default=False, 
        help_text="Designates if this account is a B2B wholesale corporate client."
    )
    company_name = models.CharField(
        max_length=200, 
        blank=True, 
        help_text="Corporate entity name for B2B billing."
    )
    vat_number = models.CharField(
        max_length=50, 
        blank=True, 
        help_text="Tax / VAT registration code for B2B client."
    )
    shipping_address = models.TextField(
        blank=True, 
        help_text="Default D2C or B2B shipping destination."
    )
    billing_address = models.TextField(
        blank=True, 
        help_text="Default billing address for credit cards or invoices."
    )
    company_profile = models.OneToOneField(
        CompanyProfile,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_profile',
        help_text="The corporate profile associated with this B2B user."
    )

    def __str__(self):
        return f"{self.username} ({'B2B' if self.is_b2b else 'D2C'})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if self.is_b2b and not self.company_profile:
            profile = CompanyProfile.objects.create(
                legal_business_name=self.company_name or self.username,
                vat_tax_number=self.vat_number or "N/A",
                payment_terms="net_30",
                discount_tier="tier_1"
            )
            self.company_profile = profile
            super().save(update_fields=['company_profile'])

