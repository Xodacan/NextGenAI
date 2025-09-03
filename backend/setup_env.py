#!/usr/bin/env python3
"""
Helper script to set up .env file with Firebase configuration
"""

import os
import json

def setup_env():
    print("🔥 Firebase Environment Setup 🔥")
    print("=" * 40)
    
    # Check if .env already exists
    if os.path.exists('.env'):
        print("⚠️  .env file already exists!")
        response = input("Do you want to overwrite it? (y/N): ")
        if response.lower() != 'y':
            print("Setup cancelled.")
            return
    
    print("\n📋 Please provide your Firebase configuration:")
    print("(You can get these values from your Firebase service account JSON file)")
    
    # Get Firebase configuration
    project_id = input("Firebase Project ID: ").strip()
    private_key_id = input("Private Key ID: ").strip()
    private_key = input("Private Key (paste the entire key): ").strip()
    client_email = input("Client Email: ").strip()
    client_id = input("Client ID: ").strip()
    client_x509_cert_url = input("Client X509 Cert URL: ").strip()
    
    # Create .env content
    env_content = f"""# Django Settings
DEBUG=True
# Generate a new secret key: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
SECRET_KEY=your-secret-key-here

# Firebase Configuration
FIREBASE_PROJECT_ID={project_id}
FIREBASE_PRIVATE_KEY_ID={private_key_id}
FIREBASE_PRIVATE_KEY={private_key}
FIREBASE_CLIENT_EMAIL={client_email}
FIREBASE_CLIENT_ID={client_id}
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL={client_x509_cert_url}

# Database
DATABASE_URL=sqlite:///db.sqlite3

# CORS Settings
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
"""
    
    # Write .env file
    try:
        with open('.env', 'w') as f:
            f.write(env_content)
        print("\n✅ .env file created successfully!")
        print("🔒 Remember: Never commit this file to version control!")
    except Exception as e:
        print(f"❌ Error creating .env file: {e}")

if __name__ == "__main__":
    setup_env() 