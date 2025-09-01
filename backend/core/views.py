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
            
            # Delete ALL associated documents from OSS
            if patient.documents:
                from alibaba_cloud.services.oss_service import AlibabaOSSService
                oss_service = AlibabaOSSService()
                
                deleted_count = 0
                failed_count = 0
                
                for doc in patient.documents:
                    try:
                        # Delete from OSS if available
                        if doc.get('oss_path'):
                            if oss_service.delete_document(doc['oss_path']):
                                print(f"✅ Deleted document from OSS: {doc['oss_path']}")
                                deleted_count += 1
                            else:
                                print(f"⚠️  Warning: Could not delete document from OSS: {doc['oss_path']}")
                                failed_count += 1
                        else:
                            print(f"⚠️  No OSS path found for document: {doc.get('fileName', 'Unknown')}")
                            
                        # Also delete local file if it exists (legacy support)
                        if doc.get('url') and doc['url'].startswith('/media/'):
                            url_path = doc['url']
                            file_path = url_path.replace('/media/', '')
                            full_path = os.path.join(settings.MEDIA_ROOT, file_path)
                            if os.path.exists(full_path):
                                os.remove(full_path)
                                print(f"✅ Deleted local file: {full_path}")
                                
                    except Exception as e:
                        print(f"❌ Error deleting document {doc.get('fileName', 'Unknown')}: {e}")
                        failed_count += 1
                
                print(f"📊 OSS Cleanup Summary: {deleted_count} deleted, {failed_count} failed")
            
            # Delete the patient
            patient.delete()
            
            return Response({
                'message': 'Patient deleted successfully',
                'patientId': kwargs['pk'],
                'ossCleanup': {
                    'deleted': deleted_count if patient.documents else 0,
                    'failed': failed_count if patient.documents else 0
                }
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

        # Handle file upload using new document processor
        uploaded_file = request.FILES.get('file')
        document_type = request.data.get('documentType', 'Medical Record')
        
        if not uploaded_file:
            return Response({'detail': 'No file provided.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Use new document upload service
            from .document_processor import DocumentUploadService
            
            doctor_id = request.user.firebase_uid
            
            # Upload document using new system
            upload_result = DocumentUploadService.upload_document(
                uploaded_file=uploaded_file,
                doctor_id=doctor_id,
                patient_id=str(pk),
                document_type=document_type
            )
            
            if not upload_result['success']:
                return Response({
                    'detail': upload_result['message'],
                    'error': upload_result.get('error')
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Get document metadata
            document = upload_result['document']
            
            # Add to patient documents
            docs = patient.documents or []
            
            # Update the URL with the correct index
            document['url'] = f'/api/patients/{pk}/documents/{len(docs)}/content/'
            
            # Add to documents list
            docs.append(document)
            patient.documents = docs
            patient.save(update_fields=['documents', 'updated_at'])

            return Response({
                'message': upload_result['message'], 
                'document': document,
                'documents': patient.documents,
                'processingInfo': {
                    'fileCategory': document.get('viewerStrategy'),
                    'hasTextContent': document.get('hasTextContent', False),
                    'contentType': document.get('contentType'),
                    'fileSize': document.get('fileSize')
                }
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response({
                'detail': f'Upload failed: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PatientDeleteDocumentView(APIView):
    authentication_classes = [FirebaseAuthentication]
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk, document_index):
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        docs = list(patient.documents or [])
        if not isinstance(document_index, int) or document_index < 0 or document_index >= len(docs):
            return Response({'detail': 'Invalid document index.'}, status=status.HTTP_400_BAD_REQUEST)

        # Get the document to be deleted
        document_to_delete = docs[document_index]
        
        # If the document has an OSS path, delete it from OSS as well
        if 'oss_path' in document_to_delete and document_to_delete['oss_path']:
            try:
                from alibaba_cloud.services.oss_service import AlibabaOSSService
                oss_service = AlibabaOSSService()
                if oss_service.delete_document(document_to_delete['oss_path']):
                    print(f"✅ Deleted document from OSS: {document_to_delete['oss_path']}")
                else:
                    print(f"⚠️  Failed to delete document from OSS: {document_to_delete['oss_path']}")
            except Exception as e:
                # Log the error but don't fail the deletion
                print(f"❌ Error deleting from OSS: {str(e)}")

        # Remove document at index
        docs.pop(document_index)
        
        # Update URLs for remaining documents to maintain correct indices
        for i, doc in enumerate(docs):
            if doc.get('url') and '/documents/' in doc['url'] and '/content/' in doc['url']:
                # Update URL to reflect new index
                doc['url'] = f'/api/patients/{pk}/documents/{i}/content/'
                print(f"🔄 Updated document {i} URL to: {doc['url']}")
        
        patient.documents = docs
        patient.save(update_fields=['documents', 'updated_at'])
        
        print(f"✅ Document {document_index} deleted from patient {pk}")
        print(f"📊 Remaining documents: {len(docs)}")
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
            print(f"📄 Processing {len(patient_docs)} documents for patient {pk}")
            
            # Process documents for AI analysis
            try:
                ai_ready_data = DocumentProcessingService.prepare_for_ai_analysis({
                    'patientId': str(patient.id),
                    'documents': patient_docs
                })
                print(f"✅ AI data prepared successfully: {ai_ready_data.keys()}")
            except Exception as doc_error:
                print(f"❌ Error preparing AI data: {doc_error}")
                return Response({
                    'detail': 'Error preparing documents for AI analysis.',
                    'error': str(doc_error)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Get template content
            template_content = ai_ready_data.get('dischargeSummaryTemplate', {}).get('templateContent', '')
            print(f"📋 Template content length: {len(template_content) if template_content else 0}")
            
            # Generate summary using Ollama
            try:
                print(f"🤖 Calling Ollama service...")
                summary_content = OllamaService.generate_patient_summary(ai_ready_data, template_content)
                print(f"✅ Ollama summary generated: {len(summary_content) if summary_content else 0} characters")
                
                if not summary_content or summary_content.startswith("Error generating summary"):
                    print(f"❌ Ollama returned error: {summary_content}")
                    return Response({
                        'detail': 'Ollama service returned an error.',
                        'error': summary_content
                    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                    
            except Exception as ollama_error:
                print(f"❌ Error calling Ollama service: {ollama_error}")
                return Response({
                    'detail': 'Error calling Ollama service.',
                    'error': str(ollama_error)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
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
            print(f"🔍 DocumentContentView: Processing request for patient {pk}, document {document_index}")
            patient = Patient.objects.get(pk=pk, doctor=request.user)
            print(f"✅ Found patient: {patient.first_name} {patient.last_name}")
        except Patient.DoesNotExist:
            print(f"❌ Patient {pk} not found")
            return Response({'detail': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            docs = patient.documents or []
            print(f"📄 Patient has {len(docs)} documents")
            
            if not isinstance(document_index, int) or document_index < 0 or document_index >= len(docs):
                print(f"❌ Invalid document index: {document_index}, valid range: 0-{len(docs)-1}")
                return Response({'detail': 'Invalid document index.'}, status=status.HTTP_400_BAD_REQUEST)

            document = docs[document_index]
            print(f"📋 Processing document: {document.get('fileName')} (type: {document.get('documentType')})")
            print(f"🔗 Document URL: {document.get('url')}")
            print(f"☁️ OSS path: {document.get('oss_path')}")
            print(f"📄 Has extracted text: {document.get('hasTextContent', False)}")
            print(f"🎯 Viewer strategy: {document.get('viewerStrategy', 'unknown')}")
            
            # Check if document has OSS path
            if not document.get('oss_path'):
                print(f"❌ Document {document.get('fileName')} has no OSS path")
                # Document exists in database but not in OSS
                return Response({
                    'detail': 'Document not available in cloud storage.',
                    'message': 'This document exists in the database but the actual file content is not available in cloud storage. It may have been uploaded before the cloud migration or the file was not properly stored.',
                    'document': {
                        'fileName': document.get('fileName', 'Unknown'),
                        'documentType': document.get('documentType', 'Unknown'),
                        'uploadTimestamp': document.get('uploadTimestamp'),
                        'hasContent': False
                    }
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Check if we should return extracted text instead of binary content
            viewer_strategy = document.get('viewerStrategy', 'download')
            if viewer_strategy == 'text_extracted' and document.get('extractedText'):
                print(f"📝 Returning extracted text content for {document.get('fileName')}")
                
                # Return extracted text with text/plain content type
                response = Response(document['extractedText'], content_type='text/plain')
                filename = document["fileName"]
                response['Content-Disposition'] = f'inline; filename="{filename}.txt"'
                return response
            


            print(f"☁️ Fetching document from OSS: {document['oss_path']}")
            
            # Import OSS service
            try:
                from alibaba_cloud.services.oss_service import AlibabaOSSService
                print("✅ OSS service imported successfully")
                oss_service = AlibabaOSSService()
                print("✅ OSS service instance created")
            except Exception as e:
                print(f"❌ Error importing/creating OSS service: {e}")
                raise
            
            # Get document content from OSS
            try:
                print(f"🔍 Getting object from OSS bucket...")
                print(f"🔍 OSS path: {document['oss_path']}")
                
                oss_response = oss_service.bucket.get_object(document['oss_path'])
                print("✅ OSS object retrieved successfully")
                
                print(f"📖 Reading content...")
                content = oss_response.read()
                print(f"✅ Content read: {len(content)} bytes")
                
                # Validate content
                if not content or len(content) == 0:
                    print(f"❌ Content is empty")
                    return Response({
                        'detail': 'Document content is empty.',
                        'message': 'The document exists but contains no content.'
                    }, status=status.HTTP_404_NOT_FOUND)
                
                # Determine content type based on file extension
                file_extension = document['fileName'].lower().split('.')[-1]
                content_type = 'text/plain'
                
                print(f"📄 File extension: {file_extension}")
                
                if file_extension == 'pdf':
                    content_type = 'application/pdf'
                    print(f"📋 Detected PDF file, setting content type to: {content_type}")
                elif file_extension in ['doc', 'docx']:
                    content_type = 'application/msword'
                elif file_extension in ['jpg', 'jpeg']:
                    content_type = 'image/jpeg'
                elif file_extension == 'png':
                    content_type = 'image/png'
                
                print(f"📝 Final content type: {content_type}")
                
                # Handle PDFs by converting to text using PyPDF2
                if file_extension == 'pdf':
                    print(f"📄 PDF detected, converting to text using PyPDF2")
                    try:
                        import PyPDF2
                        from io import BytesIO
                        
                        # Create a BytesIO object from the content
                        pdf_stream = BytesIO(content)
                        
                        # Create PDF reader
                        pdf_reader = PyPDF2.PdfReader(pdf_stream)
                        
                        # Extract text from all pages
                        pdf_text = ""
                        for page_num, page in enumerate(pdf_reader.pages):
                            page_text = page.extract_text()
                            if page_text:
                                pdf_text += f"\n--- Page {page_num + 1} ---\n{page_text}\n"
                        
                        if pdf_text.strip():
                            print(f"✅ PDF converted to text successfully: {len(pdf_text)} characters")
                            
                            # Return PDF text content instead of binary
                            response = Response(pdf_text, content_type='text/plain')
                            filename = document["fileName"].replace('.pdf', '_converted.txt')
                            response['Content-Disposition'] = f'inline; filename="{filename}"'
                            
                            # Add CORS headers
                            response['Access-Control-Allow-Origin'] = '*'
                            response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                            response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
                            
                            print(f"✅ Returning PDF as text content")
                            return response
                        else:
                            print(f"⚠️  PDF text extraction returned empty content")
                            # Fall back to binary PDF response
                            print(f"🔄 Falling back to binary PDF response")
                            
                    except Exception as e:
                        print(f"❌ Error converting PDF to text: {e}")
                        # Fall back to binary PDF response
                        print(f"🔄 Falling back to binary PDF response")
                
                # Return content with appropriate headers (for non-PDFs or fallback)
                response = Response(content, content_type=content_type)
                filename = document["fileName"]
                response['Content-Disposition'] = f'inline; filename="{filename}"'
                
                # Add CORS headers for files
                response['Access-Control-Allow-Origin'] = '*'
                response['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
                response['Access-Control-Allow-Headers'] = 'Authorization, Content-Type'
                
                # For PDFs, ensure proper display headers
                if file_extension == 'pdf':
                    response['X-Content-Type-Options'] = 'nosniff'
                    response['X-Frame-Options'] = 'SAMEORIGIN'
                
                print(f"✅ Response created successfully, returning content")
                return response
                
            except Exception as e:
                print(f"❌ Error fetching document from OSS: {str(e)}")
                import traceback
                traceback.print_exc()
                return Response({
                    'detail': 'Error fetching document content from cloud storage.',
                    'message': 'The document exists in cloud storage but there was an error retrieving it. This may be a temporary issue.',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print(f"❌ General error in DocumentContentView: {str(e)}")
            import traceback
            traceback.print_exc()
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
