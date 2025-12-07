'use client';

import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { app } from './config';

// Lazy auth singleton - only initialized when first accessed
let authInstance = null;
let authInitPromise = null;
let authStateListeners = new Set();
let currentUser = null;
let isInitialized = false;

/**
 * Lazily initializes Firebase Auth only when first needed.
 * This removes Firebase Auth from the critical rendering path,
 * significantly improving initial page load performance.
 */
export const getAuthLazy = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!authInstance && app) {
    authInstance = getAuth(app);
    
    // Set up auth state listener once
    onAuthStateChanged(authInstance, (user) => {
      currentUser = user;
      isInitialized = true;
      // Notify all listeners
      authStateListeners.forEach(listener => listener(user));
    });
  }
  
  return authInstance;
};

/**
 * Returns a promise that resolves when auth is initialized
 * and returns the current user (or null if not logged in)
 */
export const initializeAuth = () => {
  if (authInitPromise) {
    return authInitPromise;
  }
  
  authInitPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve(null);
      return;
    }
    
    // If already initialized, resolve immediately
    if (isInitialized) {
      resolve(currentUser);
      return;
    }
    
    const auth = getAuthLazy();
    if (!auth) {
      resolve(null);
      return;
    }
    
    // Wait for auth state to be determined
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
  
  return authInitPromise;
};

/**
 * Subscribe to auth state changes.
 * Automatically initializes auth if not already done.
 * Returns unsubscribe function.
 */
export const subscribeToAuthState = (callback) => {
  authStateListeners.add(callback);
  
  // Initialize auth if not done yet
  const auth = getAuthLazy();
  
  // If already initialized, call callback with current state
  if (isInitialized) {
    callback(currentUser);
  }
  
  return () => {
    authStateListeners.delete(callback);
  };
};

/**
 * Get current user without initializing auth.
 * Returns null if auth hasn't been initialized yet.
 */
export const getCurrentUserSync = () => {
  return currentUser;
};

/**
 * Check if auth has been initialized
 */
export const isAuthInitialized = () => {
  return isInitialized;
};

