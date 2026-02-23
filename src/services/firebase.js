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

// ─── App Check ───────────────────────────────────────────────────────────────
// App Check MUST be initialized before getAuth(), initializeFirestore(), and
// getAI(). Without it, Firestore and Firebase AI Logic requests carry no App
// Check token, showing 0 % verified in the Firebase Console even when the
// device is online and the reCAPTCHA key is present.
//
// Development: set FIREBASE_APPCHECK_DEBUG_TOKEN *before* calling
// initializeAppCheck() so the SDK generates a local debug token instead of
// calling reCAPTCHA Enterprise. The token is printed to the browser console;
// register it once in Firebase Console → App Check → Apps → Manage debug
// tokens. Set VITE_APPCHECK_DEBUG_TOKEN in .env.local to reuse an already-
// registered token across restarts.
// ─────────────────────────────────────────────────────────────────────────────
if (import.meta.env.DEV) {
  // Must be set before initializeAppCheck() is called (read by the SDK on init)
  self.FIREBASE_APPCHECK_DEBUG_TOKEN =
    import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true;
}

let appCheck = null;
const recaptchaKey = import.meta.env.VITE_RECAPTCHA_ENTERPRISE_KEY;

if (recaptchaKey) {
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
    isTokenAutoRefreshEnabled: true,
  });
  console.log('✅ App Check initialized with reCAPTCHA Enterprise');
} else if (import.meta.env.DEV) {
  // No real key in development — debug token is set above so reCAPTCHA is
  // bypassed. Any site-key value works here; it is never actually called.
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('dev-debug-placeholder'),
    isTokenAutoRefreshEnabled: true,
  });
  console.log('🔧 App Check initialized in debug mode (development)');
  console.log('   → Copy the debug token printed above into:');
  console.log('   → Firebase Console → App Check → Apps → Manage debug tokens');
  console.log('   → Or set VITE_APPCHECK_DEBUG_TOKEN in .env.local to reuse a registered token');
} else {
  // Production without the key — this is a misconfiguration.
  // Firestore and AI Logic requests will NOT carry App Check tokens (0 % verified).
  console.error(
    '❌ VITE_RECAPTCHA_ENTERPRISE_KEY is not set.\n' +
    '   App Check is DISABLED — Cloud Firestore and Firebase AI Logic requests\n' +
    '   will not carry App Check tokens (showing 0 % verified in Firebase Console).\n' +
    '   Fix: add VITE_RECAPTCHA_ENTERPRISE_KEY to your deployment environment\n' +
    '   variables and rebuild the application.',
  );
}

// Initialize other Firebase services AFTER App Check
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