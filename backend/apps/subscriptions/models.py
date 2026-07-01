from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.products.models import KitProduct, PadComponent

class Subscription(models.Model):
    """
    Tracks a customer's D2C customizable period product subscription.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('skipped', 'Skipped'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscriptions',
        help_text="The customer who owns this subscription."
    )
    kit_product = models.ForeignKey(
        KitProduct,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        help_text="The base kit configuration metadata for this subscription."
    )
    stripe_subscription_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True,
        help_text="The associated ID from Stripe Billing."
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active',
        help_text="Current billing/delivery cycle status."
    )
    delivery_interval_days = models.PositiveIntegerField(
        default=28,
        help_text="Interval in days between recurring shipments."
    )
    next_delivery_date = models.DateField(
        null=True,
        blank=True,
        help_text="The next planned delivery shipment date."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Subscription {self.id or 'Unsaved'} - {self.user.username} ({self.status})"

    def calculate_total_quantity(self) -> int:
        """
        Calculates the sum of all item quantities configured in this subscription.
        """
        # Uses aggregation to avoid loading all objects if we only need the count
        result = self.items.aggregate(total=models.Sum('quantity'))
        return result['total'] or 0

    def validate_customization(self):
        """
        Validates that the total component quantity matches the kit requirements.
        e.g., Home Essential Kit requires exactly 10 components.
        """
        total_qty = self.calculate_total_quantity()
        max_qty = self.kit_product.max_components
        if total_qty != max_qty:
            raise ValidationError(
                f"Invalid component count. The {self.kit_product.name} "
                f"requires exactly {max_qty} components. Currently selected: {total_qty}."
            )


class SubscriptionItem(models.Model):
    """
    Junction model mapping exactly which PadComponents and what quantities
    the customer has customized for their subscription pack.
    """
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.CASCADE,
        related_name='items',
        help_text="The parent subscription."
    )
    pad_component = models.ForeignKey(
        PadComponent,
        on_delete=models.PROTECT,
        related_name='subscription_items',
        help_text="The pad component type selected."
    )
    quantity = models.PositiveIntegerField(
        default=0,
        help_text="The quantity of this specific pad component included in the package."
    )

    class Meta:
        unique_together = ('subscription', 'pad_component')
        verbose_name = "Subscription Item"
        verbose_name_plural = "Subscription Items"

    def __str__(self):
        return f"{self.quantity}x {self.pad_component.name} in Sub {self.subscription_id}"

    def save(self, *args, **kwargs):
        if self.quantity < 0:
            raise ValidationError("Quantity cannot be negative.")
        super().save(*args, **kwargs)
