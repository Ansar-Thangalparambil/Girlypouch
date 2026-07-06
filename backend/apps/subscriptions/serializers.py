from rest_framework import serializers
from apps.products.models import KitProduct, PadComponent
from apps.products.serializers import KitProductSerializer, PadComponentSerializer
from apps.subscriptions.models import Subscription, SubscriptionItem

class SubscriptionItemSerializer(serializers.ModelSerializer):
    pad_component_id = serializers.PrimaryKeyRelatedField(
        queryset=PadComponent.objects.all(),
        source='pad_component',
        write_only=True
    )
    pad_component = PadComponentSerializer(read_only=True)

    class Meta:
        model = SubscriptionItem
        fields = ['id', 'pad_component_id', 'pad_component', 'quantity']


class SubscriptionSerializer(serializers.ModelSerializer):
    kit_product_id = serializers.PrimaryKeyRelatedField(
        queryset=KitProduct.objects.all(),
        source='kit_product',
        write_only=True
    )
    kit_product = KitProductSerializer(read_only=True)
    items = SubscriptionItemSerializer(many=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'user', 'kit_product_id', 'kit_product', 'stripe_subscription_id',
            'status', 'delivery_interval_days', 'next_delivery_date', 'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['id', 'user', 'stripe_subscription_id', 'created_at', 'updated_at']

    def validate(self, data):
        # Validate customization total quantity matches kit_product.max_components
        kit_product = data.get('kit_product')
        items_data = data.get('items', [])

        if kit_product:
            total_qty = sum(item.get('quantity', 0) for item in items_data)
            if total_qty != kit_product.max_components:
                raise serializers.ValidationError(
                    f"Invalid component count. The '{kit_product.name}' requires exactly "
                    f"{kit_product.max_components} components. Total selected: {total_qty}."
                )

        return data
