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
