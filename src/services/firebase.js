import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, memoryLocalCache } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, getToken } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check with reCAPTCHA Enterprise
let appCheck = null;
if (import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
  console.log('✅ App Check initialized with reCAPTCHA Enterprise');
} else {
  console.log('⚠️  VITE_RECAPTCHA_ENTERPRISE_KEY not set. App Check is disabled.');
  console.log('📋 To enable App Check:');
  console.log('   1. Generate a reCAPTCHA Enterprise key from Firebase Console');
  console.log('   2. Add to .env.local: VITE_RECAPTCHA_ENTERPRISE_KEY=your_key_here');
  console.log('   3. Restart the dev server');
}

// Initialize services
export const auth = getAuth(app);
// Use in-memory cache (no IndexedDB lock) to avoid the startup race condition where
// persistentLocalCache's tab-manager lock acquisition causes "client is offline" errors
// for users who are actually online.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});

// Debug utility for checking App Check token in development
export async function debugAppCheckToken() {
  if (!appCheck) {
    console.warn('⚠️  App Check is not initialized. Set VITE_RECAPTCHA_ENTERPRISE_KEY in .env.local to enable it.');
    return null;
  }
  try {
    const token = await getToken(appCheck);
    console.log('🔐 App Check Token:', token);
    return token;
  } catch (error) {
    console.error('❌ Failed to get App Check token:', error.message);
    return null;
  }
}

// Expose debug function globally for browser console
if (import.meta.env.DEV) {
  window.__debugAppCheck = debugAppCheckToken;
  console.log('💡 Run window.__debugAppCheck() in browser console to check App Check token');
}

// Note: Vertex AI is initialized in aiService.js
export default app;