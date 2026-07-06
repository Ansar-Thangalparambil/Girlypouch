from django.contrib import admin
from apps.subscriptions.models import Subscription, SubscriptionItem

class SubscriptionItemInline(admin.TabularInline):
    model = SubscriptionItem
    extra = 0
    raw_id_fields = ['pad_component']


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'kit_product', 'stripe_subscription_id', 
        'status', 'delivery_interval_days', 'next_delivery_date', 'created_at'
    ]
    list_filter = ['status', 'kit_product', 'delivery_interval_days']
    search_fields = ['user__username', 'user__email', 'stripe_subscription_id']
    inlines = [SubscriptionItemInline]
    ordering = ['-created_at']
