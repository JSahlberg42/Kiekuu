import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { getUserData } from '../services/authService';
import type { UserDoc } from '../types/models';

export interface AuthContextValue {
  user: User | null;
  userData: UserDoc | null;
  loading: boolean;
  userDataLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDataLoading, setUserDataLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Auth state is known — stop blocking the protected route immediately
        setLoading(false);

        // Fetch user data from Firestore in the background
        setUserDataLoading(true);
        let retries = 0;
        const maxRetries = 4;
        const retryDelays = [100, 200, 300, 400]; // Fast delays: total ~1 second max
        let data: UserDoc | null = null;
        let isOffline = false;

        while (retries < maxRetries) {
          try {
            data = await getUserData(firebaseUser.uid);
            if (data) {
              setUserData(data);
              break;
            }

            // Document not found, wait before retry
            if (retries < maxRetries - 1) {
              await new Promise((resolve) => setTimeout(resolve, retryDelays[retries]));
            }
          } catch (error) {
            // Network/offline error — no point retrying, stop immediately
            console.error('Error fetching user data:', error);
            isOffline = true;
            break;
          }

          retries++;
        }

        // If still no data after retries, create document as fallback
        // Skip the Firestore write when offline to avoid cascading errors
        if (!data && !isOffline) {
          try {
            const fallbackData: UserDoc = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || null,
              displayName: firebaseUser.displayName || null,
              photoURL: firebaseUser.photoURL || null,
              isAnonymous: firebaseUser.isAnonymous,
              role: 'user',
              rank: 'harjoittelija',
              createdAt: new Date().toISOString(),
              progress: {
                currentLevel: 'harjoittelija',
                totalScore: 0,
                questionsAnswered: 0,
              },
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), fallbackData);
            setUserData(fallbackData);
          } catch (error) {
            console.error('Error creating fallback user data:', error);
            setUserData(null);
          }
        }
        setUserDataLoading(false);
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    userData,
    loading,
    userDataLoading,
    isAuthenticated: !!user,
    isAdmin: userData?.role === 'admin',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
