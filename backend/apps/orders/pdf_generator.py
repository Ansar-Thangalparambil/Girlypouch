import os
from decimal import Decimal
from django.conf import settings
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_RIGHT, TA_LEFT, TA_CENTER

def generate_invoice_pdf(wholesale_invoice) -> str:
    """
    Generates a professional corporate B2B PDF invoice for a B2B Wholesale Order.
    Saves it to settings.MEDIA_ROOT/invoices/ and returns the relative media URL.
    """
    order = wholesale_invoice.order
    items = order.items.select_related('pad_component').all()

    # Define directories
    invoices_dir = os.path.join(settings.MEDIA_ROOT, 'invoices')
    os.makedirs(invoices_dir, exist_ok=True)
    
    filename = f"invoice_{wholesale_invoice.id}_{order.id}.pdf"
    file_path = os.path.join(invoices_dir, filename)

    # Calculate financial details
    subtotal = Decimal('0.00')
    item_rows = []
    for item in items:
        line_total = Decimal(str(item.price_at_purchase)) * item.quantity
        subtotal += line_total
        item_rows.append([
            item.pad_component.name,
            f"{item.quantity:,}",
            f"${item.price_at_purchase:.2f}",
            f"${line_total:.2f}"
        ])

    tax_rate = Decimal(str(wholesale_invoice.tax_rate))
    tax_amount = subtotal * (tax_rate / Decimal('100.00'))
    total_amount = subtotal + tax_amount

    # Document setup
    doc = SimpleDocTemplate(
        file_path,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    story = []
    styles = getSampleStyleSheet()

    # Custom styles
    # Branding Palette: Deep Burgundy/Purple (#8B1E4F) and Coral Accent
    primary_color = colors.HexColor('#8B1E4F')
    dark_gray = colors.HexColor('#2D3748')
    light_gray = colors.HexColor('#F7FAFC')
    border_color = colors.HexColor('#E2E8F0')

    title_style = ParagraphStyle(
        'InvoiceTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        textColor=primary_color,
        spaceAfter=15
    )

    company_header_style = ParagraphStyle(
        'CompanyHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        textColor=dark_gray,
        spaceAfter=5
    )

    company_text_style = ParagraphStyle(
        'CompanyText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.HexColor('#4A5568'),
        leading=12
    )

    section_heading_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=primary_color,
        spaceAfter=6
    )

    body_bold_style = ParagraphStyle(
        'BodyBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=dark_gray
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=dark_gray
    )

    table_cell_right_style = ParagraphStyle(
        'TableCellRight',
        parent=table_cell_style,
        alignment=TA_RIGHT
    )

    table_header_right_style = ParagraphStyle(
        'TableHeaderRight',
        parent=table_header_style,
        alignment=TA_RIGHT
    )

    # 1. Header Banner Layout (2 columns: Company Logo/Name | INVOICE metadata)
    header_data = [
        [
            Paragraph("GIRLYPOUCH CORPORATION", company_header_style),
            Paragraph("INVOICE", title_style)
        ],
        [
            Paragraph("123 Corporate Way, Suite 400<br/>New York, NY 10001<br/>billing@girlypouch.com", company_text_style),
            Paragraph(
                f"<b>Invoice #:</b> GP-WHOLE-{wholesale_invoice.id:05d}<br/>"
                f"<b>Date:</b> {order.created_at.strftime('%Y-%m-%d')}<br/>"
                f"<b>Terms:</b> {wholesale_invoice.get_billing_terms_display()}<br/>"
                f"<b>Status:</b> {order.get_status_display()}",
                company_text_style
            )
        ]
    ]

    header_table = Table(header_data, colWidths=[320, 210])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 20))

    # 2. Billing details (Bill From | Bill To)
    billing_data = [
        [
            Paragraph("BILL FROM", section_heading_style),
            Paragraph("BILL TO (CLIENT)", section_heading_style)
        ],
        [
            Paragraph("<b>GirlyPouch Corp.</b><br/>VAT ID: US8877665544<br/>Accounts Receivable", company_text_style),
            Paragraph(
                f"<b>{wholesale_invoice.company_name}</b><br/>"
                f"VAT/Tax ID: {wholesale_invoice.vat_number or 'N/A'}<br/>"
                f"Email: {order.user.email}<br/>"
                f"Billing Address:<br/>{order.user.billing_address or order.shipping_address}",
                company_text_style
            )
        ]
    ]

    billing_table = Table(billing_data, colWidths=[270, 260])
    billing_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    story.append(billing_table)
    story.append(Spacer(1, 25))

    # 3. Itemized Products Table
    table_data = [
        [
            Paragraph("Component Description", table_header_style),
            Paragraph("Quantity", table_header_right_style),
            Paragraph("Unit Price", table_header_right_style),
            Paragraph("Total Price", table_header_right_style)
        ]
    ]

    for row in item_rows:
        table_data.append([
            Paragraph(row[0], table_cell_style),
            Paragraph(row[1], table_cell_right_style),
            Paragraph(row[2], table_cell_right_style),
            Paragraph(row[3], table_cell_right_style)
        ])

    items_table = Table(table_data, colWidths=[240, 90, 100, 100])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('ALIGN', (0,0), (-1,0), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [light_gray, colors.white]),
        ('LINEBELOW', (0,0), (-1,-1), 0.5, border_color),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 15))

    # 4. Totals & Tax summary
    totals_data = [
        [
            Paragraph("", company_text_style),
            Paragraph("Subtotal:", body_bold_style),
            Paragraph(f"${subtotal:.2f}", table_cell_right_style)
        ],
        [
            Paragraph("", company_text_style),
            Paragraph(f"VAT/Tax ({tax_rate:.1f}%):", body_bold_style),
            Paragraph(f"${tax_amount:.2f}", table_cell_right_style)
        ],
        [
            Paragraph("", company_text_style),
            Paragraph("Grand Total Due:", ParagraphStyle('TotalBold', parent=body_bold_style, textColor=primary_color, fontSize=11)),
            Paragraph(f"${total_amount:.2f}", ParagraphStyle('TotalValBold', parent=table_cell_right_style, fontName='Helvetica-Bold', textColor=primary_color, fontSize=11))
        ]
    ]

    totals_table = Table(totals_data, colWidths=[310, 120, 100])
    totals_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('LINEBELOW', (1,2), (2,2), 1.5, primary_color),
    ]))
    story.append(totals_table)
    story.append(Spacer(1, 40))

    # 5. Payment details and Footer
    footer_text = (
        "<b>Payment Instructions:</b> Please remit payment via bank transfer within the agreed terms. "
        "Include invoice number in the reference.<br/>"
        "<b>Bank details:</b> GirlyPouch Corp | Chase Bank | Account: xxxx-xxxx-1234 | Routing: xxxxx5678<br/>"
        "If you have any questions regarding this invoice, contact accounts receivable at billing@girlypouch.com."
    )
    story.append(Paragraph(footer_text, company_text_style))

    # Build document
    doc.build(story)

    # Return the relative URL to download the invoice
    relative_url = f"{settings.MEDIA_URL}invoices/{filename}"
    return relative_url
