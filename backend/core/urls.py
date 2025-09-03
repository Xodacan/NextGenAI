from django.urls import path
from . import views

urlpatterns = [
    path('health/', views.health_check, name='health_check'),
    path('ollama-health/', views.ollama_health_check, name='ollama_health_check'),
    path('hello/', views.hello_world, name='hello_world'),
    path('patients/', views.PatientListCreateView.as_view(), name='patient_list_create'),
    path('patients/<int:pk>/', views.PatientRetrieveUpdateDeleteView.as_view(), name='patient_detail'),
    path('patients/<int:pk>/documents/', views.PatientAddDocumentView.as_view(), name='patient_add_document'),
    path('patients/<int:pk>/documents/<int:document_index>/', views.PatientDeleteDocumentView.as_view(), name='patient_delete_document'),
    path('patients/<int:pk>/documents/<int:document_index>/content/', views.DocumentContentView.as_view(), name='document_content'),
    path('patients/<int:pk>/generate-summary/', views.GenerateSummaryView.as_view(), name='generate_summary'),
    path('patients/<int:pk>/update-summary/', views.UpdateSummaryView.as_view(), name='update_summary'),
] 