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
import os

from .models import Patient
from .serializers import PatientSerializer
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
