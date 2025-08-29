from django.contrib import admin
from .models import Doctor, Patient


@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ("firebase_uid", "email", "display_name", "created_at")
    search_fields = ("firebase_uid", "email", "display_name")


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ("first_name", "last_name", "doctor", "doctor_firebase_uid", "status", "occupant_type", "occupant_value", "admission_date")
    list_filter = ("status", "doctor", "occupant_type")
    search_fields = ("first_name", "last_name", "occupant_value", "doctor_firebase_uid")
