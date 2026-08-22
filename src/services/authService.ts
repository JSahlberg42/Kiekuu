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
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { isFirestoreOfflineError, logFirestoreErrorContext } from '../utils/firestoreDiagnostics';
import type { UserDoc } from '../types/models';

/**
 * Sign up a new user with email and password
 */
export const signUp = async (email: string, password: string, displayName: string): Promise<User> => {
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
 */
export const signIn = async (email: string, password: string): Promise<User> => {
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
 */
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return userCredential.user;
  } catch (error) {
    console.error('Google sign in error:', error);
    throw error;
  }
};

/**
 * Sign out current user
 */
export const logOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
};

/**
 * Send password reset email
 */
export const resetPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
};

/**
 * Get user data from Firestore
 * @throws {FirebaseError} Re-throws network/offline errors so callers can stop retrying
 */
export const getUserData = async (uid: string): Promise<UserDoc | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data() as UserDoc;
    }
    return null;
  } catch (error) {
    console.error('Get user data error:', error);
    logFirestoreErrorContext('getUserData', error);
    // Re-throw network errors (offline / server unreachable) so the caller can
    // detect them and avoid pointless retries.
    // Firebase Firestore uses code 'unavailable' for offline/network errors.
    if (isFirestoreOfflineError(error)) {
      throw error;
    }
    return null;
  }
};

/**
 * Check if user has admin role
 */
export const isAdmin = async (uid: string): Promise<boolean> => {
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
 */
export const signInAnonymouslyUser = async (): Promise<User> => {
  try {
    console.log('Creating anonymous user...');
    const userCredential = await signInAnonymously(auth);
    const user = userCredential.user;
    console.log('Anonymous user created:', user.uid);

    // Create anonymous user document in Firestore
    const userData: UserDoc = {
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

    // Wait up to 2 seconds for Firestore write, then continue regardless
    // This prevents the loading spinner from hanging indefinitely
    const writePromise = setDoc(doc(db, 'users', user.uid), userData);
    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 2000));

    Promise.race([writePromise, timeoutPromise])
      .then(() => console.log('Firestore document created successfully'))
      .catch((error) => console.error('Firestore write error:', error));

    // Return immediately - don't wait for Firestore
    return user;
  } catch (error) {
    console.error('Anonymous sign in error:', error);
    throw error;
  }
};

/**
 * Link anonymous account with email/password
 */
export const linkAnonymousAccount = async (
  email: string,
  password: string,
  displayName: string,
): Promise<User> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Ei kirjautunutta käyttäjää');
    }

    const credential = EmailAuthProvider.credential(email, password);
    const userCredential = await linkWithCredential(currentUser, credential);
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
