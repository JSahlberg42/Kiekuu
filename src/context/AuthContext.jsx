import { createContext, useContext, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}, Anonymous: ${firebaseUser.isAnonymous}` : 'No user');
      
      if (firebaseUser) {
        setUser(firebaseUser);
        
        // Fetch user data from Firestore
        // For anonymous users, retry a few times in case document is being created
        let retries = 0;
        const maxRetries = 5;
        let data = null;
        
        while (retries < maxRetries && !data) {
          try {
            console.log(`Fetching user data (attempt ${retries + 1})...`);
            data = await getUserData(firebaseUser.uid);
            if (data) {
              console.log('User data fetched successfully:', data);
              setUserData(data);
              break;
            } else if (retries < maxRetries - 1) {
              console.log(`User data not found, retrying in ${200 * Math.pow(2, retries)}ms...`);
              // Wait a bit before retrying (exponential backoff)
              await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)));
              retries++;
            } else {
              console.error('User document not found after retries');
              setUserData(null);
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
            if (retries < maxRetries - 1) {
              await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(2, retries)));
              retries++;
            } else {
              setUserData(null);
            }
          }
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
      console.log('Auth context loading complete');
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userData,
    loading,
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
