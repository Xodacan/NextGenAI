from django.shortcuts import render
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
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
        try:
            doctor = self.request.user
            print(f"Getting patients for doctor: {doctor}")
            queryset = Patient.objects.filter(doctor=doctor).order_by('last_name', 'first_name')
            print(f"Found {queryset.count()} patients")
            return queryset
        except Exception as e:
            print(f"Error in get_queryset: {e}")
            import traceback
            traceback.print_exc()
            return Patient.objects.none()

    def perform_create(self, serializer):
        try:
            doctor = self.request.user
            print(f"Creating patient for doctor: {doctor}")
            serializer.save(doctor=doctor)
        except Exception as e:
            print(f"Error in perform_create: {e}")
            import traceback
            traceback.print_exc()
            raise


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
                    if doc.get('documentType') == 'Discharge Summary':
                        try:
                            # Delete from OSS if available
                            if doc.get('oss_path'):
                                from alibaba_cloud.services.oss_service import AlibabaOSSService
                                oss_service = AlibabaOSSService()
                                if oss_service.delete_document(doc['oss_path']):
                                    print(f"Deleted summary file from OSS: {doc['oss_path']}")
                                else:
                                    print(f"Warning: Could not delete summary file from OSS: {doc['oss_path']}")
                            
                            # Also delete local file if it exists
                            if doc.get('url') and doc['url'].startswith('/media/'):
                                url_path = doc['url']
                                file_path = url_path.replace('/media/', '')
                                full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                                if os.path.exists(full_path):
                                    os.remove(full_path)
                                    print(f"Deleted local summary file: {full_path}")
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
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        # Check if this is a document entry from Alibaba Cloud OSS upload
        if 'document' in request.data:
            # This is a document entry from OSS upload
            doc_entry = request.data['document']
            
            # Validate required fields
            required_fields = ['documentType', 'fileName', 'practitionerId', 'uploadTimestamp']
            for field in required_fields:
                if field not in doc_entry:
                    return Response({'detail': f'Missing required field: {field}'}, status=status.HTTP_400_BAD_REQUEST)
            
            # Update the URL to use backend proxy instead of direct OSS URL
            if 'oss_path' in doc_entry and doc_entry['oss_path']:
                # Create backend proxy URL for frontend access
                doc_entry['url'] = f'/api/patients/{pk}/documents/{len(patient.documents or [])}/content/'
                # Keep the original OSS URL for backend processing
                doc_entry['oss_url'] = doc_entry.get('url', '')  # Store original URL if it exists
            
            docs = list(patient.documents or [])
            docs.append(doc_entry)
            patient.documents = docs
            patient.save(update_fields=['documents', 'updated_at'])
            return Response({'documents': patient.documents}, status=status.HTTP_200_OK)
        
        # Legacy file upload handling (for backward compatibility)
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

        # Get the document to be deleted
        document_to_delete = docs[index]
        
        # If the document has an OSS path, delete it from OSS as well
        if 'oss_path' in document_to_delete and document_to_delete['oss_path']:
            try:
                from alibaba_cloud.services.oss_service import AlibabaOSSService
                oss_service = AlibabaOSSService()
                oss_service.delete_document(document_to_delete['oss_path'])
            except Exception as e:
                # Log the error but don't fail the deletion
                print(f"Failed to delete from OSS: {str(e)}")

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
            
            # Create summary file and upload to OSS
            patient_name = f"{patient.first_name}_{patient.last_name}"
            doctor_id = request.user.firebase_uid
            summary_result = OllamaService.create_summary_file(patient_name, summary_content, doctor_id, str(patient.id))
            
            # Add summary file to patient documents
            summary_doc = {
                'documentType': 'Discharge Summary',
                'fileName': summary_result['filename'],
                'uploadTimestamp': timezone.now().isoformat(),
                'url': summary_result['url'],
                'oss_path': summary_result['oss_path'],
                'summary': summary_content,
                'file_size': summary_result['file_size']
            }
            
            # Add to patient documents
            docs = patient.documents or []
            docs.append(summary_doc)
            patient.documents = docs
            patient.save()
            
            summary_response = {
                'message': 'Discharge summary generated successfully using Ollama and stored in OSS',
                'patientId': str(patient.id),
                'summaryFile': {
                    'filename': summary_result['filename'],
                    'content': summary_content[:500] + '...' if len(summary_content) > 500 else summary_content,
                    'fullContent': summary_content,
                    'oss_path': summary_result['oss_path'],
                    'url': summary_result['url'],
                    'file_size': summary_result['file_size']
                },
                'status': 'success',
                'details': [
                    'Summary generated successfully using Ollama',
                    'Summary file uploaded to Alibaba Cloud OSS',
                    'Summary available in summaries list section',
                    f'OSS Path: {summary_result["oss_path"]}' if summary_result['oss_path'] else 'Stored locally (OSS upload failed)'
                ]
            }
            
            return Response(summary_response, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'detail': 'Error generating summary with Ollama.',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DocumentContentView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk, document_index):
        """
        Get document content from OSS and return it to the frontend.
        This endpoint proxies OSS content to avoid CORS issues.
        """
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            docs = patient.documents or []
            if not isinstance(document_index, int) or document_index < 0 or document_index >= len(docs):
                return Response({'detail': 'Invalid document index.'}, status=status.HTTP_400_BAD_REQUEST)

            document = docs[document_index]
            
            # Check if document has OSS path
            if not document.get('oss_path'):
                return Response({'detail': 'Document not found in OSS.'}, status=status.HTTP_404_NOT_FOUND)

            # Import OSS service
            from alibaba_cloud.services.oss_service import AlibabaOSSService
            oss_service = AlibabaOSSService()
            
            # Get document content from OSS
            try:
                oss_response = oss_service.bucket.get_object(document['oss_path'])
                content = oss_response.read()
                
                # Determine content type based on file extension
                file_extension = document['fileName'].lower().split('.')[-1]
                content_type = 'text/plain'
                
                if file_extension == 'pdf':
                    content_type = 'application/pdf'
                elif file_extension in ['doc', 'docx']:
                    content_type = 'application/msword'
                elif file_extension in ['jpg', 'jpeg']:
                    content_type = 'image/jpeg'
                elif file_extension == 'png':
                    content_type = 'image/png'
                
                # Return content with appropriate headers
                response = Response(content, content_type=content_type)
                response['Content-Disposition'] = f'inline; filename="{document["fileName"]}"'
                return response
                
            except Exception as e:
                print(f"Error fetching document from OSS: {str(e)}")
                return Response({'detail': 'Error fetching document content.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            return Response({'detail': 'Error processing request.'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


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
            summary_status = request.data.get('status')
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
            if summary_status is not None:
                summary_doc['status'] = summary_status
            if approved_by is not None:
                summary_doc['approvedBy'] = approved_by
            if approval_timestamp is not None:
                summary_doc['approvalTimestamp'] = approval_timestamp
            
            # Update the document in the patient's documents array
            docs[summary_index] = summary_doc
            patient.documents = docs
            patient.save()
            
            # Also update the summary file if finalContent is provided
            if final_content and summary_doc.get('oss_path'):
                try:
                    # Update the file in OSS
                    from alibaba_cloud.services.oss_service import AlibabaOSSService
                    oss_service = AlibabaOSSService()
                    
                    # Convert content to bytes
                    content_bytes = final_content.encode('utf-8')
                    
                    # Delete the old file and upload the new one
                    if oss_service.delete_document(summary_doc['oss_path']):
                        # Upload the updated content
                        upload_result = oss_service.upload_medical_document(
                            file_content=content_bytes,
                            file_name=summary_doc['fileName'],
                            doctor_id=request.user.firebase_uid,
                            patient_id=str(patient.id),
                            document_type="discharge_summaries"
                        )
                        
                        # Update the document with new OSS information
                        summary_doc['oss_path'] = upload_result['oss_path']
                        summary_doc['url'] = upload_result['presigned_url']
                        summary_doc['file_size'] = upload_result['file_size']
                        
                        # Save the updated document
                        docs[summary_index] = summary_doc
                        patient.documents = docs
                        patient.save()
                        
                        print(f"Updated summary file in OSS: {upload_result['oss_path']}")
                    else:
                        print(f"Warning: Could not delete old summary file from OSS")
                        
                except Exception as e:
                    print(f"Warning: Could not update summary file in OSS: {e}")
                    # Fallback to local update if OSS fails
                    if summary_doc.get('url') and summary_doc['url'].startswith('/media/'):
                        try:
                            url_path = summary_doc['url']
                            file_path = url_path.replace('/media/', '')
                            full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                            
                            with open(full_path, 'w', encoding='utf-8') as f:
                                f.write(final_content)
                            
                            print(f"Fallback: Updated summary file locally: {full_path}")
                        except Exception as fallback_error:
                            print(f"Warning: Could not update summary file locally: {fallback_error}")
            
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
