from django.urls import path
from apps.subscriptions.views import (
    SubscriptionListCreateView,
    SubscriptionDetailView,
    StripeCheckoutSessionView,
    SubscriptionConfirmView
)

urlpatterns = [
    path('', SubscriptionListCreateView.as_view(), name='subscription-list-create'),
    path('<int:pk>/', SubscriptionDetailView.as_view(), name='subscription-detail'),
    path('create-checkout-session/', StripeCheckoutSessionView.as_view(), name='subscription-checkout-session'),
    path('confirm/', SubscriptionConfirmView.as_view(), name='subscription-confirm'),
]
