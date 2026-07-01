from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction

from apps.products.models import PadComponent, KitProduct
from apps.subscriptions.models import Subscription, SubscriptionItem
from apps.orders.models import Order, OrderItem
from apps.subscriptions.services import fulfill_subscription_payment

User = get_user_model()

class GirlyPouchSubscriptionTests(TestCase):
    def setUp(self):
        # Create a test customer
        self.user = User.objects.create_user(username='d2c_customer', email='customer@example.com', password='password123')

        # Create Pad Components
        self.gym_pad = PadComponent.objects.create(
            name="Gym Pad",
            component_type="gym_pad",
            stock_level=100,
            low_stock_threshold=10
        )
        self.regular_pad = PadComponent.objects.create(
            name="Regular Pad",
            component_type="regular_pad",
            stock_level=100,
            low_stock_threshold=10
        )
        self.night_pad = PadComponent.objects.create(
            name="Night Pad",
            component_type="night_pad",
            stock_level=5,  # Low stock
            low_stock_threshold=10
        )

        # Create a KitProduct
        self.home_kit = KitProduct.objects.create(
            name="Home Essential Kit",
            slug="home-essential-kit",
            description="Our flagship 10-pack period customization kit.",
            price=29.99,
            max_components=10,
            is_subscription_only=True
        )

        # Create subscription
        self.subscription = Subscription.objects.create(
            user=self.user,
            kit_product=self.home_kit,
            stripe_subscription_id="sub_test123",
            status="active"
        )

    def test_subscription_customization_validation_success(self):
        """
        Verify that a customization with exactly 10 items is valid.
        """
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.gym_pad, quantity=6)
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.regular_pad, quantity=4)

        # Should validate successfully without exceptions
        self.subscription.validate_customization()
        self.assertEqual(self.subscription.calculate_total_quantity(), 10)

    def test_subscription_customization_validation_failure(self):
        """
        Verify that a customization with != 10 items raises a ValidationError.
        """
        # Create items summing to 9 (less than 10)
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.gym_pad, quantity=5)
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.regular_pad, quantity=4)

        with self.assertRaises(ValidationError):
            self.subscription.validate_customization()

        # Update items to sum to 11 (more than 10)
        item = SubscriptionItem.objects.get(pad_component=self.gym_pad)
        item.quantity = 7
        item.save()

        with self.assertRaises(ValidationError):
            self.subscription.validate_customization()

    def test_stripe_webhook_fulfillment_and_stock_decrement(self):
        """
        Verify that successful Stripe charge generates a fulfillment Order
        and decrements inventory correctly.
        """
        # Set up a valid customization pack (10 components)
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.gym_pad, quantity=6)
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.regular_pad, quantity=4)

        mock_invoice = {
            'amount_paid': 2999,
            'customer_shipping': {
                'address': {
                    'line1': '123 Wellness Way',
                    'city': 'San Francisco',
                    'state': 'CA',
                    'postal_code': '94103',
                    'country': 'US'
                }
            }
        }

        # Run webhook payment fulfillment
        fulfill_subscription_payment("sub_test123", mock_invoice)

        # Check that a new Order has been created
        orders = Order.objects.filter(subscription=self.subscription)
        self.assertEqual(orders.count(), 1)

        from decimal import Decimal
        order = orders.first()
        self.assertEqual(order.status, 'pending')
        self.assertEqual(order.order_type, 'd2c_subscription')
        self.assertEqual(order.total_amount, Decimal('29.99'))
        self.assertEqual(order.shipping_address, '123 Wellness Way, San Francisco, CA 94103, US')
        self.assertTrue(order.inventory_decremented)

        # Check that inventory was correctly decremented
        self.gym_pad.refresh_from_db()
        self.regular_pad.refresh_from_db()
        self.assertEqual(self.gym_pad.stock_level, 94)  # 100 - 6
        self.assertEqual(self.regular_pad.stock_level, 96)  # 100 - 4

    def test_fulfillment_fallback_during_low_stock(self):
        """
        Verify that if stock level is insufficient, the fulfillment order is still
        recorded, but the stock transaction is rolled back (safe fallback) and
        inventory_decremented is set to False.
        """
        # Set up a valid customization pack that includes the low-stock Night Pad (5 in stock)
        # We request 6 Night Pads (more than 5 in stock)
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.gym_pad, quantity=4)
        SubscriptionItem.objects.create(subscription=self.subscription, pad_component=self.night_pad, quantity=6)

        mock_invoice = {
            'amount_paid': 2999,
            'customer_shipping': {
                'address': {
                    'line1': '123 Wellness Way',
                    'city': 'San Francisco',
                    'state': 'CA',
                    'postal_code': '94103',
                    'country': 'US'
                }
            }
        }

        # Run webhook payment fulfillment - should not throw unhandled exception
        fulfill_subscription_payment("sub_test123", mock_invoice)

        # Order should still be recorded
        orders = Order.objects.filter(subscription=self.subscription)
        self.assertEqual(orders.count(), 1)

        order = orders.first()
        self.assertEqual(order.status, 'pending')
        # Crucial: inventory_decremented must be False because the decrement failed
        self.assertFalse(order.inventory_decremented)

        # Inventory levels should remain unchanged (savepoint rolled back)
        self.gym_pad.refresh_from_db()
        self.night_pad.refresh_from_db()
        self.assertEqual(self.gym_pad.stock_level, 100)  # No change
        self.assertEqual(self.night_pad.stock_level, 5)    # No change
