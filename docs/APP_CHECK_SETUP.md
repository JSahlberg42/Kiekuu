# Firebase App Check Configuration

## Overview

Firebase App Check with reCAPTCHA Enterprise is integrated into the Kiekuu application. It attaches a verified token to every request made to Cloud Firestore and Firebase AI Logic, protecting your backend from abuse.

> **Why 0 % verified for Firestore / AI Logic?**  
> Firebase Authentication has its own built-in reCAPTCHA protection that shows as "100 % verified" in the App Check dashboard regardless of App Check SDK setup. Firestore and Firebase AI Logic only show verified traffic when `initializeAppCheck()` is called **before** those services are used. If `VITE_RECAPTCHA_ENTERPRISE_KEY` is missing from the **build environment**, the bundle contains `if (undefined)` and App Check is never initialized → 0 % verified.

---

## Production Setup

Add the following variable to your **deployment** environment (not just `.env.local`) so it is baked into the Vite bundle at build time:

```
VITE_RECAPTCHA_ENTERPRISE_KEY=your_recaptcha_enterprise_key_here
```

### Getting Your reCAPTCHA Enterprise Key

1. Go to [Firebase Console](https://console.firebase.google.com/) → your project
2. Navigate to **App Check** (left sidebar)
3. Click on your web app → **Manage attestation**
4. Copy the **reCAPTCHA Enterprise site key** shown there
5. Add it to your deployment environment variables and **rebuild** the application

---

## Local Development Setup (without a real reCAPTCHA key)

Firebase App Check supports a **debug token** workflow for local testing. The SDK auto-generates a UUID the first time it runs in development mode and prints it to the browser console. You register that token once in Firebase Console and it is accepted as valid.

### One-time setup

1. Start the dev server without any key set:
   ```
   npm run dev
   ```
2. Open the browser console — you will see:
   ```
   App Check debug token: <uuid>. You will need to add it to your app's App Check settings in the Firebase console for it to work.
   ```
3. Copy the UUID and register it in **Firebase Console → App Check → Apps → [your app] → Manage debug tokens**
4. To reuse the same token across restarts (instead of generating a new one each time), add it to `.env.local`:
   ```
   VITE_APPCHECK_DEBUG_TOKEN=<the-uuid-you-registered>
   ```

### Both key and debug token in development

If `VITE_RECAPTCHA_ENTERPRISE_KEY` is also set in `.env.local`, the SDK still enters debug mode (the debug token takes priority in development). This means you won't consume real reCAPTCHA quota while testing locally.

---

## How It Works (code)

`src/services/firebase.js` follows this initialization order, which is required by Firebase:

```
1. initializeApp()                     ← create the app
2. self.FIREBASE_APPCHECK_DEBUG_TOKEN  ← set debug token global (dev only, before initializeAppCheck)
3. initializeAppCheck()                ← register App Check (must come before all other services)
4. getAuth()                           ← Firebase Auth
5. initializeFirestore()               ← Cloud Firestore
   (Firebase AI is initialized in aiService.js after importing `app`)
```

If `initializeAppCheck()` is not called first, Cloud Firestore and Firebase AI Logic requests go out without tokens and show **0 % verified** in the Firebase Console.

---

## Enforcing App Check

Once you confirm > 0 % verified traffic in the Firebase Console, enable enforcement per product:

1. Go to Firebase Console → **App Check**
2. Click the **⋮** menu next to your web app
3. Select **Enforce** for **Cloud Firestore** and **Firebase AI Logic**

⚠️ **Warning**: Enforcing App Check blocks all requests without a valid token. Test in Monitor mode first and confirm near-100 % verified traffic before enforcing.

---

## More Information

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [App Check for Web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
- [Debug Tokens](https://firebase.google.com/docs/app-check/web/debug-provider)
