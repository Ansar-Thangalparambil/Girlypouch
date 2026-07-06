from django.db import models

class PadComponent(models.Model):
    """
    Represents an individual period product component with its own inventory tracking.
    Examples: Gym Pad, Regular Pad, Night Pad, Panty Liner.
    """
    TYPE_CHOICES = [
        ('gym_pad', 'Gym Pad'),
        ('regular_pad', 'Regular Pad'),
        ('night_pad', 'Night Pad'),
        ('panty_liner', 'Panty Liner'),
    ]

    name = models.CharField(max_length=100, unique=True, help_text="The name of the pad component (e.g. Regular Pad).")
    component_type = models.CharField(max_length=50, choices=TYPE_CHOICES, default='regular_pad')
    stock_level = models.PositiveIntegerField(default=0, help_text="Current available inventory level.")
    low_stock_threshold = models.PositiveIntegerField(default=10, help_text="Inventory level that triggers a low stock alert.")
    wholesale_price = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.50, 
        help_text="Wholesale price per unit for bulk B2B invoices."
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Pad Component"
        verbose_name_plural = "Pad Components"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.get_component_type_display()}) - Stock: {self.stock_level}"

    @property
    def is_low_stock(self) -> bool:
        """
        Helper property to determine if the component stock is at or below the warning threshold.
        """
        return self.stock_level <= self.low_stock_threshold


class KitProduct(models.Model):
    """
    Metadata for pre-configured or customizable kits (e.g., Emergency Kit vs Home Essential Kit).
    """
    name = models.CharField(max_length=100, unique=True, help_text="The name of the kit (e.g. Home Essential Kit).")
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True, help_text="Detailed description of what the kit contains.")
    price = models.DecimalField(max_digits=10, decimal_places=2, help_text="Pricing for one-off purchase or per delivery cycle.")
    max_components = models.PositiveIntegerField(default=10, help_text="The exact total quantity of customizable components included in this kit.")
    is_subscription_only = models.BooleanField(default=False, help_text="Designates if this kit can only be purchased as a subscription.")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Kit Product"
        verbose_name_plural = "Kit Products"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} - ${self.price}"
