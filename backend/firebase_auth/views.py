from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from .firebase_config import verify_firebase_token
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
