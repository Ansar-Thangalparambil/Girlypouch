from rest_framework import serializers
from apps.products.models import PadComponent, KitProduct

class PadComponentSerializer(serializers.ModelSerializer):
    contract_price = serializers.SerializerMethodField()

    class Meta:
        model = PadComponent
        fields = ['id', 'name', 'component_type', 'stock_level', 'low_stock_threshold', 'is_low_stock', 'wholesale_price', 'contract_price']

    def get_contract_price(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated and request.user.is_b2b:
            discount_percent = 0.0
            profile = getattr(request.user, 'company_profile', None)
            if profile:
                if profile.discount_tier == 'tier_1':
                    discount_percent = 0.10
                elif profile.discount_tier == 'tier_2':
                    discount_percent = 0.15
            price = float(obj.wholesale_price)
            return round(price * (1.0 - discount_percent), 2)
        return float(obj.wholesale_price)



class KitProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = KitProduct
        fields = ['id', 'name', 'slug', 'description', 'price', 'max_components', 'is_subscription_only']
