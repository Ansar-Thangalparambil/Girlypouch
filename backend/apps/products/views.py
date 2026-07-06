from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework import permissions
from apps.products.models import PadComponent, KitProduct
from apps.products.serializers import PadComponentSerializer, KitProductSerializer

class PadComponentListView(ListAPIView):
    queryset = PadComponent.objects.all()
    serializer_class = PadComponentSerializer
    permission_classes = [permissions.AllowAny]


class KitProductListView(ListAPIView):
    queryset = KitProduct.objects.all()
    serializer_class = KitProductSerializer
    permission_classes = [permissions.AllowAny]


class KitProductDetailView(RetrieveAPIView):
    queryset = KitProduct.objects.all()
    serializer_class = KitProductSerializer
    lookup_field = 'slug'
    permission_classes = [permissions.AllowAny]
