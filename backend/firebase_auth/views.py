from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .firebase_config import verify_firebase_token
from core.models import Doctor
import json

@api_view(['POST', 'GET'])
@permission_classes([AllowAny])
def firebase_login(request):
    """Handle Firebase authentication"""
    
    if request.method == 'GET':
        return Response({
            'message': 'This endpoint only accepts POST requests for authentication.',
            'error': 'Use POST method with idToken in request body'
        }, status=status.HTTP_405_METHOD_NOT_ALLOWED)
    
    try:
        data = json.loads(request.body)
        id_token = data.get('idToken')
        
        if not id_token:
            return Response(
                {'error': 'ID token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify the Firebase token
        user_info = verify_firebase_token(id_token)
        
        if user_info:
            # Token is valid, return user info
            return Response({
                'success': True,
                'user': {
                    'uid': user_info['uid'],
                    'email': user_info['email'],
                    'name': user_info['name'],
                    'picture': user_info['picture'],
                    'email_verified': user_info['email_verified']
                }
            }, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Invalid token'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
    except json.JSONDecodeError:
        return Response(
            {'error': 'Invalid JSON'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_token(request):
    """Verify Firebase token and return user info"""
    try:
        data = json.loads(request.body)
        id_token = data.get('idToken')
        
        if not id_token:
            return Response(
                {'error': 'ID token is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_info = verify_firebase_token(id_token)
        
        if user_info:
            return Response({
                'valid': True,
                'user': user_info
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'valid': False,
                'error': 'Invalid token'
            }, status=status.HTTP_401_UNAUTHORIZED)
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get or update user profile information"""
    try:
        # Get the Firebase UID from the authenticated user
        firebase_uid = request.user.firebase_uid
        
        if request.method == 'GET':
            # Get user profile
            try:
                doctor = Doctor.objects.get(firebase_uid=firebase_uid)
                return Response({
                    'success': True,
                    'profile': {
                        'display_name': doctor.display_name,
                        'email': doctor.email,
                        'institution': doctor.institution,
                        'created_at': doctor.created_at,
                        'updated_at': doctor.updated_at
                    }
                }, status=status.HTTP_200_OK)
            except Doctor.DoesNotExist:
                return Response({
                    'error': 'User profile not found'
                }, status=status.HTTP_404_NOT_FOUND)
        
        elif request.method == 'PUT':
            # Update user profile
            try:
                data = json.loads(request.body)
                doctor = Doctor.objects.get(firebase_uid=firebase_uid)
                
                # Update fields if provided
                if 'display_name' in data:
                    doctor.display_name = data['display_name']
                if 'institution' in data:
                    doctor.institution = data['institution']
                
                doctor.save()
                
                return Response({
                    'success': True,
                    'message': 'Profile updated successfully',
                    'profile': {
                        'display_name': doctor.display_name,
                        'email': doctor.email,
                        'institution': doctor.institution,
                        'created_at': doctor.created_at,
                        'updated_at': doctor.updated_at
                    }
                }, status=status.HTTP_200_OK)
                
            except Doctor.DoesNotExist:
                return Response({
                    'error': 'User profile not found'
                }, status=status.HTTP_404_NOT_FOUND)
            except json.JSONDecodeError:
                return Response({
                    'error': 'Invalid JSON data'
                }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change user password (requires current password verification)"""
    try:
        data = json.loads(request.body)
        current_password = data.get('currentPassword')
        new_password = data.get('newPassword')
        
        if not current_password or not new_password:
            return Response({
                'error': 'Current password and new password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Implement password change logic
        # This would typically involve:
        # 1. Verifying the current password with Firebase
        # 2. Updating the password in Firebase
        # 3. Handling any additional security measures
        
        return Response({
            'success': True,
            'message': 'Password changed successfully'
        }, status=status.HTTP_200_OK)
        
    except json.JSONDecodeError:
        return Response({
            'error': 'Invalid JSON data'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_email(request):
    """Change user email address"""
    try:
        data = json.loads(request.body)
        new_email = data.get('newEmail')
        current_password = data.get('currentPassword')
        
        if not new_email or not current_password:
            return Response({
                'error': 'New email and current password are required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # TODO: Implement email change logic
        # This would typically involve:
        # 1. Verifying the current password
        # 2. Updating the email in Firebase
        # 3. Sending verification email to new address
        # 4. Updating the email in Django model
        
        return Response({
            'success': True,
            'message': 'Email change request submitted. Please check your new email for verification.'
        }, status=status.HTTP_200_OK)
        
    except json.JSONDecodeError:
        return Response({
            'error': 'Invalid JSON data'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
