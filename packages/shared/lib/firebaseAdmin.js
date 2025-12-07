import admin from 'firebase-admin';

let adminInitialized = false;
let initializationError = null;

// Initialize Firebase Admin SDK only once
export function initializeFirebaseAdmin() {
  // If already initialized successfully, return
  if (adminInitialized && admin.apps.length > 0) {
    return;
  }

  // If we already tried and failed, throw the same error
  if (initializationError) {
    throw initializationError;
  }

  // Check if we have the required environment variables
  const hasRequiredVars = 
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;

  if (!hasRequiredVars) {
    const missingVars = [];
    if (!process.env.FIREBASE_PROJECT_ID) missingVars.push('FIREBASE_PROJECT_ID');
    if (!process.env.FIREBASE_CLIENT_EMAIL) missingVars.push('FIREBASE_CLIENT_EMAIL');
    if (!process.env.FIREBASE_PRIVATE_KEY) missingVars.push('FIREBASE_PRIVATE_KEY');
    
    initializationError = new Error(
      `Firebase Admin credentials missing: ${missingVars.join(', ')}. Please check your environment variables.`
    );
    console.error('❌', initializationError.message);
    throw initializationError;
  }

  try {
    if (!admin.apps.length) {
      // Process the private key - handle multiple formats
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // Handle different newline encodings
      // 1. Replace literal \n strings with actual newlines
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }
      
      // 2. Handle double-escaped newlines (\\\\n)
      if (privateKey.includes('\\\\n')) {
        privateKey = privateKey.replace(/\\\\n/g, '\n');
      }
      
      // 3. Remove any quotes that might have been included
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      
      // 4. Ensure proper line breaks exist
      if (!privateKey.includes('\n') && privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        // Key is on one line without proper breaks, try to fix it
        privateKey = privateKey
          .replace(/-----BEGIN PRIVATE KEY-----/g, '-----BEGIN PRIVATE KEY-----\n')
          .replace(/-----END PRIVATE KEY-----/g, '\n-----END PRIVATE KEY-----\n')
          .replace(/([A-Za-z0-9+/=]{64})/g, '$1\n')
          .replace(/\n\n/g, '\n');
      }
      
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
      adminInitialized = true;
    } else {
      adminInitialized = true;
    }
  } catch (error) {
    initializationError = new Error(`Failed to initialize Firebase Admin: ${error.message}`);
    console.error('❌', initializationError.message);
    
    // Debug info (only show in development)
    if (process.env.NODE_ENV === 'development') {
      const key = process.env.FIREBASE_PRIVATE_KEY || '';
      console.error('🔍 Debug info:');
      console.error('   - Key length:', key.length);
      console.error('   - Has \\n:', key.includes('\\n'));
      console.error('   - Has \\\\n:', key.includes('\\\\n'));
      console.error('   - Has actual newlines:', key.includes('\n'));
      console.error('   - First 60 chars:', key.substring(0, 60));
      console.error('   - Last 60 chars:', key.substring(key.length - 60));
    }
    
    throw initializationError;
  }
}

// Get Firestore instance
export function getAdminDb() {
  initializeFirebaseAdmin();
  return admin.firestore();
}

// Get Auth instance
export function getAdminAuth() {
  initializeFirebaseAdmin();
  return admin.auth();
}

// Check if admin is initialized
export function isAdminInitialized() {
  return adminInitialized && admin.apps.length > 0;
}

export default admin;

