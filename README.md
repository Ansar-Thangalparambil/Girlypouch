# 🚀 GirlyPouch Platform

Welcome to the **GirlyPouch** platform architecture repository. This project is a custom-coded, enterprise-grade e-commerce application engineered for a dual-model operation: Direct-to-Consumer (D2C) customizable product subscriptions and Business-to-Business (B2B) bulk wholesale invoicing.

The platform utilizes a **decoupled (headless) architecture** built for speed, robust security, and high organic search discoverability (SEO).

---

## 🛠️ Tech Stack & Infrastructure

The architecture is divided into two main services coordinated seamlessly via containerization:

### 1. Storefront Front-End (`/frontend`)
*   **Framework:** Next.js (React Framework)
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS
*   **Core Value:** Uses Server-Side Rendering (SSR) to deliver blazing-fast load times for customers and ensures search engines can fully crawl and rank our product pages and "Period Awareness Blog."

### 2. Core Engine Back-End (`/backend`)
*   **Framework:** Python Django + Django REST Framework (DRF)
*   **Database:** PostgreSQL
*   **Core Value:** Django provides an out-of-the-box, enterprise-secure administrative dashboard. Its powerful object-relational mapping (ORM) ensures that multi-channel sales (subscriptions and bulk wholesale) sync perfectly across a single master inventory pool.

### 3. Integrated Services
*   **Payments & Subscriptions:** Stripe API (Stripe Billing for 28-day loops, Stripe Invoicing for automated wholesale PDFs).
*   **Communications:** Resend / SendGrid API for transactional email delivery.

---

## 🏗️ Repository Architecture

This repository is organized as a unified monorepo:

```text
girlypouch-platform/
├── backend/                  # Django Core Engine & API Gateway
│   ├── core/                 # Settings, routing, and WSGI/ASGI configurations
│   ├── apps/                 # Modular, isolated business domains (users, products, etc.)
│   ├── static/ & templates/  # Back-office admin panel assets
│   └── Requirements.txt      # Python package dependencies
├── frontend/                 # Next.js Storefront Frontend
│   ├── src/app/              # App Router (pages: /customize, /blog, /account, /checkout)
│   ├── src/components/       # Reusable UI architecture (buttons, inputs, cards)
│   └── package.json          # JavaScript dependencies
├── docker-compose.yml        # Main multi-container orchestrator
└── README.md                 # System documentation & developer onboarding