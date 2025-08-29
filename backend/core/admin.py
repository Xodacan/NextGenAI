from django.contrib import admin
from .models import Doctor, Patient


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("firebase_uid", "email", "display_name", "created_at")
    search_fields = ("firebase_uid", "email", "display_name")


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "doctor", "status", "room_number", "admission_date")
    list_filter = ("status", "doctor")
    search_fields = ("first_name", "last_name", "room_number")
