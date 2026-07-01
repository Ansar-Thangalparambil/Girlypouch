import json
import logging
import stripe
from django.conf import settings
from django.db import transaction
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

from apps.orders.models import Order, OrderItem
from apps.subscriptions.models import Subscription

logger = logging.getLogger(__name__)
User = get_user_model()

@csrf_exempt
@require_POST
def stripe_webhook_view(request):
    """
    Secure endpoint to receive and verify Stripe webhook events.
    Handles invoice.payment_succeeded to fulfill customized subscription orders.
    """
    payload = request.body
    sig_header = request.headers.get('STRIPE_SIGNATURE') or request.META.get('HTTP_STRIPE_SIGNATURE')
    
    # Retrieve webhook secret from Django settings
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None)
    
    if not sig_header:
        logger.error("Missing Stripe signature header.")
        return HttpResponse("Missing signature", status=400)
    
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured in settings.")
        return HttpResponse("Server misconfiguration", status=500)

    try:
        # Secure signature verification using stripe SDK
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        logger.error("Invalid payload structure received: %s", str(e))
        return HttpResponse("Invalid payload", status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error("Stripe signature verification failed: %s", str(e))
        return HttpResponse("Invalid signature", status=400)

    event_type = event.get('type')
    logger.info("Received Stripe webhook event: %s", event_type)

    if event_type == 'invoice.payment_succeeded':
        invoice_obj = event.get('data', {}).get('object', {})
        stripe_subscription_id = invoice_obj.get('subscription')
        
        if stripe_subscription_id:
            try:
                # Fulfill the order under transactional control
                fulfill_subscription_payment(stripe_subscription_id, invoice_obj)
            except Subscription.DoesNotExist:
                logger.error("Subscription matching stripe_id '%s' not found in database.", stripe_subscription_id)
                return HttpResponse("Subscription not found", status=200)
            except Exception as e:
                logger.exception("Error processing webhook subscription fulfillment: %s", str(e))
                return HttpResponse("Internal processing error", status=500)
        else:
            logger.warning("invoice.payment_succeeded event did not contain a valid subscription ID.")

    return HttpResponse("Event processed", status=200)


def fulfill_subscription_payment(stripe_subscription_id: str, stripe_invoice: dict):
    """
    Core service logic to fulfill a successful recurring subscription invoice payment.
    Creates a D2C fulfillment order and decrements pad component stock.
    Uses sub-transactions (savepoints) so that if stock is insufficient, the fulfillment
    order is still recorded, but flagged for manual admin intervention.
    """
    logger.info("Starting order fulfillment for Stripe subscription: %s", stripe_subscription_id)

    # 1. Fetch subscription and prefetch customized components
    subscription = Subscription.objects.select_related('user', 'kit_product').prefetch_related('items__pad_component').get(
        stripe_subscription_id=stripe_subscription_id
    )

    # Extract invoice billing information
    amount_paid_cents = stripe_invoice.get('amount_paid', 0)
    amount_paid = amount_paid_cents / 100.0 if amount_paid_cents > 0 else subscription.kit_product.price

    # Fallback address determination
    shipping_address = (
        stripe_invoice.get('customer_shipping', {}).get('address', {})
        or stripe_invoice.get('customer_address', {})
    )
    
    # Format shipping address from Stripe or fallback
    address_str = ""
    if isinstance(shipping_address, dict):
        line1 = shipping_address.get('line1', '')
        city = shipping_address.get('city', '')
        state = shipping_address.get('state', '')
        postal_code = shipping_address.get('postal_code', '')
        country = shipping_address.get('country', '')
        address_str = f"{line1}, {city}, {state} {postal_code}, {country}".strip(", ")
    
    if not address_str:
        # Fallback to user shipping profile attribute if available
        address_str = getattr(subscription.user, 'shipping_address', 'No Shipping Address Provided')

    # Run everything inside a database transaction to ensure atomicity
    with transaction.atomic():
        # 2. Create the fulfillment order
        order = Order.objects.create(
            user=subscription.user,
            subscription=subscription,
            order_type='d2c_subscription',
            status='pending',
            total_amount=amount_paid,
            shipping_address=address_str,
            inventory_decremented=False
        )

        # 3. Create order items mirroring the customized subscription items
        order_items = []
        subscription_items = subscription.items.all()
        
        for sub_item in subscription_items:
            order_items.append(OrderItem(
                order=order,
                pad_component=sub_item.pad_component,
                quantity=sub_item.quantity,
                price_at_purchase=0.00  # Paid via subscription base price
            ))
            
        OrderItem.objects.bulk_create(order_items)
        logger.info("Created %d order items for Order #%d.", len(order_items), order.id)

        # 4. Attempt to decrement inventory in a nested transaction (savepoint)
        try:
            with transaction.atomic():
                order.decrement_inventory()
            logger.info("Fulfillment order #%d successfully created and inventory decremented.", order.id)
        except ValidationError as ve:
            # If stock level is low, the nested atomic block will be rolled back.
            # The order remains created, but inventory_decremented is False.
            logger.error(
                "Fulfillment order #%d created, but stock decrement failed due to low stock: %s. "
                "Order remains pending and requires manual inventory allocation.", order.id, str(ve)
            )
            # Log failure to alert systems
            logger.warning("Fulfillment Order #%d is in backlog due to out-of-stock components.", order.id)
