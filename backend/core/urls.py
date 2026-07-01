from django.contrib import admin
from django.urls import path
from apps.subscriptions.services import stripe_webhook_view

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/webhooks/stripe/', stripe_webhook_view, name='stripe-webhook'),
]
