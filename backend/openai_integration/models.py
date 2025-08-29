from django.db import models
from core.models import Patient, Doctor


class DocumentAnalysis(models.Model):
    """Track document analysis and summary generation"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='document_analyses')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='document_analyses')
    
    # Document information
    document_name = models.CharField(max_length=255)
    document_type = models.CharField(max_length=100)
    oss_path = models.CharField(max_length=500)  # Alibaba Cloud OSS path
    
    # Analysis results
    raw_content = models.TextField(blank=True, null=True)
    extracted_text = models.TextField(blank=True, null=True)
    analysis_summary = models.TextField(blank=True, null=True)
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('processing', 'Processing'),
            ('completed', 'Completed'),
            ('failed', 'Failed'),
        ],
        default='pending'
    )
    
    # OpenAI API tracking
    openai_request_id = models.CharField(max_length=255, blank=True, null=True)
    tokens_used = models.IntegerField(default=0)
    cost_estimate = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Analysis of {self.document_name} for {self.patient}"


class DischargeSummary(models.Model):
    """Generated discharge summary from document analysis"""
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='discharge_summaries')
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='discharge_summaries')
    
    # Summary content
    admission_date = models.DateField()
    discharge_date = models.DateField()
    primary_diagnosis = models.TextField()
    secondary_diagnoses = models.TextField(blank=True)
    procedures_performed = models.TextField(blank=True)
    medications = models.TextField()
    vital_signs = models.TextField(blank=True)
    lab_results = models.TextField(blank=True)
    imaging_results = models.TextField(blank=True)
    hospital_course = models.TextField()
    discharge_condition = models.CharField(max_length=100)
    discharge_instructions = models.TextField()
    follow_up_plan = models.TextField()
    
    # Complete formatted summary
    formatted_summary = models.TextField(blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=[
            ('draft', 'Draft'),
            ('reviewed', 'Reviewed'),
            ('approved', 'Approved'),
            ('finalized', 'Finalized'),
        ],
        default='draft'
    )
    
    # Metadata
    generated_from_analyses = models.ManyToManyField(DocumentAnalysis, related_name='discharge_summaries')
    openai_request_id = models.CharField(max_length=255, blank=True, null=True)
    tokens_used = models.IntegerField(default=0)
    cost_estimate = models.DecimalField(max_digits=10, decimal_places=4, default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    finalized_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Discharge Summary for {self.patient} - {self.discharge_date}"
