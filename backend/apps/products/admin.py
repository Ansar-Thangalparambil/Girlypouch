from django.contrib import admin
from apps.products.models import PadComponent, KitProduct

@admin.register(PadComponent)
class PadComponentAdmin(admin.ModelAdmin):
    list_display = ['name', 'component_type', 'stock_level', 'low_stock_threshold', 'wholesale_price', 'is_low_stock']
    list_filter = ['component_type']
    search_fields = ['name']
    ordering = ['name']


@admin.register(KitProduct)
class KitProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'price', 'max_components', 'is_subscription_only', 'created_at']
    prepopulated_fields = {'slug': ('name',)}
    search_fields = ['name']
    ordering = ['name']
