import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from './config';

// Custom user interface to match your existing User interface
export interface User {
  id: string;
  fullName: string;
  role: 'Doctor' | 'Nurse' | 'Admin';
  email: string;
  picture?: string;
}

// Convert Firebase user to your app's user format
const convertFirebaseUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    fullName: firebaseUser.displayName || 'Unknown User',
    role: 'Doctor', // Default role - you can customize this based on email domain or other logic
    email: firebaseUser.email || '',
    picture: firebaseUser.photoURL || undefined
  };
};

// Sign in with email and password
export const signInWithEmailPassword = async (email: string, password: string): Promise<User> => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    const user = convertFirebaseUser(result.user);
    
    // Get the ID token
    const idToken = await result.user.getIdToken();
    
    // Send token to Django backend for verification
    const response = await fetch('http://localhost:8000/api/auth/login/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      throw new Error('Backend authentication failed');
    }

    return user;
  } catch (error) {
    console.error('Email/password sign-in error:', error);
    throw error;
  }
};

// Sign out
export const signOut = async (): Promise<void> => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      const user = convertFirebaseUser(firebaseUser);
      callback(user);
    } else {
      callback(null);
    }
  });
};

// Verify token with backend
export const verifyToken = async (idToken: string): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:8000/api/auth/verify/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    const data = await response.json();
    return data.valid === true;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
}; 