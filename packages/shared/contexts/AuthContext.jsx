'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { generateOTPWithTimestamp } from '../utils/otpUtils';
import { sendVerificationEmail } from '../services/emailService';
import { hasAdminAccess, hasSuperAdminAccess, hasAdminPermission } from '../services/adminService';
import { processReferralUsage } from '../services/referralService';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  async function signup(email, password, displayName, referralCode = null, recaptchaToken = null) {
    try {
      // Verify reCAPTCHA token if provided
      if (recaptchaToken) {
        try {
          const verifyResponse = await fetch('/api/verify-recaptcha', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: recaptchaToken }),
          });

          const verifyData = await verifyResponse.json();
          
          if (!verifyData.success) {
            throw new Error('reCAPTCHA verification failed. Please try again.');
          }
        } catch {
          throw new Error('Failed to verify reCAPTCHA. Please try again.');
        }
      }
      
      // Generate and send verification OTP first (before creating account)
      const otpData = generateOTPWithTimestamp(10); // 10 minutes expiry
      const emailSent = await sendVerificationEmail(email, displayName, otpData.otp);
      
      if (!emailSent) {
        throw new Error('Failed to send verification email. Please try again.');
      }
      
      // Store pending signup data in localStorage (not in Firebase yet)
      const pendingSignup = {
        email,
        password,
        displayName,
        referralCode,
        otp: otpData.otp,
        expiresAt: otpData.expiresAt,
        timestamp: Date.now()
      };
      
      localStorage.setItem('pendingSignup', JSON.stringify(pendingSignup));
      
      return { pending: true, otp: otpData.otp, emailSent };
    } catch (error) {
      throw error;
    }
  }

  async function login(email, password, recaptchaToken = null) {
    try {
      // Verify reCAPTCHA token if provided
      if (recaptchaToken) {
        try {
          const verifyResponse = await fetch('/api/verify-recaptcha', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token: recaptchaToken }),
          });

          const verifyData = await verifyResponse.json();
          
          if (!verifyData.success) {
            throw new Error('reCAPTCHA verification failed. Please try again.');
          }
          
        } catch {
          throw new Error('Failed to verify reCAPTCHA. Please try again.');
        }
      }
      
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      return user;
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  }

  async function resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  }

  async function signInWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Get current language preference from localStorage
        const preferredLanguage = typeof window !== 'undefined' ? 
          localStorage.getItem('Simnetiq-language') || 'en' : 'en';
        
        // Create user profile directly
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName,
          createdAt: new Date(),
          role: 'customer',
          emailVerified: true,
          referredBy: null,
          referralCodeUsed: false,
          preferredLanguage: preferredLanguage
        });

        // Automatically add user to newsletter collection
        try {
          await addToNewsletter(user.email, user.displayName, 'web_dashboard');
        } catch {
          // Don't fail the signup if newsletter addition fails
        }
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  async function signInWithApple() {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      const { user } = await signInWithPopup(auth, provider);
      
      // Check if user profile exists, if not create it
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        // Get current language preference from localStorage
        const preferredLanguage = typeof window !== 'undefined' ? 
          localStorage.getItem('Simnetiq-language') || 'en' : 'en';
        
        // Create user profile directly
        await setDoc(doc(db, 'users', user.uid), {
          email: user.email,
          displayName: user.displayName || 'Apple User',
          createdAt: new Date(),
          role: 'customer',
          emailVerified: true,
          referredBy: null,
          referralCodeUsed: false,
          preferredLanguage: preferredLanguage,
          authProvider: 'apple'
        });

        // Automatically add user to newsletter collection
        try {
          await addToNewsletter(user.email, user.displayName || 'Apple User', 'web_dashboard');
        } catch {
          // Don't fail the signup if newsletter addition fails
        }
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  async function completeGoogleSignup() {
    try {
      const pendingUserData = localStorage.getItem('pendingUserData');
      if (!pendingUserData) {
        throw new Error('No pending user data found');
      }

      const userData = JSON.parse(pendingUserData);
      const currentUser = auth?.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user found');
      }

      // Get current language preference from localStorage
      const preferredLanguage = typeof window !== 'undefined' ? 
        localStorage.getItem('Simnetiq-language') || 'en' : 'en';

      // Create user profile in Firestore
      await setDoc(doc(db, 'users', currentUser.uid), {
        email: currentUser.email,
        displayName: currentUser.displayName,
        createdAt: new Date(),
        role: 'customer',
        emailVerified: true,
        referredBy: userData.referralCode || null,
        referralCodeUsed: !!userData.referralCode,
        preferredLanguage: preferredLanguage
      });

      // Process referral code if provided
      if (userData.referralCode && userData.referralCode.trim() !== '') {
        try {
          await processReferralUsage(userData.referralCode, currentUser.uid);
        } catch {
          // Don't fail the signup if referral processing fails
        }
      }

      // Clean up pending data
      localStorage.removeItem('pendingUserData');
      
      return currentUser;
    } catch (error) {
      throw error;
    }
  }

  async function verifyEmailOTP(otp) {
    try {
      // Check if there's a pending signup
      const pendingSignupData = localStorage.getItem('pendingSignup');
      if (!pendingSignupData) {
        throw new Error('No pending signup found. Please register again.');
      }

      const pendingSignup = JSON.parse(pendingSignupData);

      // Check if OTP has expired
      if (Date.now() > pendingSignup.expiresAt) {
        localStorage.removeItem('pendingSignup');
        throw new Error('Verification code has expired. Please register again.');
      }

      // Verify OTP
      if (otp !== pendingSignup.otp) {
        throw new Error('Invalid verification code. Please check and try again.');
      }

      // Check for referral code from pendingUserData
      const pendingUserData = localStorage.getItem('pendingUserData');
      let referralCode = pendingSignup.referralCode || null;
      
      if (pendingUserData) {
        const userData = JSON.parse(pendingUserData);
        referralCode = userData.referralCode || referralCode;
        // Clean up pendingUserData
        localStorage.removeItem('pendingUserData');
      }

      // Create Firebase account only after successful verification
      const { user } = await createUserWithEmailAndPassword(auth, pendingSignup.email, pendingSignup.password);
      
      // Update profile with display name
      await updateProfile(user, { displayName: pendingSignup.displayName });
      
      // Get current language preference from localStorage
      const preferredLanguage = typeof window !== 'undefined' ? 
        localStorage.getItem('Simnetiq-language') || 'en' : 'en';
      
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: pendingSignup.displayName,
        createdAt: new Date(),
        role: 'customer',
        emailVerified: true,
        referredBy: referralCode || null,
        referralCodeUsed: !!referralCode,
        preferredLanguage: preferredLanguage
      });

      // Process referral code if provided
      if (referralCode && referralCode.trim() !== '') {
        try {
          await processReferralUsage(referralCode, user.uid);
        } catch {
          // Don't fail the signup if referral processing fails
        }
      }

      // Automatically add user to newsletter collection
      try {
        await addToNewsletter(user.email, pendingSignup.displayName, 'web_dashboard');
      } catch {
        // Don't fail the signup if newsletter addition fails
      }

      // Clear pending signup data
      localStorage.removeItem('pendingSignup');

      return user;
    } catch (error) {
      throw error;
    }
  }

  async function updateUserProfile(updates) {
    try {
      if (currentUser) {
        await setDoc(doc(db, 'users', currentUser.uid), updates, { merge: true });
        setUserProfile(prev => ({ ...prev, ...updates }));
      }
    } catch (error) {
      throw error;
    }
  }

  const loadUserProfile = useCallback(async () => {
    if (currentUser && db) {
      try {
        // First try to get by UID
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        let profileData = null;
        
        if (userDoc.exists()) {
          profileData = userDoc.data();
        }
        
        // Always also check by email to find admin documents
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', currentUser.email));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          // Look for admin role first
          let adminDoc = null;
          for (const doc of querySnapshot.docs) {
            const data = doc.data();
            if (data.role === 'admin' || data.role === 'super_admin') {
              adminDoc = doc;
              break;
            }
          }
          
          if (adminDoc) {
            const adminProfileData = adminDoc.data();
            setUserProfile(adminProfileData);
          } else if (profileData) {
            setUserProfile(profileData);
          }
        } else if (profileData) {
          setUserProfile(profileData);
        }
      } catch {
        // Silent error handling for security
      }
    }
  }, [currentUser]);

  useEffect(() => {
    const authInstance = auth;
    if (!authInstance) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          await loadUserProfile();
        } catch {
          // Silent error
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [loadUserProfile]);

  const value = {
    currentUser,
    userProfile,
    loading,
    signup,
    login,
    logout,
    resetPassword,
    signInWithGoogle,
    signInWithApple,
    completeGoogleSignup,
    verifyEmailOTP,
    updateUserProfile,
    loadUserProfile,
    // Admin functions
    hasAdminAccess: () => hasAdminAccess(userProfile),
    hasSuperAdminAccess: () => hasSuperAdminAccess(userProfile),
    hasAdminPermission: (permission) => hasAdminPermission(userProfile, permission)
  };

  // Helper function to add user to newsletter collection
  // Fixed: displayName and source parameters are used in the addDoc call below
  async function addToNewsletter(email, displayName, source) {
    try {
      // Check if email already exists in newsletter collection
      const existingQuery = query(
        collection(db, 'newsletter'),
        where('email', '==', email)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (existingSnapshot.empty) {
        // Create new newsletter subscription with all provided data
        await addDoc(collection(db, 'newsletter'), {
          email: email,
          displayName: displayName,
          source: source,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      throw error;
    }
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

