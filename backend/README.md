# ⚙️ GirlyPouch Core Backend Engine

Welcome to the **GirlyPouch Core Backend Engine** documentation. This service is a decoupled headless engine powered by **Python Django** and **Django REST Framework (DRF)**. It interfaces with a **PostgreSQL** database to manage Direct-to-Consumer (D2C) subscription logic, Business-to-Business (B2B) wholesale transactions, Stripe billing gateways, and ReportLab PDF invoice generation.

---

## 🛠️ Technology Stack & Dependencies

* **Web Framework:** Django 5.2+ & Django REST Framework (DRF)
* **Database:** PostgreSQL (with `psycopg2-binary` connector)
* **Payments & Billing:** Stripe Python SDK
* **Invoicing:** ReportLab PDF library
* **Authentication:** Headless Token Authentication (`rest_framework.authtoken`)
* **API Documentation:** OpenAPI 3.0 & Swagger UI (`drf-spectacular`)

---

## 📁 Repository Structure

```text
backend/
├── apps/
│   ├── users/            # Custom User Profile Model, auth tokens, registration, profiles
│   ├── products/         # PadComponent & KitProduct inventory catalogs and seeder utility
│   ├── subscriptions/    # D2C customizations, Stripe Checkout integration, and webhook services
│   └── orders/           # D2C/B2B orders, ReportLab PDF Invoice generator, and API endpoints
├── core/                 # Settings, base URL routing, and WSGI/ASGI configurations
├── media/                # Dynamic uploads directory (e.g., generated B2B wholesale PDFs)
├── staticfiles/          # Compiled admin panel stylesheets
├── manage.py             # Django admin CLI utility
├── requirements.txt      # Python library dependencies
└── README.md             # This document (Backend documentation)
```

---

## 🔑 Database Seeding & Accounts

We provide a custom seeder command to automatically populate the PostgreSQL database. Running `python manage.py seed_db` inserts standard product catalogs and creates the following test credentials:

### 👤 Default User Accounts
* **Admin / Staff Dashboard:**
  * **Username:** `admin` | **Password:** `admin123`
  * **Link:** [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/)
* **D2C Customer Account:**
  * **Username:** `customer` | **Password:** `password123`
* **B2B Corporate Account:**
  * **Username:** `b2b_client` | **Password:** `password123`
  * *Associated Metadata:* Company Name, VAT / Tax ID, Shipping Address, Billing Address.

### 📦 Seeded Catalog Values
* **Pad Components:** Gym Pad, Regular Pad, Night Pad, Panty Liner (complete with stock levels and wholesale prices).
* **Kits:** 
  * *Emergency Kit:* 5-pack, available for one-off purchase or subscription.
  * *Home Essential Kit:* 10-pack, subscription-only customization.

---

## 🔗 Core Workflows & Logic

### 1. Stripe Checkout & webhook Failsafe (D2C Subscriptions)
```mermaid
sequenceDiagram
    participant Client
    participant DRF API
    participant Stripe
    participant Webhook Receiver

    Client->>DRF API: POST /api/subscriptions/ (Create customization pack)
    DRF API-->>Client: Returns paused Subscription ID
    Client->>DRF API: POST /api/subscriptions/create-checkout-session/
    DRF API->>Stripe: Create Stripe Checkout Session (metadata: subscription_id)
    DRF API-->>Client: Returns Stripe Checkout URL
    Client->>Stripe: Complete payment page
    Stripe->>Webhook Receiver: invoice.payment_succeeded (stripe_subscription_id)
    Note over Webhook Receiver: Webhook checks local DB for stripe_id.<br/>If missing (race condition), webhook queries<br/>Stripe API for subscription metadata, links<br/>local subscription, and creates fulfillment Order!
```

### 2. Automated Corporate Invoicing (B2B Wholesale)
* Wholesale orders are restricted to users with `is_b2b=True`.
* Bulk orders check component stock levels and immediately decrement inventory upon creation under database-locked row control (`select_for_update`) to prevent race conditions.
* An elegant corporate invoice is generated using **ReportLab** containing:
  * Company logo and header
  * Corporate client VAT numbers and billing terms (e.g., Net-30)
  * Itemized line-cost tables
  * Automated 20% VAT tax calculations
* Invoice PDFs are stored securely on the filesystem and can only be downloaded by the corporate owner or staff administrators.

---

## 📖 API Documentation Gateway

Our APIs are fully documented under the OpenAPI 3.0 standard. You can test and inspect them using the following interactive gateways:

* 🛠️ **Swagger UI:** [http://127.0.0.1:8000/api/schema/swagger-ui/](http://127.0.0.1:8000/api/schema/swagger-ui/)
* 📖 **ReDoc Documentation:** [http://127.0.0.1:8000/api/schema/redoc/](http://127.0.0.1:8000/api/schema/redoc/)
* 📄 **Raw OpenAPI Schema (JSON):** [http://127.0.0.1:8000/api/schema/](http://127.0.0.1:8000/api/schema/)

---

## ⚙️ Local Development Commands

### 1. Set Up Environment Variables (`.env`)
Make sure your `.env` contains the proper local PostgreSQL database credentials:
```env
DATABASE_URL=postgres://postgres:izan%40916@127.0.0.1:5433/girlypouch
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Apply Schema & Seed Database
```bash
# Generate and execute migrations
python manage.py makemigrations users products
python manage.py migrate

# Seed catalog & test users
python manage.py seed_db

# Collect Django admin static styles
python manage.py collectstatic --noinput
```

### 3. Run Development Server
```bash
python manage.py runserver
```

### 4. Execute Unit Tests
```bash
python manage.py test
```
