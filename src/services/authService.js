import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  linkWithCredential,
  EmailAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} User object
 */
export const signUp = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName });

    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      displayName,
      role: 'user', // default role
      rank: 'harjoittelija', // default rank
      createdAt: new Date().toISOString(),
      progress: {
        currentLevel: 'harjoittelija',
        totalScore: 0,
        questionsAnswered: 0,
      },
    });

    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw error;
  }
};

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User object
 */
export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
};

/**
 * Sign in with Google
 * @returns {Promise<Object>} User object
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const user = userCredential.user;

    // Check if user document exists, if not create it
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'user',
        rank: 'harjoittelija',
        createdAt: new Date().toISOString(),
        progress: {
          currentLevel: 'harjoittelija',
          totalScore: 0,
          questionsAnswered: 0,
        },
      });
    }

    return user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export const logOut = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Get user data from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User data
 */
export const getUserData = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      console.log('User document found:', uid);
      return userDoc.data();
    }
    
    console.log('User document not found, creating it now...', uid);
    
    // If document doesn't exist (async creation in progress), create it now
    const newUserData = {
      uid: uid,
      isAnonymous: true,
      role: 'user',
      rank: 'harjoittelija',
      createdAt: new Date().toISOString(),
      progress: {
        currentLevel: 'harjoittelija',
        totalScore: 0,
        questionsAnswered: 0,
      },
    };
    
    try {
      await setDoc(doc(db, 'users', uid), newUserData);
      console.log('Created user document after retry:', uid);
      return newUserData;
    } catch (writeError) {
      console.error('Failed to create user document:', writeError);
      // Return default data even if Firestore fails
      console.log('Returning default user data despite Firestore error');
      return newUserData;
    }
  } catch (error) {
    console.error('Get user data error:', error);
    throw error;
  }
};

/**
 * Check if user has admin role
 * @param {string} uid - User ID
 * @returns {Promise<boolean>}
 */
export const isAdmin = async (uid) => {
  try {
    const userData = await getUserData(uid);
    return userData?.role === 'admin';
  } catch (error) {
    console.error('Check admin error:', error);
    return false;
  }
};

/**
 * Sign in anonymously to start playing without registration
 * @returns {Promise<Object>} User object
 */
export const signInAnonymouslyUser = async () => {
  try {
    console.log('Creating anonymous user...');
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log('Anonymous user created:', user.uid);

    // Create anonymous user document in Firestore
    // Don't wait for it - let it complete in background
    // AuthContext will retry if needed
    const userData = {
      uid: user.uid,
      isAnonymous: true,
      role: 'user',
      rank: 'harjoittelija',
      createdAt: new Date().toISOString(),
      progress: {
        currentLevel: 'harjoittelija',
        totalScore: 0,
        questionsAnswered: 0,
      },
    };
    
    console.log('User data to be saved:', JSON.stringify(userData));
    console.log('Initiating Firestore document creation (non-blocking)...');
    
    // Fire and forget - don't block on Firestore write
    // This prevents timeouts and lets navigation happen immediately
    setDoc(doc(db, 'users', user.uid), userData)
      .then(() => console.log('Firestore document created successfully in background'))
      .catch((error) => {
        console.error('Background Firestore write error:', error);
        // Log but don't throw - user auth already succeeded
      });

    console.log('Returning user immediately, Firestore write happening in background');
    return user;
  } catch (error) {
    console.error('Anonymous sign in error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

/**
 * Link anonymous account with email/password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} displayName - User display name
 * @returns {Promise<Object>} Updated user object
 */
export const linkAnonymousAccount = async (email, password, displayName) => {
  try {
    const credential = EmailAuthProvider.credential(email, password);
    const userCredential = await linkWithCredential(auth.currentUser, credential);
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, { displayName });

    // Update user document in Firestore
    await updateDoc(doc(db, 'users', user.uid), {
      email: user.email,
      displayName,
      isAnonymous: false,
      linkedAt: new Date().toISOString(),
    });

    return user;
  } catch (error) {
    console.error('Link account error:', error);
    throw error;
  }
};
