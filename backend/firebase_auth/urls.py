from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.firebase_login, name='firebase_login'),
    path('verify/', views.verify_token, name='verify_token'),
] 