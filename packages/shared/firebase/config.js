import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your Firebase configuration
// IMPORTANT: All Firebase config values should be set via environment variables
// Never commit API keys or credentials to version control
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Validate required configuration (only warn, don't throw to avoid breaking SSR)
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  if (typeof window !== 'undefined') {
    console.error(
      '❌ Firebase configuration is missing! Please set the following environment variables:\n' +
      '  - NEXT_PUBLIC_FIREBASE_API_KEY\n' +
      '  - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
      '  - NEXT_PUBLIC_FIREBASE_PROJECT_ID\n' +
      '  - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n' +
      '  - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n' +
      '  - NEXT_PUBLIC_FIREBASE_APP_ID\n' +
      '  - NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'
    );
  }
}

// Initialize Firebase App (needed for all services)
let app = null;
let db = null;
let storage = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  // Eagerly initialize Firestore (needed for data fetching)
  db = getFirestore(app);
  // Eagerly initialize Storage (needed for file access)
  storage = getStorage(app);
}

// Lazy auth singleton - only initialized when first accessed
// This removes Firebase Auth from the critical path, improving LCP
let _authInstance = null;

/**
 * Get Firebase Auth instance lazily.
 * Auth is only initialized when this function is first called.
 * For even better performance, consider using useLazyAuth hook.
 */
const getAuthInstance = () => {
  if (!_authInstance && app) {
    _authInstance = getAuth(app);
  }
  return _authInstance;
};

// For backward compatibility, initialize auth on client-side only
// Use getAuthInstance() for new code to benefit from lazy initialization
const auth = typeof window !== 'undefined' && app ? getAuthInstance() : null;

// Initialize Analytics lazily - only if supported and app is initialized
let analytics = null;
if (typeof window !== 'undefined' && app) {
  // Defer analytics to after page becomes interactive
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      isSupported().then(yes => {
        if (yes) {
          analytics = getAnalytics(app);
        }
      });
    }, { timeout: 5000 });
  } else {
    setTimeout(() => {
      isSupported().then(yes => {
        if (yes) {
          analytics = getAnalytics(app);
        }
      });
    }, 3000);
  }
}

export { app, auth, db, storage, analytics, getAuthInstance };
