from django.urls import path
from apps.products.views import PadComponentListView, KitProductListView, KitProductDetailView

urlpatterns = [
    path('components/', PadComponentListView.as_view(), name='pad-components-list'),
    path('kits/', KitProductListView.as_view(), name='kit-products-list'),
    path('kits/<slug:slug>/', KitProductDetailView.as_view(), name='kit-product-detail'),
]
