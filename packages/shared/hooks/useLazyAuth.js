'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getAuthLazy, 
  initializeAuth, 
  subscribeToAuthState,
  isAuthInitialized 
} from '../firebase/lazyAuth';

/**
 * A lazy authentication hook that only initializes Firebase Auth
 * when the component actually needs it.
 * 
 * This improves initial page load performance by deferring
 * Firebase Auth initialization until it's actually needed.
 * 
 * @param {Object} options
 * @param {boolean} options.immediate - If true, initializes auth immediately on mount
 * @returns {Object} Auth state and methods
 */
export const useLazyAuth = (options = {}) => {
  const { immediate = false } = options;
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  // Initialize auth on demand
  const initialize = useCallback(async () => {
    if (typeof window === 'undefined') {
      setLoading(false);
      return null;
    }
    
    try {
      const currentUser = await initializeAuth();
      setUser(currentUser);
      setInitialized(true);
      setLoading(false);
      return currentUser;
    } catch (err) {
      setError(err);
      setLoading(false);
      return null;
    }
  }, []);

  // Subscribe to auth state changes
  useEffect(() => {
    // If immediate mode or auth already initialized, subscribe right away
    if (immediate || isAuthInitialized()) {
      const unsubscribe = subscribeToAuthState((user) => {
        setUser(user);
        setInitialized(true);
        setLoading(false);
      });
      
      return unsubscribe;
    } else {
      // Not immediate mode and not initialized - just mark as not loading
      setLoading(false);
    }
  }, [immediate]);

  // Lazy import auth functions only when needed
  const getAuthFunctions = useCallback(async () => {
    const auth = getAuthLazy();
    if (!auth) return null;
    
    // Dynamically import auth functions
    const { 
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      signOut,
      sendPasswordResetEmail,
      signInWithPopup,
      GoogleAuthProvider,
      updateProfile
    } = await import('firebase/auth');
    
    return {
      auth,
      signInWithEmailAndPassword: (email, password) => 
        signInWithEmailAndPassword(auth, email, password),
      createUserWithEmailAndPassword: (email, password) => 
        createUserWithEmailAndPassword(auth, email, password),
      signOut: () => signOut(auth),
      sendPasswordResetEmail: (email) => sendPasswordResetEmail(auth, email),
      signInWithGoogle: async () => {
        const provider = new GoogleAuthProvider();
        return signInWithPopup(auth, provider);
      },
      updateProfile: (user, profile) => updateProfile(user, profile),
    };
  }, []);

  // Login function - initializes auth on first call
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      await initialize();
      const authFns = await getAuthFunctions();
      if (!authFns) throw new Error('Auth not available');
      
      const result = await authFns.signInWithEmailAndPassword(email, password);
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initialize, getAuthFunctions]);

  // Signup function
  const signup = useCallback(async (email, password) => {
    setLoading(true);
    try {
      await initialize();
      const authFns = await getAuthFunctions();
      if (!authFns) throw new Error('Auth not available');
      
      const result = await authFns.createUserWithEmailAndPassword(email, password);
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initialize, getAuthFunctions]);

  // Logout function
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      const authFns = await getAuthFunctions();
      if (authFns) {
        await authFns.signOut();
      }
      setUser(null);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getAuthFunctions]);

  // Google sign-in
  const signInWithGoogle = useCallback(async () => {
    setLoading(true);
    try {
      await initialize();
      const authFns = await getAuthFunctions();
      if (!authFns) throw new Error('Auth not available');
      
      const result = await authFns.signInWithGoogle();
      setUser(result.user);
      return result.user;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [initialize, getAuthFunctions]);

  // Password reset
  const resetPassword = useCallback(async (email) => {
    try {
      await initialize();
      const authFns = await getAuthFunctions();
      if (!authFns) throw new Error('Auth not available');
      
      await authFns.sendPasswordResetEmail(email);
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [initialize, getAuthFunctions]);

  return {
    user,
    loading,
    initialized,
    error,
    // Methods
    initialize,
    login,
    signup,
    logout,
    signInWithGoogle,
    resetPassword,
    // Direct access to auth functions for advanced use
    getAuthFunctions,
  };
};

export default useLazyAuth;

