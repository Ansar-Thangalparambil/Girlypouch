import stripe
from django.conf import settings
from django.db import transaction
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListCreateAPIView, RetrieveUpdateAPIView
from django.shortcuts import get_object_or_404

from apps.subscriptions.models import Subscription, SubscriptionItem
from apps.subscriptions.serializers import SubscriptionSerializer

# Ensure Stripe key is loaded
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_dummy')


class SubscriptionListCreateView(ListCreateAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user).prefetch_related('items__pad_component', 'kit_product')

    def perform_create(self, serializer):
        with transaction.atomic():
            # Save the subscription, status is initially 'paused' until payment succeeds
            subscription = serializer.save(user=self.request.user, status='paused')
            
            # Save customized items
            items_data = self.request.data.get('items', [])
            for item in items_data:
                SubscriptionItem.objects.create(
                    subscription=subscription,
                    pad_component_id=item['pad_component_id'],
                    quantity=item['quantity']
                )


class StripeCheckoutSessionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        subscription_id = request.data.get('subscription_id')
        success_url = request.data.get('success_url')
        cancel_url = request.data.get('cancel_url')

        if not all([subscription_id, success_url, cancel_url]):
            return Response(
                {"error": "Missing subscription_id, success_url, or cancel_url."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            subscription = Subscription.objects.get(id=subscription_id, user=request.user)
        except Subscription.DoesNotExist:
            return Response({"error": "Subscription not found."}, status=status.HTTP_404_NOT_FOUND)

        kit = subscription.kit_product
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_dummy')

        try:
            # 1. Create or retrieve Product in Stripe
            stripe_product_id = f"prod_kit_{kit.id}"
            try:
                stripe.Product.retrieve(stripe_product_id)
            except stripe.error.InvalidRequestError:
                stripe.Product.create(
                    id=stripe_product_id,
                    name=kit.name,
                    description=kit.description or "Period Product Customization Pack"
                )

            # 2. Retrieve or create Price in Stripe matching interval and pricing
            prices = stripe.Price.list(product=stripe_product_id, active=True)
            price_id = None
            for p in prices.data:
                if p.unit_amount == int(kit.price * 100) and p.recurring.get('interval_count') == subscription.delivery_interval_days:
                    price_id = p.id
                    break

            if not price_id:
                price = stripe.Price.create(
                    product=stripe_product_id,
                    unit_amount=int(kit.price * 100),
                    currency="usd",
                    recurring={
                        "interval": "day",
                        "interval_count": subscription.delivery_interval_days
                    }
                )
                price_id = price.id

            # 3. Create Stripe Checkout Session
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                mode='subscription',
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                client_reference_id=str(subscription.id),
                subscription_data={
                    'metadata': {
                        'subscription_id': str(subscription.id)
                    }
                },
                success_url=success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=cancel_url,
            )

            return Response({"checkout_url": session.url}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Stripe integration failed: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({"error": "Missing session_id."}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_dummy')
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            local_sub_id = session.client_reference_id
            stripe_subscription_id = session.subscription

            if not local_sub_id or not stripe_subscription_id:
                return Response({"error": "Invalid checkout session details."}, status=status.HTTP_400_BAD_REQUEST)

            # Retrieve and verify user ownership
            try:
                subscription = Subscription.objects.get(id=local_sub_id, user=request.user)
            except Subscription.DoesNotExist:
                return Response({"error": "Subscription not found or unauthorized."}, status=status.HTTP_404_NOT_FOUND)

            # Update subscription status
            subscription.stripe_subscription_id = stripe_subscription_id
            subscription.status = 'active'
            subscription.save(update_fields=['stripe_subscription_id', 'status'])

            return Response({
                "status": "success",
                "subscription": SubscriptionSerializer(subscription).data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": f"Failed to confirm subscription: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class SubscriptionDetailView(RetrieveUpdateAPIView):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user).prefetch_related('items__pad_component', 'kit_product')

    def perform_update(self, serializer):
        stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_dummy')
        instance = self.get_object()

        # Handle customized items update if sent in payload
        items_data = self.request.data.get('items')
        
        with transaction.atomic():
            # Update the base model attributes (e.g. status)
            subscription = serializer.save()

            if items_data is not None:
                # Clear existing items and re-create updated list
                subscription.items.all().delete()
                for item in items_data:
                    SubscriptionItem.objects.create(
                        subscription=subscription,
                        pad_component_id=item['pad_component_id'],
                        quantity=item['quantity']
                    )

            # Sync cancellation status with Stripe
            if subscription.status == 'cancelled' and instance.status != 'cancelled' and subscription.stripe_subscription_id:
                try:
                    stripe.Subscription.modify(subscription.stripe_subscription_id, cancel_at_period_end=True)
                except Exception as stripe_err:
                    # Log stripe error but allow local update
                    pass
            elif subscription.status == 'active' and instance.status == 'paused' and subscription.stripe_subscription_id:
                try:
                    stripe.Subscription.modify(subscription.stripe_subscription_id, pause_collection=None)
                except Exception:
                    pass
            elif subscription.status == 'paused' and instance.status == 'active' and subscription.stripe_subscription_id:
                try:
                    stripe.Subscription.modify(subscription.stripe_subscription_id, pause_collection={"behavior": "keep_as_draft"})
                except Exception:
                    pass
