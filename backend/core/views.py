from django.shortcuts import render
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework import generics

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

    def post(self, request, pk):
        try:
            patient = Patient.objects.get(pk=pk, doctor=request.user)
        except Patient.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)

        document = request.data
        if not isinstance(document, dict):
            return Response({'detail': 'Document payload must be an object.'}, status=status.HTTP_400_BAD_REQUEST)

        docs = list(patient.documents or [])
        docs.append(document)
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
