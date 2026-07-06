import os
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.authtoken.models import Token
from django.conf import settings

from apps.products.models import PadComponent
from apps.orders.models import Order, OrderItem, WholesaleInvoice

User = get_user_model()

class WholesaleOrderTests(APITestCase):
    def setUp(self):
        # Create D2C user
        self.d2c_user = User.objects.create_user(
            username='d2c_customer',
            email='customer@example.com',
            password='password123',
            is_b2b=False
        )
        self.d2c_token = Token.objects.create(user=self.d2c_user)

        # Create B2B user
        self.b2b_user = User.objects.create_user(
            username='b2b_client',
            email='client@corporate.com',
            password='password123',
            is_b2b=True,
            company_name='Wellness Bulk Distributors LLC',
            vat_number='VAT9988776655',
            shipping_address='456 Logistics Blvd, Chicago, IL 60609',
            billing_address='789 Financial Plaza, New York, NY 10005'
        )
        self.b2b_token = Token.objects.create(user=self.b2b_user)

        # Create other B2B user for permission tests
        self.other_b2b_user = User.objects.create_user(
            username='other_b2b_client',
            email='other@corporate.com',
            password='password123',
            is_b2b=True
        )
        self.other_b2b_token = Token.objects.create(user=self.other_b2b_user)

        # Create Pad Components
        self.gym_pad = PadComponent.objects.create(
            name="Gym Pad",
            component_type="gym_pad",
            stock_level=1000,
            wholesale_price=Decimal("0.50")
        )
        self.regular_pad = PadComponent.objects.create(
            name="Regular Pad",
            component_type="regular_pad",
            stock_level=500,
            wholesale_price=Decimal("0.40")
        )

        self.wholesale_url = reverse('wholesale-order-create')

    def test_d2c_user_cannot_place_wholesale_order(self):
        """
        Verify that a regular D2C customer gets a Forbidden (403) status
        when trying to access the wholesale order creation endpoint.
        """
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.d2c_token.key)
        data = {
            "items": [
                {"pad_component_id": self.gym_pad.id, "quantity": 100}
            ],
            "shipping_address": "123 Test Rd"
        }
        response = self.client.post(self.wholesale_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


    def test_b2b_user_can_place_wholesale_order_success(self):
        """
        Verify that a B2B client can successfully place a bulk order.
        Check that:
        - Order and OrderItem records are created.
        - WholesaleInvoice record is created and set to 'generated'.
        - PDF invoice is generated on disk.
        - Pad component inventory is correctly decremented.
        """
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.b2b_token.key)
        data = {
            "items": [
                {"pad_component_id": self.gym_pad.id, "quantity": 200},
                {"pad_component_id": self.regular_pad.id, "quantity": 100}
            ],
            "billing_terms": "net_30",
            "tax_rate": 20.00,
            "shipping_address": "456 Corporate Warehouse, Chicago, IL"
        }
        
        response = self.client.post(self.wholesale_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("order", response.data)
        self.assertIn("invoice", response.data)

        # Verify stock levels are NOT decremented immediately on placement
        self.gym_pad.refresh_from_db()
        self.regular_pad.refresh_from_db()
        self.assertEqual(self.gym_pad.stock_level, 1000)
        self.assertEqual(self.regular_pad.stock_level, 500)

        # Verify database objects
        order_id = response.data["order"]["id"]
        order = Order.objects.get(id=order_id)
        self.assertEqual(order.order_type, 'b2b_wholesale')
        self.assertEqual(order.status, 'pending')
        self.assertFalse(order.inventory_decremented)
        
        # Subtotal (Tier 1 10% discount): 
        # Gym Pad: 200 * (0.50 * 0.90) = 90.00
        # Regular Pad: 100 * (0.40 * 0.90) = 36.00
        # Subtotal = 126.00
        # Tax = 126.00 * 0.20 = 25.20
        # Total = 151.20
        self.assertEqual(order.total_amount, Decimal("151.20"))

        # Transition order to dispatched to trigger stock decrement
        order.status = 'dispatched'
        order.save()

        # Verify stock levels are now decremented
        self.gym_pad.refresh_from_db()
        self.regular_pad.refresh_from_db()
        self.assertEqual(self.gym_pad.stock_level, 800)  # 1000 - 200
        self.assertEqual(self.regular_pad.stock_level, 400)  # 500 - 100
        
        # Verify Invoice and PDF file exists
        invoice = WholesaleInvoice.objects.get(order=order)
        self.assertEqual(invoice.pdf_status, 'generated')
        self.assertTrue(invoice.pdf_file_path.endswith('.pdf'))

        # Check physical file exists
        filename = os.path.basename(invoice.pdf_file_path)
        file_path = os.path.join(settings.MEDIA_ROOT, 'invoices', filename)
        self.assertTrue(os.path.exists(file_path))

        # Clean up generated PDF file
        if os.path.exists(file_path):
            os.remove(file_path)

    def test_wholesale_order_out_of_stock_fails(self):
        """
        Verify that wholesale order creation fails and rolls back the transaction
        if requested quantity exceeds available stock levels.
        """
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.b2b_token.key)
        data = {
            "items": [
                {"pad_component_id": self.gym_pad.id, "quantity": 1001}  # Only 1000 available
            ],
            "shipping_address": "456 Corporate Warehouse, Chicago, IL"
        }
        
        response = self.client.post(self.wholesale_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)

        # Inventory must remain untouched
        self.gym_pad.refresh_from_db()
        self.assertEqual(self.gym_pad.stock_level, 1000)

        # No order should have been created
        self.assertFalse(Order.objects.filter(user=self.b2b_user).exists())

    def test_invoice_download_permissions(self):
        """
        Verify that:
        - B2B client can download their own invoice.
        - Other B2B client cannot download their invoice (403).
        - Anonymous user cannot download (401).
        """
        # Create a mock order and invoice manually
        order = Order.objects.create(
            user=self.b2b_user,
            order_type='b2b_wholesale',
            status='pending',
            total_amount=Decimal("100.00"),
            shipping_address="Test Address"
        )
        invoice = WholesaleInvoice.objects.create(
            order=order,
            company_name="Test Company",
            billing_terms="net_30",
            tax_rate=20.00,
            pdf_status="generated",
            pdf_file_path="/media/invoices/mock_invoice.pdf"
        )

        # Create dummy PDF file physically
        invoices_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
        os.makedirs(invoices_dir, exist_ok=True)
        file_path = os.path.join(invoices_dir, "mock_invoice.pdf")
        with open(file_path, "w") as f:
            f.write("mock pdf content")

        download_url = reverse('wholesale-invoice-download', kwargs={"pk": invoice.id})

        # Test 1: Anonymous fails
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        # Test 2: Other B2B client fails
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.other_b2b_token.key)
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

        # Test 3: Owner B2B client succeeds
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.b2b_token.key)
        response = self.client.get(download_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')


        # Close response stream safely on Windows without dropping DB connection
        from django.core.signals import request_finished
        from django.db import close_old_connections
        request_finished.disconnect(close_old_connections)
        try:
            response.close()
        finally:
            request_finished.connect(close_old_connections)




        # Clean up mock file
        if os.path.exists(file_path):
            os.remove(file_path)

