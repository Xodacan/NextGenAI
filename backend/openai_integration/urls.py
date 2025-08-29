from django.urls import path
from . import views

urlpatterns = [
    # Document analysis endpoints
    path('analyze-document/', views.analyze_document, name='analyze_document'),
    path('document-analysis/<int:analysis_id>/', views.get_document_analysis, name='get_document_analysis'),
    path('patient/<int:patient_id>/analyses/', views.get_patient_analyses, name='get_patient_analyses'),
    
    # Discharge summary endpoints
    path('generate-discharge-summary/', views.generate_discharge_summary, name='generate_discharge_summary'),
    path('discharge-summary/<int:summary_id>/', views.get_discharge_summary, name='get_discharge_summary'),
    path('discharge-summary/<int:summary_id>/regenerate/', views.regenerate_discharge_summary, name='regenerate_discharge_summary'),
    path('patient/<int:patient_id>/discharge-summaries/', views.get_patient_discharge_summaries, name='get_patient_discharge_summaries'),
    path('discharge-summary/<int:summary_id>/status/', views.update_discharge_summary_status, name='update_discharge_summary_status'),
]
