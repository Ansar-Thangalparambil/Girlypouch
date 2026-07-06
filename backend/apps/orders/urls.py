from django.urls import path
from apps.orders.views import (
    OrderListView,
    OrderDetailView,
    WholesaleOrderCreateView,
    WholesaleInvoiceListView,
    WholesaleInvoiceDownloadView
)

urlpatterns = [
    path('', OrderListView.as_view(), name='orders-list'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('wholesale/', WholesaleOrderCreateView.as_view(), name='wholesale-order-create'),
    path('wholesale/invoices/', WholesaleInvoiceListView.as_view(), name='wholesale-invoices-list'),
    path('wholesale/invoices/<int:pk>/download/', WholesaleInvoiceDownloadView.as_view(), name='wholesale-invoice-download'),
]
