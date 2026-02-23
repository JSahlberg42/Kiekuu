import { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { getUserData } from '../services/authService';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
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
        let data = null;
        
        while (retries < maxRetries) {
          try {
            data = await getUserData(firebaseUser.uid);
            if (data) {
              setUserData(data);
              break;
            }
            
            // Document not found, wait before retry
            if (retries < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, retryDelays[retries]));
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
          
          retries++;
        }
        
        // If still no data after retries, create document as fallback
        if (!data) {
          try {
            const fallbackData = {
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

  const value = {
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

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AuthContext;
