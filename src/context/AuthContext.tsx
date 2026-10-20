// src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { AppUser, UserRole } from '../types/inventory.ts';

interface AuthContextType {
  user: AppUser;
  firebaseUser: User | null;
  idToken: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  getAuthHeaders: () => Record<string, string>;
}

const DEFAULT_USER: AppUser = {
  uid: 'mgr-ashish-01',
  email: 'ashish.sattur@gmail.com',
  displayName: 'Ashish (Store Owner)',
  role: 'manager',
  isFirebaseUser: false,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string | null>(null);
  const [user, setUser] = useState<AppUser>(() => {
    const saved = localStorage.getItem('sutra_active_user');
    return saved ? JSON.parse(saved) : DEFAULT_USER;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const token = await fbUser.getIdToken();
          setIdToken(token);
          setFirebaseUser(fbUser);

          const role: UserRole =
            fbUser.email?.includes('admin') || fbUser.email?.includes('ashish') ? 'manager' : 'employee';

          const mappedUser: AppUser = {
            uid: fbUser.uid,
            email: fbUser.email || 'cashier@retailcotton.com',
            displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'Store Associate',
            role: user.role || role,
            isFirebaseUser: true,
          };
          setUser(mappedUser);
          localStorage.setItem('sutra_active_user', JSON.stringify(mappedUser));
        } catch (e) {
          console.error('Failed to get Firebase token:', e);
        }
      } else {
        setFirebaseUser(null);
        setIdToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const token = await result.user.getIdToken();
      setIdToken(token);
      setFirebaseUser(result.user);

      const role: UserRole =
        result.user.email?.includes('admin') || result.user.email?.includes('ashish') ? 'manager' : 'employee';

      const mappedUser: AppUser = {
        uid: result.user.uid,
        email: result.user.email || 'user@retailcotton.com',
        displayName: result.user.displayName || 'Store Staff',
        role,
        isFirebaseUser: true,
      };

      setUser(mappedUser);
      localStorage.setItem('sutra_active_user', JSON.stringify(mappedUser));
    } catch (error) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      if (firebaseUser) {
        await fbSignOut(auth);
      }
      // Revert to demo manager profile
      setUser(DEFAULT_USER);
      localStorage.setItem('sutra_active_user', JSON.stringify(DEFAULT_USER));
      setIdToken(null);
      setFirebaseUser(null);
    } catch (err) {
      console.error('Sign-out failed:', err);
    }
  };

  const switchRole = (newRole: UserRole) => {
    const updated: AppUser = {
      ...user,
      role: newRole,
    };
    setUser(updated);
    localStorage.setItem('sutra_active_user', JSON.stringify(updated));
  };

  const getAuthHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-staff-role': user.role,
      'x-staff-name': user.displayName,
    };
    if (idToken) {
      headers['Authorization'] = `Bearer ${idToken}`;
    }
    return headers;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        firebaseUser,
        idToken,
        loading,
        signInWithGoogle,
        signOut,
        switchRole,
        getAuthHeaders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
