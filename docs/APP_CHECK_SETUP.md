# Firebase App Check Configuration

## Overview

Firebase App Check with reCAPTCHA Enterprise has been integrated into the Kiekuu application. This helps protect your backend resources from abuse by verifying that requests come from legitimate app instances.

## Environment Setup

Add the following environment variable to your `.env.local` file:

```
VITE_RECAPTCHA_ENTERPRISE_KEY=your_recaptcha_enterprise_key_here
```

### Getting Your reCAPTCHA Enterprise Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (Kiekuu)
3. Navigate to **App Check** (left sidebar)
4. Click on **Attestation Keys** or **reCAPTCHA Enterprise** tab
5. Copy your reCAPTCHA Enterprise Key
6. Paste it into your `.env.local` file

## How It Works

- **Client-side**: App Check automatically attaches App Check tokens to all requests from the web app
- **Token refresh**: Tokens are automatically refreshed before expiration
- **Enforcement**: Firebase backend endpoints will verify tokens before responding

## Enforcing App Check

To enforce App Check on your Firestore and Authentication endpoints:

1. Go to Firebase Console → **App Check**
2. Click the **...** menu next to your web app
3. Select **Enforce**

⚠️ **Warning**: Enforcing App Check will block requests that don't include valid App Check tokens. This is recommended once you've fully tested the integration.

## Testing

The app will work without a valid key (development mode), but to test with enforcement:

1. Make sure `VITE_RECAPTCHA_ENTERPRISE_KEY` is set in your `.env.local`
2. Test the application in production or with enforcement enabled
3. Monitor Firebase logs for any App Check token failures

## Firestore Security Rules with App Check

When you enforce App Check, update your Firestore rules to validate tokens:

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    function isValidAppCheck() {
      return request.auth.token.firebase.app_check.token != null;
    }
    
    match /users/{userId} {
      allow read, write: if isValidAppCheck() && request.auth.uid == userId;
    }
    
    match /questions/{questionId} {
      allow read: if isValidAppCheck() && request.auth != null;
      allow create, update, delete: if isValidAppCheck() && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

## Disable App Check for Development (Optional)

If you want to disable App Check in development:

1. Go to Firebase Console → App Check
2. Select your app
3. Click the checkbox next to your app
4. Toggle "Enforce" off

## More Information

- [Firebase App Check Documentation](https://firebase.google.com/docs/app-check)
- [App Check for Web](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider)
