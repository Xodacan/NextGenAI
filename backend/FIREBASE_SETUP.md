# Firebase Authentication Setup

This guide will help you set up Firebase Authentication with your Django backend.

## Prerequisites

1. A Firebase project with Authentication enabled
2. Firebase Admin SDK service account key

## Setup Steps

### 1. Get Firebase Service Account Key

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project
3. Go to Project Settings (gear icon)
4. Go to Service Accounts tab
5. Click "Generate new private key"
6. Download the JSON file
7. Copy the values from the JSON file to your `.env` file (see `env.example` for reference)

### 2. Enable Authentication in Firebase

1. In Firebase Console, go to Authentication
2. Click "Get started"
3. Enable the authentication methods you want:
   - Google Sign-In (recommended)
   - Email/Password
   - Other providers as needed

### 3. Configure Authorized Domains

1. In Firebase Console, go to Authentication > Settings
2. Add your frontend domain to "Authorized domains":
   - `localhost` (for development)
   - Your production domain

### 4. Test the Setup

The Django backend now has these endpoints:

- `POST /api/auth/login/` - Firebase login
- `POST /api/auth/verify/` - Verify Firebase token

## API Usage

### Login Endpoint
```bash
POST /api/auth/login/
Content-Type: application/json

{
  "idToken": "firebase_id_token_here"
}
```

### Verify Token Endpoint
```bash
POST /api/auth/verify/
Content-Type: application/json

{
  "idToken": "firebase_id_token_here"
}
```

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- The `.env` file is already in `.gitignore` to prevent it from being committed
- In production, use environment variables for sensitive data

## Next Steps

1. Set up Firebase SDK in your frontend
2. Update frontend to send Firebase tokens to Django
3. Test the complete authentication flow 