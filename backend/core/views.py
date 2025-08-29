from django.shortcuts import render
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
from django.utils import timezone
import os

from .models import Patient
from .serializers import PatientSerializer
from .services import DocumentProcessingService
from .ollama_service import OllamaService
from firebase_auth.authentication import FirebaseAuthentication


# Create your views here.


@api_view(['GET'])
def health_check(request):
    """
    Simple health check endpoint
    """
    return Response({
        'status': 'healthy',
        'message': 'Django API is running successfully!',
        'framework': 'Django REST Framework'
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
def hello_world(request):
    """
    Simple hello world endpoint
    """
    return Response({
        'message': 'Hello from Django!',
        'data': {
            'framework': 'Django',
            'version': '5.2.5',
            'api': 'REST Framework'
        }
    }, status=status.HTTP_200_OK)


class PatientListCreateView(generics.ListCreateAPIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PatientSerializer

    def get_queryset(self):
        doctor = self.request.user
        return Patient.objects.filter(doctor=doctor).order_by('last_name', 'first_name')

    def perform_create(self, serializer):
        doctor = self.request.user
        serializer.save(doctor=doctor)


class PatientRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = PatientSerializer

    def get_queryset(self):
        doctor = self.request.user
        return Patient.objects.filter(doctor=doctor)
    
    def destroy(self, request, *args, **kwargs):
        """Delete a patient and all associated data"""
        try:
            patient = self.get_object()
            
            # Delete associated summary files if they exist
            if patient.documents:
                for doc in patient.documents:
                    if doc.get('documentType') == 'Discharge Summary' and doc.get('url'):
                        try:
                            url_path = doc['url']
                            if url_path.startswith('/media/'):
                                file_path = url_path.replace('/media/', '')
                                full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                                if os.path.exists(full_path):
                                    os.remove(full_path)
                                    print(f"Deleted summary file: {full_path}")
                        except Exception as e:
                            print(f"Warning: Could not delete summary file: {e}")
            
            # Delete the patient
            patient.delete()
            
            return Response({
                'message': 'Patient deleted successfully',
                'patientId': kwargs['pk']
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'detail': 'Error deleting patient.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PatientAddDocumentView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # If a file is provided, save it to media and store a URL
        upload_file = request.FILES.get('file')
        documentType = request.data.get('documentType')
        fileName = request.data.get('fileName') or (upload_file.name if upload_file else None)
        practitionerId = request.data.get('practitionerId')
        uploadTimestamp = request.data.get('uploadTimestamp') or None

        doc_entry = {
            'documentType': documentType or '',
            'fileName': fileName or '',
            'practitionerId': practitionerId or '',
            'uploadTimestamp': uploadTimestamp or '',
        }

        if upload_file:
            folder = os.path.join('patients', str(patient.id))
            path = default_storage.save(os.path.join(folder, upload_file.name), ContentFile(upload_file.read()))
            doc_entry['url'] = settings.MEDIA_URL + path

        docs = list(patient.documents or [])
        docs.append(doc_entry)
        patient.documents = docs
        patient.save(update_fields=['documents', 'updated_at'])
        return Response({'documents': patient.documents}, status=status.HTTP_200_OK)


class PatientDeleteDocumentView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, index):
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        docs = list(patient.documents or [])
        if not isinstance(index, int) or index < 0 or index >= len(docs):
            return Response({'detail': 'Invalid document index.'}, status=status.HTTP_400_BAD_REQUEST)

        # Remove document at index
        docs.pop(index)
        patient.documents = docs
        patient.save(update_fields=['documents', 'updated_at'])
        return Response({'documents': patient.documents}, status=status.HTTP_200_OK)


class GenerateSummaryView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        """
        This endpoint processes all documents for a patient and generates a summary using AI.
        """
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Get patient documents
            patient_docs = patient.documents or []
            
            # Process documents for AI analysis
            ai_ready_data = DocumentProcessingService.prepare_for_ai_analysis({
                'patientId': str(patient.id),
                'documents': patient_docs
            })
            
            # Get template content
            template_content = ai_ready_data.get('dischargeSummaryTemplate', {}).get('templateContent', '')
            
            # Generate summary using Ollama
            summary_content = OllamaService.generate_patient_summary(ai_ready_data, template_content)
            
            # Create summary file
            patient_name = f"{patient.first_name}_{patient.last_name}"
            summary_filename = OllamaService.create_summary_file(patient_name, summary_content)
            
            # Add summary file to patient documents
            summary_doc = {
                'documentType': 'Discharge Summary',
                'fileName': summary_filename,
                'uploadTimestamp': timezone.now().isoformat(),
                'url': f'/media/patients/summaries/{summary_filename}',
                'summary': summary_content
            }
            
            # Add to patient documents
            docs = patient.documents or []
            docs.append(summary_doc)
            patient.documents = docs
            patient.save()
            
            summary_response = {
                'message': 'Discharge summary generated successfully using Ollama',
                'patientId': str(patient.id),
                'summaryFile': {
                    'filename': summary_filename,
                    'content': summary_content[:500] + '...' if len(summary_content) > 500 else summary_content,
                    'fullContent': summary_content
                },
                'status': 'success',
                'details': [
                    'Summary generated successfully using Ollama',
                    'Summary file created and added to patient documents',
                    'Summary available in summaries list section'
                ]
            }
            
            return Response(summary_response, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'detail': 'Error generating summary with Ollama.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UpdateSummaryView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request, pk):
        """
        Update a patient's discharge summary with edited content and status
        """
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            # Get the updated summary data
            final_content = request.data.get('finalContent')
            status = request.data.get('status')
            approved_by = request.data.get('approvedBy')
            approval_timestamp = request.data.get('approvalTimestamp')
            
            # Find the discharge summary document
            docs = patient.documents or []
            summary_doc = None
            summary_index = None
            
            for i, doc in enumerate(docs):
                if doc.get('documentType') == 'Discharge Summary':
                    summary_doc = doc
                    summary_index = i
                    break
            
            if not summary_doc:
                return Response({'detail': 'No discharge summary found for this patient.'}, status=status.HTTP_404_NOT_FOUND)
            
            # Update the summary document
            if final_content is not None:
                summary_doc['finalContent'] = final_content
            if status is not None:
                summary_doc['status'] = status
            if approved_by is not None:
                summary_doc['approvedBy'] = approved_by
            if approval_timestamp is not None:
                summary_doc['approvalTimestamp'] = approval_timestamp
            
            # Update the document in the patient's documents array
            docs[summary_index] = summary_doc
            patient.documents = docs
            patient.save()
            
            # Also update the summary file if finalContent is provided
            if final_content and summary_doc.get('url'):
                try:
                    # Extract filename from URL
                    url_path = summary_doc['url']
                    if url_path.startswith('/media/'):
                        file_path = url_path.replace('/media/', '')
                        full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                        
                        # Write the updated content to the file
                        with open(full_path, 'w', encoding='utf-8') as f:
                            f.write(final_content)
                        
                        print(f"Updated summary file: {full_path}")
                except Exception as e:
                    print(f"Warning: Could not update summary file: {e}")
            
            return Response({
                'message': 'Summary updated successfully',
                'summary': {
                    'id': f'summary-{patient.id}',
                    'patientId': str(patient.id),
                    'status': summary_doc.get('status', 'Draft'),
                    'finalContent': summary_doc.get('finalContent'),
                    'approvedBy': summary_doc.get('approvedBy'),
                    'approvalTimestamp': summary_doc.get('approvalTimestamp')
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'detail': 'Error updating summary.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
