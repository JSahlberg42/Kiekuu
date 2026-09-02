#!/usr/bin/env node

/**
 * Admin Promotion CLI Script
 * 
 * Usage:
 *   node scripts/promote-admin.js <user-email>
 * 
 * Example:
 *   node scripts/promote-admin.js user@example.com
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
let app;
try {
  const serviceAccount = JSON.parse(
    await readFile(join(__dirname, '../firebase-service-account.json'), 'utf8')
  );
  
  app = initializeApp({
    credential: cert(serviceAccount),
  });
} catch (error) {
  console.error('❌ Error: Could not load firebase-service-account.json');
  console.error('Please download the service account key from Firebase Console:');
  console.error('Settings > Service Accounts > Generate New Private Key');
  console.error('Save it as firebase-service-account.json in the project root');
  process.exit(1);
}

const auth = getAuth(app);
const db = getFirestore(app);

async function promoteToAdmin(email) {
  try {
    console.log(`🔍 Looking for user: ${email}`);
    
    // Get user by email
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;
    
    console.log(`✅ Found user: ${userRecord.displayName || email} (${uid})`);
    
    // Set custom claim on the auth user (used by Firestore security rules)
    // This takes effect on the user's next token refresh.
    await auth.setCustomUserClaims(uid, { role: 'admin' });
    console.log('🔐 Custom claim set: role=admin');
    
    // Also update Firestore user document (used by client-side UI checks)
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.log('⚠️  User document does not exist in Firestore. Creating...');
      await userRef.set({
        uid,
        email: userRecord.email,
        displayName: userRecord.displayName || '',
        role: 'admin',
        rank: 'harjoittelija',
        createdAt: new Date().toISOString(),
        progress: {
          currentLevel: 'harjoittelija',
          totalScore: 0,
          questionsAnswered: 0,
        },
      });
    } else {
      await userRef.update({
        role: 'admin',
        updatedAt: new Date().toISOString(),
      });
    }
    
    console.log('🎉 Success! User promoted to admin.');
    console.log(`   Email: ${email}`);
    console.log(`   UID: ${uid}`);
    console.log('📝 Note: Custom claim takes effect on next sign-in. Existing sessions may need re-authentication.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error promoting user:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('User not found. Make sure the user has signed up first.');
    }
    
    process.exit(1);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.error('❌ Error: Email address required');
  console.error('Usage: node scripts/promote-admin.js <user-email>');
  console.error('Example: node scripts/promote-admin.js user@example.com');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('❌ Error: Invalid email format');
  process.exit(1);
}

promoteToAdmin(email);
