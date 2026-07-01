import logging
from django.db import models, transaction
from django.conf import settings
from django.core.exceptions import ValidationError
from apps.products.models import PadComponent
from apps.subscriptions.models import Subscription

logger = logging.getLogger(__name__)

class Order(models.Model):
    """
    Represents an order in the system, which can be:
    - A standard D2C single purchase
    - A subscription-generated recurring order
    - A B2B wholesale order
    """
    ORDER_TYPE_CHOICES = [
        ('d2c_single', 'D2C Single Order'),
        ('d2c_subscription', 'D2C Subscription Order'),
        ('b2b_wholesale', 'B2B Wholesale Order'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('packed', 'Packed'),
        ('dispatched', 'Dispatched'),
        ('cancelled', 'Cancelled'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='orders',
        help_text="The customer or B2B client placing the order."
    )
    subscription = models.ForeignKey(
        Subscription,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='orders',
        help_text="The subscription that generated this order, if applicable."
    )
    order_type = models.CharField(
        max_length=30,
        choices=ORDER_TYPE_CHOICES,
        default='d2c_single'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Total value of the order."
    )
    shipping_address = models.TextField(
        help_text="Full shipping destination address."
    )
    inventory_decremented = models.BooleanField(
        default=False,
        help_text="Flag to ensure stock is only decremented once for this order."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order #{self.id or 'Unsaved'} ({self.get_order_type_display()}) - {self.status}"

    @transaction.atomic
    def decrement_inventory(self):
        """
        Locks inventory rows using select_for_update and decrements the components.
        Raises ValidationError if any component has insufficient stock.
        """
        if self.inventory_decremented:
            logger.info("Inventory already decremented for Order %s. Skipping.", self.id)
            return

        logger.info("Decrementing inventory for Order %s.", self.id)
        
        # Iterate over all items in the order
        items = self.items.select_related('pad_component').all()
        for item in items:
            # Row lock to prevent race conditions during parallel checkout/dispatch
            component = PadComponent.objects.select_for_update().get(pk=item.pad_component.pk)
            if component.stock_level < item.quantity:
                raise ValidationError(
                    f"Insufficient stock for '{component.name}'. "
                    f"Requested: {item.quantity}, Available: {component.stock_level}."
                )
            
            component.stock_level -= item.quantity
            component.save(update_fields=['stock_level'])
            logger.info("Decremented %s stock by %d. New stock: %d", 
                        component.name, item.quantity, component.stock_level)

        self.inventory_decremented = True
        self.save(update_fields=['inventory_decremented'])

    def save(self, *args, **kwargs):
        # We need to detect if the status is changing to 'dispatched'
        is_transitioning_to_dispatched = False

        if self.pk:
            original = Order.objects.get(pk=self.pk)
            if original.status != 'dispatched' and self.status == 'dispatched':
                is_transitioning_to_dispatched = True
        elif self.status == 'dispatched':
            is_transitioning_to_dispatched = True

        super().save(*args, **kwargs)

        # Trigger inventory decrement if we are dispatching and haven't decremented yet
        if is_transitioning_to_dispatched and not self.inventory_decremented:
            self.decrement_inventory()


class OrderItem(models.Model):
    """
    Connects an order to individual pad components or items.
    """
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name='items'
    )
    pad_component = models.ForeignKey(
        PadComponent,
        on_delete=models.PROTECT,
        related_name='order_items'
    )
    quantity = models.PositiveIntegerField(default=1)
    price_at_purchase = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text="Historical price per item unit at the time of order placement."
    )

    def __str__(self):
        return f"{self.quantity}x {self.pad_component.name} in Order #{self.order_id}"


class WholesaleInvoice(models.Model):
    """
    Invoicing metadata for B2B wholesale corporate accounts.
    """
    BILLING_TERMS_CHOICES = [
        ('net_15', 'Net-15'),
        ('net_30', 'Net-30'),
        ('net_45', 'Net-45'),
        ('net_60', 'Net-60'),
    ]

    PDF_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generated', 'Generated'),
        ('failed', 'Failed'),
    ]

    order = models.OneToOneField(
        Order,
        on_delete=models.CASCADE,
        related_name='wholesale_invoice',
        help_text="The wholesale order this invoice is associated with."
    )
    company_name = models.CharField(max_length=200)
    vat_number = models.CharField(max_length=50, blank=True, help_text="Custom Tax/VAT registration identifier.")
    billing_terms = models.CharField(
        max_length=20,
        choices=BILLING_TERMS_CHOICES,
        default='net_30'
    )
    tax_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        help_text="Tax or VAT percentage (e.g. 20.00)."
    )
    pdf_status = models.CharField(
        max_length=20,
        choices=PDF_STATUS_CHOICES,
        default='pending'
    )
    pdf_file_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Path or URL to the generated invoice PDF."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice {self.id or 'Unsaved'} for {self.company_name} (Terms: {self.get_billing_terms_display()})"
