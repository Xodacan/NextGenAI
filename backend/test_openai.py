#!/usr/bin/env python
"""
Test script for OpenAI integration
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'api.settings')
django.setup()

from openai_integration.models import DocumentAnalysis
from openai_integration.services import OpenAIService
from core.models import Patient, Doctor

def test_openai_integration():
    """Test the OpenAI integration with a sample document"""
    
    print("🧪 Testing OpenAI Integration...")
    
    try:
        # Get the first doctor and patient
        doctor = Doctor.objects.first()
        patient = Patient.objects.first()
        
        if not doctor or not patient:
            print("❌ No doctor or patient found in database")
            return
        
        print(f"👨‍⚕️ Doctor: {doctor.display_name or doctor.email}")
        print(f"👤 Patient: {patient.first_name} {patient.last_name}")
        
        # Create a test document analysis
        document_analysis = DocumentAnalysis.objects.create(
            patient=patient,
            doctor=doctor,
            document_name="Test Radiology Report",
            document_type="Radiology Report",
            oss_path="doctors/2W7tCyhiohaP0RVZFqh32YyQjok1/patients/1/Radiology Report/9759b55e-fea8-4b49-8689-d6482f9749eb.pdf",
            status='pending'
        )
        
        print(f"📄 Created document analysis: {document_analysis.id}")
        
        # Test OpenAI service
        openai_service = OpenAIService()
        
        print("🤖 Starting document analysis...")
        success = openai_service.analyze_document(document_analysis)
        
        if success:
            print("✅ Document analysis completed successfully!")
            print(f"📊 Status: {document_analysis.status}")
            print(f"📝 Summary: {document_analysis.analysis_summary[:200]}...")
        else:
            print("❌ Document analysis failed")
            print(f"📊 Status: {document_analysis.status}")
        
        return success
        
    except Exception as e:
        print(f"❌ Error testing OpenAI integration: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_openai_integration()
    sys.exit(0 if success else 1)
