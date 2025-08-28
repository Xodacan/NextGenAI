import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  id: string;
  fullName: string;
  role: 'Doctor' | 'Nurse' | 'Admin';
  email: string;
  picture?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    // Try to get user from localStorage on initialization
    const savedUser = localStorage.getItem('mockUser');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.error('Error parsing saved user:', e);
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simple mock authentication - accept any email/password for testing
      const mockUser: User = {
        id: '1',
        fullName: 'Dr. John Doe',
        role: 'Doctor',
        email: email,
        picture: undefined
      };
      
      setUser(mockUser);
      // Save user to localStorage
      localStorage.setItem('mockUser', JSON.stringify(mockUser));
      return true;
    } catch (error) {
      console.error('Mock login failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      // Clear user from localStorage
      localStorage.removeItem('mockUser');
    } catch (error) {
      console.error('Mock logout failed:', error);
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