from rest_framework import serializers
from apps.products.models import PadComponent
from apps.products.serializers import PadComponentSerializer
from apps.orders.models import Order, OrderItem, WholesaleInvoice

class OrderItemSerializer(serializers.ModelSerializer):
    pad_component_id = serializers.PrimaryKeyRelatedField(
        queryset=PadComponent.objects.all(),
        source='pad_component',
        write_only=True
    )
    pad_component = PadComponentSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'pad_component_id', 'pad_component', 'quantity', 'price_at_purchase']
        read_only_fields = ['price_at_purchase']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user', 'subscription', 'order_type', 'status', 
            'total_amount', 'shipping_address', 'inventory_decremented', 
            'created_at', 'updated_at', 'items'
        ]
        read_only_fields = ['id', 'user', 'subscription', 'inventory_decremented', 'created_at', 'updated_at']


class WholesaleInvoiceSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)

    class Meta:
        model = WholesaleInvoice
        fields = [
            'id', 'order', 'company_name', 'vat_number', 
            'billing_terms', 'tax_rate', 'pdf_status', 'payment_status', 'pdf_file_path', 'created_at'
        ]
        read_only_fields = ['id', 'order', 'pdf_status', 'payment_status', 'pdf_file_path', 'created_at']

