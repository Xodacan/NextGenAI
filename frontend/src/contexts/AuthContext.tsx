import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithEmailPassword, signOut, onAuthStateChange, User, getIdToken } from '../firebase/auth';
import { getUserProfile } from '../services/userService';

export interface Institution {
  id: string;
  name: string;
  type: 'Hospital' | 'Clinic' | 'Medical Center' | 'Specialty Center';
  address: string;
  phone: string;
  email: string;
  logo?: string;
  established?: string;
}

interface AuthContextType {
  user: User | null;
  institution: Institution | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [institution, setInstitution] = useState<Institution | null>(null);
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
            displayName: profile.display_name,
            institution: profile.institution
          };
          setUser(userWithProfile);
          
          // Set institution based on user's institution
          const userInstitution = getInstitutionByName(profile.institution || '');
          setInstitution(userInstitution);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          // Fall back to Firebase user data if backend fetch fails
          setUser(user);
          setInstitution(null);
        }
      } else {
        setUser(null);
        setInstitution(null);
      }
      
      setIsLoading(false);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  // Mock institution data - in production this would come from your backend
  const getInstitutionByName = (institutionName: string): Institution | null => {
    const institutions: Institution[] = [
      {
        id: 'mgh',
        name: 'Massachusetts General Hospital',
        type: 'Hospital',
        address: '55 Fruit Street, Boston, MA 02114',
        phone: '(617) 726-2000',
        email: 'info@mgh.harvard.edu',
        logo: 'https://images.pexels.com/photos/263402/pexels-photo-263402.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        established: '1811'
      },
      {
        id: 'mayo',
        name: 'Mayo Clinic',
        type: 'Medical Center',
        address: '200 First Street SW, Rochester, MN 55905',
        phone: '(507) 284-2511',
        email: 'info@mayo.edu',
        logo: 'https://images.pexels.com/photos/40568/medical-appointment-doctor-healthcare-40568.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        established: '1889'
      },
      {
        id: 'jhh',
        name: 'Johns Hopkins Hospital',
        type: 'Hospital',
        address: '1800 Orleans Street, Baltimore, MD 21287',
        phone: '(410) 955-5000',
        email: 'info@jhmi.edu',
        logo: 'https://images.pexels.com/photos/356040/pexels-photo-356040.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        established: '1889'
      },
      {
        id: 'cleveland',
        name: 'Cleveland Clinic',
        type: 'Medical Center',
        address: '9500 Euclid Avenue, Cleveland, OH 44195',
        phone: '(216) 444-2200',
        email: 'info@ccf.org',
        logo: 'https://images.pexels.com/photos/48604/pexels-photo-48604.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        established: '1921'
      },
      {
        id: 'stanford',
        name: 'Stanford Health Care',
        type: 'Medical Center',
        address: '300 Pasteur Drive, Stanford, CA 94305',
        phone: '(650) 723-4000',
        email: 'info@stanfordhealthcare.org',
        logo: 'https://images.pexels.com/photos/1170979/pexels-photo-1170979.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop',
        established: '1959'
      }
    ];

    // Match by partial name (case insensitive)
    return institutions.find(inst => 
      institutionName.toLowerCase().includes(inst.name.toLowerCase().split(' ')[0].toLowerCase()) ||
      inst.name.toLowerCase().includes(institutionName.toLowerCase())
    ) || institutions[0]; // Default to first institution if no match
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const user = await signInWithEmailPassword(email, password);
      
      // Fetch doctor profile from backend to get display_name
      try {
        const profile = await getUserProfile();
        const userWithProfile = {
          ...user,
          displayName: profile.display_name,
          institution: profile.institution
        };
        setUser(userWithProfile);
        
        // Set institution based on user's institution
        const userInstitution = getInstitutionByName(profile.institution || '');
        setInstitution(userInstitution);
      } catch (profileError) {
        console.error('Failed to fetch user profile after login:', profileError);
        // Fall back to Firebase user data if backend fetch fails
        setUser(user);
        setInstitution(null);
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
      setInstitution(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, institution, login, logout, isLoading, getIdToken }}>
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