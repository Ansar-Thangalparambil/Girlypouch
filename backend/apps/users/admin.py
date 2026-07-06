from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from apps.users.models import User

class CustomUserAdmin(UserAdmin):
    model = User
    fieldsets = UserAdmin.fieldsets + (
        ('B2B wholesale info', {
            'fields': ('is_b2b', 'company_name', 'vat_number', 'shipping_address', 'billing_address')
        }),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('B2B wholesale info', {
            'fields': ('is_b2b', 'company_name', 'vat_number', 'shipping_address', 'billing_address')
        }),
    )
    list_display = ['username', 'email', 'is_b2b', 'is_staff']

admin.site.register(User, CustomUserAdmin)
