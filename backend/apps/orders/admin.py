from django.contrib import admin
from apps.orders.models import Order, OrderItem, WholesaleInvoice

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    raw_id_fields = ['pad_component']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'subscription', 'order_type', 
        'status', 'total_amount', 'inventory_decremented', 'created_at'
    ]
    list_filter = ['order_type', 'status', 'inventory_decremented', 'created_at']
    search_fields = ['user__username', 'user__email', 'id']
    inlines = [OrderItemInline]
    ordering = ['-created_at']


@admin.register(WholesaleInvoice)
class WholesaleInvoiceAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'order', 'company_name', 'vat_number', 
        'billing_terms', 'tax_rate', 'pdf_status', 'created_at'
    ]
    list_filter = ['billing_terms', 'pdf_status', 'created_at']
    search_fields = ['company_name', 'vat_number', 'order__id']
    ordering = ['-created_at']
