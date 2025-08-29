import firebase_admin
from firebase_admin import credentials, auth
from django.conf import settings
import os
from decouple import config

# Initialize Firebase Admin SDK
def initialize_firebase():
    """Initialize Firebase Admin SDK with environment variables"""
    try:
        # Check if Firebase is already initialized
        firebase_admin.get_app()
        print("Firebase already initialized")
        return True
    except ValueError:
        # Firebase not initialized, initialize it
        try:
            print("Initializing Firebase...")
            # Use environment variables for Firebase configuration
            service_account_info = {
                "type": "service_account",
                "project_id": config('FIREBASE_PROJECT_ID', default=''),
                "private_key_id": config('FIREBASE_PRIVATE_KEY_ID', default=''),
                "private_key": config('FIREBASE_PRIVATE_KEY', default='').replace('\\n', '\n'),
                "client_email": config('FIREBASE_CLIENT_EMAIL', default=''),
                "client_id": config('FIREBASE_CLIENT_ID', default=''),
                "auth_uri": config('FIREBASE_AUTH_URI', default='https://accounts.google.com/o/oauth2/auth'),
                "token_uri": config('FIREBASE_TOKEN_URI', default='https://oauth2.googleapis.com/token'),
                "auth_provider_x509_cert_url": config('FIREBASE_AUTH_PROVIDER_X509_CERT_URL', default='https://www.googleapis.com/oauth2/v1/certs'),
                "client_x509_cert_url": config('FIREBASE_CLIENT_X509_CERT_URL', default='')
            }
            
            print(f"Project ID: {service_account_info['project_id']}")
            print(f"Client Email: {service_account_info['client_email']}")
            print(f"Private Key exists: {bool(service_account_info['private_key'])}")
            
            # Check if we have the required Firebase configuration
            if not service_account_info['project_id'] or not service_account_info['private_key']:
                print("Firebase environment variables not configured. Please set up your .env file.")
                return False
            
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            print("Firebase initialized successfully")
            return True
        except Exception as e:
            print(f"Error initializing Firebase: {e}")
            return False

def verify_firebase_token(id_token):
    """Verify Firebase ID token and return user info"""
    try:
        print(f"Verifying Firebase token: {id_token[:20]}...")
        
        # Initialize Firebase if not already done
        initialize_firebase()
        
        # Verify the token
        decoded_token = auth.verify_id_token(id_token)
        print(f"Token verified successfully for user: {decoded_token.get('uid')}")
        
        return {
            'uid': decoded_token['uid'],
            'email': decoded_token.get('email', ''),
            'name': decoded_token.get('name', ''),
            'picture': decoded_token.get('picture', ''),
            'email_verified': decoded_token.get('email_verified', False)
        }
    except Exception as e:
        print(f"Error verifying Firebase token: {e}")
        return None 