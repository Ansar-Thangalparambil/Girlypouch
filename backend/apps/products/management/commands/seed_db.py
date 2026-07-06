from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from apps.products.models import PadComponent, KitProduct

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with initial users, pad components, and kit products."

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Starting database seed..."))
        
        try:
            with transaction.atomic():
                # 1. Seed Users
                self.stdout.write("Seeding Users...")
                
                # Superuser
                if not User.objects.filter(username='admin').exists():
                    User.objects.create_superuser(
                        username='admin',
                        email='admin@girlypouch.com',
                        password='admin123',
                        is_b2b=False
                    )
                    self.stdout.write(self.style.SUCCESS("Created Superuser: admin / admin123"))
                else:
                    self.stdout.write("Superuser 'admin' already exists.")

                # D2C Customer
                if not User.objects.filter(username='customer').exists():
                    User.objects.create_user(
                        username='customer',
                        email='customer@example.com',
                        password='password123',
                        is_b2b=False,
                        shipping_address="123 D2C Ave, California, US",
                        billing_address="123 D2C Ave, California, US"
                    )
                    self.stdout.write(self.style.SUCCESS("Created D2C Customer: customer / password123"))
                else:
                    self.stdout.write("Customer 'customer' already exists.")

                # B2B Corporate Client
                if not User.objects.filter(username='b2b_client').exists():
                    User.objects.create_user(
                        username='b2b_client',
                        email='client@corporate.com',
                        password='password123',
                        is_b2b=True,
                        company_name="Wellness Bulk Distributors LLC",
                        vat_number="VAT9988776655",
                        shipping_address="456 Logistics Blvd, warehouse 5, Chicago, IL 60609",
                        billing_address="789 Financial Plaza, Suite 900, New York, NY 10005"
                    )
                    self.stdout.write(self.style.SUCCESS("Created B2B Corporate Client: b2b_client / password123"))
                else:
                    self.stdout.write("B2B Corporate Client 'b2b_client' already exists.")

                # Ensure all B2B users have a CompanyProfile
                for b2b_user in User.objects.filter(is_b2b=True, company_profile__isnull=True):
                    b2b_user.save()
                    self.stdout.write(f"Auto-generated CompanyProfile for B2B user: {b2b_user.username}")


                # 2. Seed Pad Components
                self.stdout.write("Seeding Pad Components...")
                components = [
                    {
                        "name": "Gym Pad",
                        "component_type": "gym_pad",
                        "stock_level": 1000,
                        "low_stock_threshold": 50,
                        "wholesale_price": 0.50
                    },
                    {
                        "name": "Regular Pad",
                        "component_type": "regular_pad",
                        "stock_level": 1200,
                        "low_stock_threshold": 60,
                        "wholesale_price": 0.40
                    },
                    {
                        "name": "Night Pad",
                        "component_type": "night_pad",
                        "stock_level": 800,
                        "low_stock_threshold": 40,
                        "wholesale_price": 0.60
                    },
                    {
                        "name": "Panty Liner",
                        "component_type": "panty_liner",
                        "stock_level": 1500,
                        "low_stock_threshold": 80,
                        "wholesale_price": 0.30
                    }
                ]

                for comp in components:
                    obj, created = PadComponent.objects.update_or_create(
                        name=comp["name"],
                        defaults={
                            "component_type": comp["component_type"],
                            "stock_level": comp["stock_level"],
                            "low_stock_threshold": comp["low_stock_threshold"],
                            "wholesale_price": comp["wholesale_price"]
                        }
                    )
                    action = "Created" if created else "Updated"
                    self.stdout.write(f"{action} Pad Component: {obj.name}")

                # 3. Seed Kit Products
                self.stdout.write("Seeding Kit Products...")
                kits = [
                    {
                        "name": "Emergency Kit",
                        "slug": "emergency-kit",
                        "description": "A compact, travel-friendly kit designed for unexpected moments. Customizes exactly 5 items.",
                        "price": 15.00,
                        "max_components": 5,
                        "is_subscription_only": False
                    },
                    {
                        "name": "Home Essential Kit",
                        "slug": "home-essential-kit",
                        "description": "Our flagship 10-pack period customization pack designed for home storage. Customizes exactly 10 items.",
                        "price": 29.99,
                        "max_components": 10,
                        "is_subscription_only": True
                    }
                ]

                for kit in kits:
                    obj, created = KitProduct.objects.update_or_create(
                        name=kit["name"],
                        defaults={
                            "slug": kit["slug"],
                            "description": kit["description"],
                            "price": kit["price"],
                            "max_components": kit["max_components"],
                            "is_subscription_only": kit["is_subscription_only"]
                        }
                    )
                    action = "Created" if created else "Updated"
                    self.stdout.write(f"{action} Kit Product: {obj.name}")

            self.stdout.write(self.style.SUCCESS("Database seeding completed successfully!"))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during seeding database: {str(e)}"))
