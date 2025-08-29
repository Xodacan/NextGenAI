from django.db import models


class Doctor(models.Model):
    """Represents an authenticated doctor (user) identified by Firebase UID or email."""
    # Firebase UID for the doctor (unique identifier from Firebase)
    firebase_uid = models.CharField(max_length=128, unique=True)
    # Optional metadata
    email = models.EmailField(blank=True, null=True)
    display_name = models.CharField(max_length=255, blank=True, null=True)
    institution = models.CharField(max_length=255, blank=True, null=True, help_text="Medical institution where the doctor works")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self) -> str:
        return self.display_name or self.email or self.firebase_uid

    @property
    def is_authenticated(self) -> bool:
        # Required by DRF's IsAuthenticated permission check
        return True


class Patient(models.Model):
    """Patient records scoped to a single doctor."""
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='patients')

    # Doctor's Firebase UID (links patient to the doctor who created them)
    doctor_firebase_uid = models.CharField(max_length=128, null=True, blank=True, help_text="Firebase UID of the doctor who owns this patient")
    
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    admission_date = models.DateField()
    occupant_type = models.CharField(max_length=50, default='Room', help_text="Type of occupant (Room, Bed, etc.)")
    occupant_value = models.CharField(max_length=50, blank=True, help_text="Value of occupant (Room number, Bed number, etc.)")
    status = models.CharField(
        max_length=32,
        choices=(
            ('Active', 'Active'),
            ('Pending Discharge', 'Pending Discharge'),
            ('Discharged', 'Discharged'),
        ),
        default='Active',
    )

    # Store medical documents as a JSON array of objects
    # Example element: {"id": "string", "documentType": "Admission Form", "fileName": "x.pdf", "uploadTimestamp": "iso", "practitionerId": "string", "summary": "..."}
    documents = models.JSONField(default=list, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['doctor']),
            models.Index(fields=['last_name', 'first_name']),
        ]

    def __str__(self) -> str:
        return f"{self.first_name} {self.last_name} ({self.doctor_id})"
    
    def get_occupant_display(self) -> str:
        """Get a human-readable display of the patient's location"""
        if self.occupant_type and self.occupant_value:
            return f"{self.occupant_type} {self.occupant_value}"
        elif self.occupant_type:
            return self.occupant_type
        else:
            return "Unknown"

