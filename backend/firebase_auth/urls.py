from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.firebase_login, name='firebase_login'),
    path('verify/', views.verify_token, name='verify_token'),
    path('profile/', views.user_profile, name='user_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('change-email/', views.change_email, name='change_email'),
] 