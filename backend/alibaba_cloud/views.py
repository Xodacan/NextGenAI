from django.shortcuts import render
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.http import JsonResponse
from .services.oss_service import AlibabaOSSService
from .services.document_intelligence_service import AlibabaDocumentIntelligenceService
from .services.function_compute_service import AlibabaFunctionComputeService
from .services.simple_app_server_service import AlibabaSimpleAppServerService


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_document(request):
    """Upload a medical document to Alibaba Cloud OSS"""
    try:
        file = request.FILES.get('file')
        patient_id = request.data.get('patient_id')
        document_type = request.data.get('document_type', 'General')
        
        if not file or not patient_id:
            return Response({
                'error': 'File and patient_id are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get doctor ID from authenticated user
        doctor_id = request.user.firebase_uid
        
        # Read file content
        file_content = file.read()
        
        # Upload to OSS
        oss_service = AlibabaOSSService()
        result = oss_service.upload_medical_document(
            file_content=file_content,
            file_name=file.name,
            doctor_id=doctor_id,
            patient_id=patient_id,
            document_type=document_type
        )
        
        return Response(result, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response({
            'error': f'Upload failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_patient_documents(request, patient_id):
    """List all documents for a specific patient"""
    try:
        doctor_id = request.user.firebase_uid
        
        oss_service = AlibabaOSSService()
        documents = oss_service.list_patient_documents(doctor_id, patient_id)
        
        return Response({
            'documents': documents
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Failed to list documents: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def analyze_document(request):
    """Analyze a medical document using Document Intelligence API"""
    try:
        file = request.FILES.get('file')
        analysis_type = request.data.get('analysis_type', 'full')
        
        if not file:
            return Response({
                'error': 'File is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        doc_intelligence_service = AlibabaDocumentIntelligenceService()
        file_content = file.read()
        
        if analysis_type == 'full':
            result = doc_intelligence_service.analyze_medical_document(file_content)
        elif analysis_type == 'entities':
            # First extract text, then analyze entities
            analysis_result = doc_intelligence_service.analyze_medical_document(file_content)
            if analysis_result['success']:
                result = doc_intelligence_service.extract_medical_entities(analysis_result['extracted_text'])
            else:
                result = analysis_result
        elif analysis_type == 'classify':
            result = doc_intelligence_service.classify_document_type(file_content)
        else:
            return Response({
                'error': 'Invalid analysis type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Analysis failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_summary(request):
    """Generate a medical summary from multiple documents"""
    try:
        document_texts = request.data.get('documents', [])
        summary_type = request.data.get('summary_type', 'comprehensive')
        
        if not document_texts:
            return Response({
                'error': 'Documents are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        doc_intelligence_service = AlibabaDocumentIntelligenceService()
        result = doc_intelligence_service.generate_medical_summary(document_texts, summary_type)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Summary generation failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_word_document(request):
    """Generate a Word document using Function Compute"""
    try:
        document_type = request.data.get('document_type', 'medical_report')
        patient_data = request.data.get('patient_data', {})
        
        if not patient_data:
            return Response({
                'error': 'Patient data is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        fc_service = AlibabaFunctionComputeService()
        
        if document_type == 'medical_report':
            result = fc_service.generate_medical_report(patient_data)
        elif document_type == 'discharge_summary':
            admission_data = request.data.get('admission_data', {})
            treatment_data = request.data.get('treatment_data', {})
            patient_id = request.data.get('patient_id')
            result = fc_service.generate_discharge_summary(patient_id, admission_data, treatment_data)
        elif document_type == 'lab_report':
            lab_results = request.data.get('lab_results', [])
            patient_info = request.data.get('patient_info', {})
            result = fc_service.generate_lab_report_summary(lab_results, patient_info)
        elif document_type == 'consultation_note':
            consultation_data = request.data.get('consultation_data', {})
            doctor_notes = request.data.get('doctor_notes', '')
            result = fc_service.generate_consultation_note(consultation_data, doctor_notes)
        else:
            return Response({
                'error': 'Invalid document type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Document generation failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_document_status(request, document_id):
    """Check the status of a document generation request"""
    try:
        fc_service = AlibabaFunctionComputeService()
        result = fc_service.get_document_status(document_id)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Status check failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deploy_application(request):
    """Deploy the application using Simple Application Server"""
    try:
        deployment_config = request.data.get('deployment_config', {})
        
        if not deployment_config:
            return Response({
                'error': 'Deployment configuration is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        sas_service = AlibabaSimpleAppServerService()
        result = sas_service.deploy_application(deployment_config)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Deployment failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_deployment_status(request, deployment_id):
    """Check the status of a deployment"""
    try:
        sas_service = AlibabaSimpleAppServerService()
        result = sas_service.get_deployment_status(deployment_id)
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Deployment status check failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restart_application(request):
    """Restart the deployed application"""
    try:
        sas_service = AlibabaSimpleAppServerService()
        result = sas_service.restart_application()
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Application restart failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_server_status(request):
    """Get the current server status"""
    try:
        sas_service = AlibabaSimpleAppServerService()
        result = sas_service.get_server_status()
        
        return Response(result, status=status.HTTP_200_OK)
        
    except Exception as e:
        return Response({
            'error': f'Server status check failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_document(request, oss_path):
    """Delete a document from OSS"""
    try:
        oss_service = AlibabaOSSService()
        success = oss_service.delete_document(oss_path)
        
        if success:
            return Response({
                'message': 'Document deleted successfully'
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'error': 'Failed to delete document'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        return Response({
            'error': f'Delete failed: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
