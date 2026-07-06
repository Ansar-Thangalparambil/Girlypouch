import os
from django.conf import settings
from django.db import transaction
from django.http import FileResponse, Http404
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.generics import ListAPIView, RetrieveAPIView
from django.shortcuts import get_object_or_404

from apps.orders.models import Order, OrderItem, WholesaleInvoice
from apps.orders.serializers import OrderSerializer, WholesaleInvoiceSerializer
from apps.products.models import PadComponent
from apps.orders.pdf_generator import generate_invoice_pdf

class IsB2BClient(permissions.BasePermission):
    """
    Custom permission to only allow access to B2B Wholesale Accounts.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_b2b


class OrderListView(ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items__pad_component')


class OrderDetailView(RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items__pad_component')


class WholesaleOrderCreateView(APIView):
    permission_classes = [IsB2BClient]

    def post(self, request):
        user = request.user
        items_data = request.data.get('items', [])
        
        if not items_data:
            return Response({"error": "Wholesale order must contain at least one item."}, status=status.HTTP_400_BAD_REQUEST)

        profile = getattr(user, 'company_profile', None)
        company_name = request.data.get('company_name', (profile.legal_business_name if profile else None) or user.company_name or user.username)
        vat_number = request.data.get('vat_number', (profile.vat_tax_number if profile else None) or user.vat_number or '')
        billing_terms = request.data.get('billing_terms', (profile.payment_terms if profile else None) or 'net_30')
        tax_rate = request.data.get('tax_rate', 20.00)
        shipping_address = request.data.get('shipping_address', user.shipping_address)

        if not shipping_address:
            return Response({"error": "Shipping address is required for B2B Wholesale orders."}, status=status.HTTP_400_BAD_REQUEST)

        # Determine discount tier
        discount_percent = 0.0
        if profile:
            if profile.discount_tier == 'tier_1':
                discount_percent = 0.10
            elif profile.discount_tier == 'tier_2':
                discount_percent = 0.15

        # 1. Pre-validate stock levels
        for item in items_data:
            comp_id = item.get('pad_component_id')
            qty = item.get('quantity', 0)
            
            if qty <= 0:
                return Response({"error": "Quantity must be greater than zero."}, status=status.HTTP_400_BAD_REQUEST)
                
            try:
                component = PadComponent.objects.get(id=comp_id)
                if component.stock_level < qty:
                    return Response({
                        "error": f"Insufficient stock for {component.name}. Available: {component.stock_level}, Requested: {qty}"
                    }, status=status.HTTP_400_BAD_REQUEST)
            except PadComponent.DoesNotExist:
                return Response({"error": f"Component ID {comp_id} not found."}, status=status.HTTP_404_NOT_FOUND)

        # 2. Process creation inside a transaction
        try:
            with transaction.atomic():
                # Compute total cost with B2B discount tier
                subtotal = 0.00
                temp_items = []
                for item in items_data:
                    component = PadComponent.objects.get(id=item['pad_component_id'])
                    base_price = float(component.wholesale_price)
                    price = base_price * (1.0 - discount_percent)
                    qty = int(item['quantity'])
                    subtotal += price * qty
                    temp_items.append((component, qty, price))

                tax_amount = subtotal * (float(tax_rate) / 100.0)
                total_amount = subtotal + tax_amount

                # Credit check
                if profile:
                    credit_avail = float(profile.credit_limit) - float(profile.credit_used)
                    if total_amount > credit_avail:
                        return Response({
                            "error": f"Order total (${total_amount:.2f}) exceeds remaining credit line (${credit_avail:.2f})."
                        }, status=status.HTTP_400_BAD_REQUEST)

                # Create Order (status is pending, inventory is NOT decremented yet)
                order = Order.objects.create(
                    user=user,
                    order_type='b2b_wholesale',
                    status='pending',
                    total_amount=total_amount,
                    shipping_address=shipping_address,
                    inventory_decremented=False
                )

                # Create OrderItems
                for comp, qty, price in temp_items:
                    OrderItem.objects.create(
                        order=order,
                        pad_component=comp,
                        quantity=qty,
                        price_at_purchase=price
                    )

                # Create WholesaleInvoice
                invoice = WholesaleInvoice.objects.create(
                    order=order,
                    company_name=company_name,
                    vat_number=vat_number,
                    billing_terms=billing_terms,
                    tax_rate=tax_rate,
                    pdf_status='pending',
                    payment_status='pending'
                )

                # Update B2B credit line usage
                if profile:
                    profile.credit_used = float(profile.credit_used) + total_amount
                    profile.save(update_fields=['credit_used'])

                # 3. Trigger Stripe Invoicing API
                import stripe
                stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', 'sk_test_dummy')
                
                try:
                    # Look up or create Customer
                    customers = stripe.Customer.list(email=user.email, limit=1)
                    if customers.data:
                        stripe_cust = customers.data[0]
                    else:
                        stripe_cust = stripe.Customer.create(
                            email=user.email,
                            name=company_name,
                            metadata={"vat_number": vat_number}
                        )
                    
                    # Create invoice items on Stripe
                    for comp, qty, price in temp_items:
                        stripe.InvoiceItem.create(
                            customer=stripe_cust.id,
                            amount=int(price * qty * 100),  # cents
                            currency="usd",
                            description=f"{qty}x {comp.name} (Wholesale)",
                        )
                    
                    days_until_due = 30
                    if billing_terms == 'net_60':
                        days_until_due = 60
                    elif billing_terms == 'net_15':
                        days_until_due = 15
                    elif billing_terms == 'net_45':
                        days_until_due = 45

                    # Create Stripe invoice
                    stripe_inv = stripe.Invoice.create(
                        customer=stripe_cust.id,
                        collection_method="send_invoice",
                        days_until_due=days_until_due,
                        metadata={"order_id": order.id}
                    )
                    
                    # Finalize the invoice
                    stripe_inv = stripe.Invoice.finalize_invoice(stripe_inv.id)
                except Exception as stripe_err:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error("Stripe Invoicing API failure: %s", str(stripe_err))

                # 4. Generate local ReportLab PDF Invoice for client download
                try:
                    pdf_url = generate_invoice_pdf(invoice)
                    invoice.pdf_file_path = pdf_url
                    invoice.pdf_status = 'generated'
                    invoice.save(update_fields=['pdf_file_path', 'pdf_status'])
                except Exception as pdf_err:
                    invoice.pdf_status = 'failed'
                    invoice.save(update_fields=['pdf_status'])
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error("Local PDF Invoice generation failure: %s", str(pdf_err))

            return Response({
                "message": "Wholesale order placed and Stripe invoice triggered successfully.",
                "order": OrderSerializer(order).data,
                "invoice": WholesaleInvoiceSerializer(invoice).data
            }, status=status.HTTP_201_CREATED)

        except Exception as transaction_err:
            return Response({"error": str(transaction_err)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class WholesaleInvoiceListView(ListAPIView):
    serializer_class = WholesaleInvoiceSerializer
    permission_classes = [IsB2BClient]

    def get_queryset(self):
        return WholesaleInvoice.objects.filter(order__user=self.request.user).select_related('order')


class WholesaleInvoiceDownloadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        # Allow B2B owner to download or Admin
        invoice = get_object_or_404(WholesaleInvoice, id=pk)
        
        if not request.user.is_staff and invoice.order.user != request.user:
            return Response({"error": "Unauthorized download request."}, status=status.HTTP_403_FORBIDDEN)

        if invoice.pdf_status != 'generated' or not invoice.pdf_file_path:
            return Response({"error": "Invoice PDF is not available."}, status=status.HTTP_404_NOT_FOUND)

        # Resolve local file path
        filename = os.path.basename(invoice.pdf_file_path)
        local_file_path = os.path.join(settings.MEDIA_ROOT, 'invoices', filename)

        if not os.path.exists(local_file_path):
            raise Http404("PDF invoice file not found on disk.")

        response = FileResponse(open(local_file_path, 'rb'), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response
