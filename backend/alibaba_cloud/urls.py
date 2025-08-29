from django.urls import path
from . import views

app_name = 'alibaba_cloud'

urlpatterns = [
    # Test endpoint
    path('test-auth/', views.test_auth, name='test_auth'),
    
    # OSS - File Storage
    path('upload/', views.upload_document, name='upload_document'),
    path('documents/<str:patient_id>/', views.list_patient_documents, name='list_patient_documents'),
    path('documents/delete/<path:oss_path>/', views.delete_document, name='delete_document'),
    
    # Document Intelligence/NLP API - Document Analysis
    path('analyze/', views.analyze_document, name='analyze_document'),
    path('summary/', views.generate_summary, name='generate_summary'),
    
    # Function Compute - Word Document Generation
    path('generate-word-doc/', views.generate_word_document, name='generate_word_document'),
    path('document-status/<str:document_id>/', views.get_document_status, name='get_document_status'),
    
    # Simple Application Server - Deployment
    path('deploy/', views.deploy_application, name='deploy_application'),
    path('deployment-status/<str:deployment_id>/', views.get_deployment_status, name='get_deployment_status'),
    path('restart/', views.restart_application, name='restart_application'),
    path('server-status/', views.get_server_status, name='get_server_status'),
]
