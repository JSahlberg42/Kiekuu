# Deployment Checklist - Anonymous Login Fix

## Problem
Anonymous login hangs at "Creating Firestore document..." on test-kiekuu.web.app

## Root Cause
Firestore write timeout - likely due to:
1. Firestore rules not properly deployed
2. Anonymous Authentication not enabled in Firebase Console
3. Network/connectivity issues

## Deployment Steps

### 1. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```
✅ **Status**: Completed locally

### 2. Verify Firebase Console Settings

#### Check Anonymous Authentication:
1. Go to [Firebase Console](https://console.firebase.google.com/project/kiekuu-cb601/authentication/providers)
2. Click on **"Sign-in method"** tab
3. Ensure **"Anonymous"** is **Enabled**
4. If not enabled:
   - Click on "Anonymous"
   - Toggle to "Enable"
   - Click "Save"

#### Check Firestore Database:
1. Go to [Firestore Console](https://console.firebase.google.com/project/kiekuu-cb601/firestore)
2. Verify database exists and is not in "Locked mode"
3. Check that rules are active (should show recently updated)

### 3. Deploy Application
```bash
# Build production version
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### 4. Test After Deployment

1. Open https://test-kiekuu.web.app/landing
2. Open Browser DevTools (F12) → Console tab
3. Click "Aloita käyttö" button
4. Watch console logs:

**Expected successful flow:**
```
Starting anonymous sign in...
Creating anonymous user...
Anonymous user created: <uid>
Creating Firestore document...
User data to be saved: {"uid":"...","isAnonymous":true,...}
Firestore document created successfully
Returning user after delay
Anonymous sign in successful, navigating to home...
Auth state changed: User: <uid>, Anonymous: true
Fetching user data (attempt 1)...
User data fetched successfully: {...}
```

**If it hangs at "Creating Firestore document...":**
- Check error logs after 10 seconds (timeout will trigger)
- Copy the error message from console
- Check Firebase Console → Firestore → Usage tab for errors

### 5. Firestore Rules Verification

Current rules should allow:
```javascript
// Users can create their own document on signup
allow create: if isOwner(userId) && 
              request.resource.data.role == 'user' &&
              request.resource.data.rank == 'harjoittelija';
```

This allows anonymous users to create their own document with role='user' and rank='harjoittelija'.

## Troubleshooting

### If "Firestore write timeout" error appears:
1. **Check Firestore Rules**: Ensure deployed correctly
2. **Check Anonymous Auth**: Must be enabled in Firebase Console
3. **Check Network**: Test from different network/device
4. **Check Firestore Status**: [Firebase Status Dashboard](https://status.firebase.google.com/)

### If "permission-denied" error:
1. Firestore rules not deployed: Run `firebase deploy --only firestore:rules`
2. Rules syntax error: Check firestore.rules file
3. Anonymous user uid mismatch: Check console logs for uid values

### If document creates but app still blank:
1. Check AuthContext retry logic is working (should retry 5 times)
2. Check ProtectedRoute loading state
3. Check browser console for JavaScript errors

## Changes Made

### Files Modified:
1. **src/services/authService.js**
   - Added 10-second timeout to Firestore writes
   - Enhanced error logging
   - Added detailed user data logging

2. **src/context/AuthContext.jsx**
   - Added retry logic (5 attempts with exponential backoff)
   - Added comprehensive logging
   - Removed `{!loading && children}` to prevent blank screen

3. **src/pages/Landing.jsx**
   - Enhanced error messages
   - Better error details logging

4. **src/components/ProtectedRoute.jsx**
   - Added logging for debugging

5. **src/pages/Home.jsx**
   - Added logging for user state

## Rollback Plan

If issues persist, revert these commits:
```bash
git log --oneline -5  # Find commit hashes
git revert <commit-hash>
git push
firebase deploy --only hosting
```

## Support Information

If problem continues after deployment:
1. Collect console logs from production
2. Check Firebase Console → Authentication → Users (should see anonymous users)
3. Check Firebase Console → Firestore → Data (should see users collection)
4. Share error logs for further debugging
