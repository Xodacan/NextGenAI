import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Your Firebase configuration
// You'll need to get these values from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyAA8hTZTxFRr4GsOoHuUend1uHtb9QQAEU",
  authDomain: "openroom-b8b7a.firebaseapp.com",
  projectId: "openroom-b8b7a",
  storageBucket: "openroom-b8b7a.firebasestorage.app",
  messagingSenderId: "944028714547",
  appId: "1:944028714547:web:292210661d31c111684546"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

export default app; 