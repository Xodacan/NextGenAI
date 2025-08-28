# Firebase Frontend Setup

This guide will help you complete the Firebase authentication setup in your React frontend.

## Prerequisites

1. Firebase project with Authentication enabled
2. Firebase Web App configuration

## Setup Steps

### 1. Install Firebase SDK

Run this command in the frontend directory:
```bash
npm install firebase
```

### 2. Get Firebase Web Configuration

1. Go to your Firebase Console: https://console.firebase.google.com/
2. Select your project (openroom-b8b7a)
3. Go to Project Settings (gear icon)
4. Scroll down to "Your apps" section
5. Click the web icon (</>) to add a web app
6. Register your app with a nickname (e.g., "DischargeAI Frontend")
7. Copy the configuration object

### 3. Update Firebase Configuration

Edit `src/firebase/config.ts` and replace the placeholder values:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "openroom-b8b7a.firebaseapp.com",
  projectId: "openroom-b8b7a",
  storageBucket: "openroom-b8b7a.appspot.com",
  messagingSenderId: "your-actual-messaging-sender-id",
  appId: "your-actual-app-id"
};
```

### 4. Enable Email/Password Authentication

1. In Firebase Console, go to Authentication
2. Click "Get started" if not already done
3. Go to "Sign-in method" tab
4. Enable "Email/Password" provider
5. Add your authorized domain (localhost for development)

### 5. Test the Setup

1. Start your frontend: `npm run dev`
2. Start your Django backend: `python manage.py runserver`
3. Go to your frontend app
4. Try the email/password login form

## Current Features

- ✅ Email/password authentication with Firebase
- ✅ Firebase authentication service created
- ✅ AuthContext updated to use Firebase
- ✅ Token verification with Django backend
- ✅ Automatic auth state management

## Troubleshooting

### Common Issues:

1. **"Firebase not initialized" error**
   - Make sure you've installed the Firebase SDK
   - Check that your config values are correct

2. **"Email/password sign-in failed" error**
   - Verify Email/Password provider is enabled in Firebase Console
   - Check that localhost is in authorized domains
   - Make sure you have created user accounts in Firebase

3. **"Backend authentication failed" error**
   - Make sure Django backend is running
   - Check that your .env file has correct Firebase credentials

## Next Steps

After setup is complete:
1. Test the complete authentication flow
2. Customize user roles based on email domains
3. Add additional authentication providers if needed 