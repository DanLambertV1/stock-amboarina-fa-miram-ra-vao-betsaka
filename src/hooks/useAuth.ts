import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db, COLLECTIONS } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'seller' | 'viewer';
  avatar?: string;
  lastLogin: Date;
  sessionStart: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  sessionDuration: string;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, name: string, role: User['role']) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  refreshSession: () => void;
}

// Create auth context
export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Custom hook for authentication logic
export function useAuthState(): AuthContextType {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sessionDuration: '0m'
  });

  // Calculate session duration
  const calculateSessionDuration = (sessionStart: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - sessionStart.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }
    return `${diffMinutes}m`;
  };

  // Convert Firebase user to app user
  const convertFirebaseUser = async (firebaseUser: FirebaseUser, sessionStart?: Date): Promise<User> => {
    const now = new Date();
    
    // Try to get user data from Firestore
    try {
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return {
          id: firebaseUser.uid,
          name: userData.name || firebaseUser.displayName || 'Utilisateur',
          email: firebaseUser.email || '',
          role: userData.role || 'viewer',
          lastLogin: now,
          sessionStart: sessionStart || now
        };
      }
    } catch (error) {
      console.warn('Could not fetch user data from Firestore:', error);
    }
    
    // Fallback to Firebase user data
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Utilisateur',
      email: firebaseUser.email || '',
      role: 'viewer', // Default role for existing users without Firestore data
      lastLogin: now,
      sessionStart: sessionStart || now
    };
  };

  // Listen to Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const sessionStart = new Date();
        const user = await convertFirebaseUser(firebaseUser, sessionStart);
        
        // Store session data
        localStorage.setItem('globalva_user_session', JSON.stringify(user));
        
        setAuthState({
          user,
          isAuthenticated: true,
          isLoading: false,
          sessionDuration: '0m'
        });
      } else {
        // User is signed out
        localStorage.removeItem('globalva_user_session');
        setAuthState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          sessionDuration: '0m'
        });
      }
    });

    return () => unsubscribe();
  }, []);

  // Update session duration every minute
  useEffect(() => {
    if (authState.user && authState.isAuthenticated) {
      const interval = setInterval(() => {
        setAuthState(prev => ({
          ...prev,
          sessionDuration: calculateSessionDuration(prev.user!.sessionStart)
        }));
      }, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [authState.user, authState.isAuthenticated]);

  const login = async (email: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Use Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        // Firebase auth state listener will handle the rest
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        throw new Error('Aucun compte trouvé avec cette adresse email');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Mot de passe incorrect');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Adresse email invalide');
      } else if (error.code === 'auth/user-disabled') {
        throw new Error('Ce compte a été désactivé');
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error('Trop de tentatives de connexion. Veuillez réessayer plus tard.');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Erreur de réseau. Vérifiez votre connexion internet.');
      } else if (error.code === 'auth/invalid-credential') {
        throw new Error('Email ou mot de passe incorrect');
      } else {
        throw new Error('Erreur de connexion. Veuillez réessayer.');
      }
    }
  };

  const signUp = async (email: string, password: string, name: string, role: User['role']): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Create user with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      if (userCredential.user) {
        // Update the user's display name
        await updateProfile(userCredential.user, {
          displayName: name
        });

        // Store additional user data in Firestore
        try {
          await setDoc(doc(db, COLLECTIONS.USERS, userCredential.user.uid), {
            name,
            email,
            role,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
          });
        } catch (firestoreError) {
          console.warn('Could not save user data to Firestore:', firestoreError);
          // Continue anyway - the user is created in Firebase Auth
        }

        setAuthState(prev => ({ ...prev, isLoading: false }));
        return true;
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        return false;
      }
    } catch (error: any) {
      console.error('Sign up error:', error);
      setAuthState(prev => ({ ...prev, isLoading: false }));
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Cette adresse email est déjà utilisée');
      } else if (error.code === 'auth/invalid-email') {
        throw new Error('Adresse email invalide');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('La création de compte est désactivée');
      } else if (error.code === 'auth/weak-password') {
        throw new Error('Le mot de passe est trop faible');
      } else if (error.code === 'auth/network-request-failed') {
        throw new Error('Erreur de réseau. Vérifiez votre connexion internet.');
      } else {
        throw new Error('Erreur lors de la création du compte. Veuillez réessayer.');
      }
    }
  };

  const logout = async (): Promise<void> => {
    try {
      // Use Firebase signOut
      await signOut(auth);
      
      // Clear all stored data
      localStorage.removeItem('globalva_user_session');
      localStorage.removeItem('globalva_auth_token');
      localStorage.removeItem('globalva_user_preferences');
      localStorage.removeItem('globalva_settings');
      
      // Clear session storage
      sessionStorage.clear();
      
      // Firebase auth state listener will handle state reset
      
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (authState.user) {
      const updatedUser = { ...authState.user, ...updates };
      
      // Update localStorage
      localStorage.setItem('globalva_user_session', JSON.stringify(updatedUser));
      
      setAuthState(prev => ({
        ...prev,
        user: updatedUser
      }));
    }
  };

  const refreshSession = () => {
    if (authState.user) {
      const now = new Date();
      updateUser({ lastLogin: now });
    }
  };

  return {
    ...authState,
    login,
    signUp,
    logout,
    updateUser,
    refreshSession
  };
}

// Session management utilities
export const SessionManager = {
  isSessionValid(): boolean {
    // With Firebase Auth, we rely on Firebase's session management
    return auth.currentUser !== null;
  },

  extendSession(): void {
    const sessionData = localStorage.getItem('globalva_user_session');
    if (sessionData) {
      try {
        const userData = JSON.parse(sessionData);
        userData.lastActivity = new Date().toISOString();
        localStorage.setItem('globalva_user_session', JSON.stringify(userData));
      } catch (error) {
        console.error('Error extending session:', error);
      }
    }
  },

  clearSession(): void {
    localStorage.removeItem('globalva_user_session');
    localStorage.removeItem('globalva_auth_token');
    localStorage.removeItem('globalva_user_preferences');
    sessionStorage.clear();
  }
};