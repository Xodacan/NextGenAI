import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailPassword, signOut, onAuthStateChange, User } from '../firebase/auth';
import { getUserProfile } from '../services/userService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChange(async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      
      if (user) {
        try {
          // Fetch doctor profile from backend to get display_name
          const profile = await getUserProfile();
          const userWithProfile = {
            ...user,
            displayName: profile.display_name
          };
          setUser(userWithProfile);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // Fall back to Firebase user data if backend fetch fails
          setUser(user);
        }
      } else {
        setUser(null);
      }
      
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await signInWithEmailPassword(email, password);
      
      // Fetch doctor profile from backend to get display_name
      try {
        const profile = await getUserProfile();
        const userWithProfile = {
          ...user,
          displayName: profile.display_name
        };
        setUser(userWithProfile);
      } catch (profileError) {
        console.error('Failed to fetch user profile after login:', profileError);
        // Fall back to Firebase user data if backend fetch fails
        setUser(user);
      }
      
      return true;
    } catch (error) {
      console.error('Email/password login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}