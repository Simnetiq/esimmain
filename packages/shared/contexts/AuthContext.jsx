'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getSupabase } from '../lib/supabase';
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

  const supabase = getSupabase();

  // During build-time prerendering, supabase may be null. Render children with
  // default context values so the page shell can be generated.
  if (!supabase) {
    return (
      <AuthContext.Provider value={{ currentUser: null, loading: false, userProfile: null }}>
        {children}
      </AuthContext.Provider>
    );
  }

  async function loginAsGuest() {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;

      const user = data.user;

      // Create a guest profile if needed
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!existing) {
        const preferredLanguage = typeof window !== 'undefined'
          ? localStorage.getItem('Simnetiq-language') || 'en' : 'en';

        await supabase.from('users').insert({
          id: user.id,
          is_anonymous: true,
          role: 'customer',
          preferred_language: preferredLanguage,
          display_name: 'Guest User',
        });
      }

      return user;
    } catch (error) {
      console.error('Error signing in as guest:', error);
      throw error;
    }
  }

  async function signup(email, password, displayName, referralCode = null, recaptchaToken = null) {
    try {
      // Verify reCAPTCHA token if provided
      if (recaptchaToken) {
        try {
          const verifyResponse = await fetch('/api/verify-recaptcha', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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

      // Store pending signup data in localStorage (not in DB yet)
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
            headers: { 'Content-Type': 'application/json' },
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

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return data.user;
    } catch (error) {
      throw error;
    }
  }

  async function logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  async function resetPassword(email) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
      });
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }

  async function signInWithGoogle() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      });
      if (error) throw error;
      // OAuth redirects — user profile creation happens in onAuthStateChange
      return data;
    } catch (error) {
      throw error;
    }
  }

  async function signInWithApple() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      });
      if (error) throw error;
      return data;
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
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('No authenticated user found');
      }

      const preferredLanguage = typeof window !== 'undefined'
        ? localStorage.getItem('Simnetiq-language') || 'en' : 'en';

      await supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        display_name: user.user_metadata?.full_name || user.email,
        role: 'customer',
        email_verified: true,
        referred_by: userData.referralCode || null,
        referral_code_used: !!userData.referralCode,
        preferred_language: preferredLanguage,
      });

      // Process referral code if provided
      if (userData.referralCode && userData.referralCode.trim() !== '') {
        try {
          await processReferralUsage(userData.referralCode, user.id);
        } catch {
          // Don't fail the signup if referral processing fails
        }
      }

      localStorage.removeItem('pendingUserData');
      return user;
    } catch (error) {
      throw error;
    }
  }

  async function verifyEmailOTP(otp) {
    try {
      const pendingSignupData = localStorage.getItem('pendingSignup');
      if (!pendingSignupData) {
        throw new Error('No pending signup found. Please register again.');
      }

      const pendingSignup = JSON.parse(pendingSignupData);

      if (Date.now() > pendingSignup.expiresAt) {
        localStorage.removeItem('pendingSignup');
        throw new Error('Verification code has expired. Please register again.');
      }

      if (otp !== pendingSignup.otp) {
        throw new Error('Invalid verification code. Please check and try again.');
      }

      // Check for referral code from pendingUserData
      const pendingUserData = localStorage.getItem('pendingUserData');
      let referralCode = pendingSignup.referralCode || null;

      if (pendingUserData) {
        const userData = JSON.parse(pendingUserData);
        referralCode = userData.referralCode || referralCode;
        localStorage.removeItem('pendingUserData');
      }

      // Create Supabase auth account
      const { data, error } = await supabase.auth.signUp({
        email: pendingSignup.email,
        password: pendingSignup.password,
        options: {
          data: {
            display_name: pendingSignup.displayName,
          },
          // Skip email confirmation since we already verified via OTP
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
        },
      });
      if (error) throw error;

      const user = data.user;
      const preferredLanguage = typeof window !== 'undefined'
        ? localStorage.getItem('Simnetiq-language') || 'en' : 'en';

      // Create user profile in users table
      await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        display_name: pendingSignup.displayName,
        role: 'customer',
        email_verified: true,
        referred_by: referralCode || null,
        referral_code_used: !!referralCode,
        preferred_language: preferredLanguage,
      });

      // Process referral code if provided
      if (referralCode && referralCode.trim() !== '') {
        try {
          await processReferralUsage(referralCode, user.id);
        } catch {
          // Don't fail the signup if referral processing fails
        }
      }

      // Add to newsletter
      try {
        await addToNewsletter(user.email, pendingSignup.displayName, 'web_dashboard');
      } catch {
        // Don't fail if newsletter addition fails
      }

      localStorage.removeItem('pendingSignup');
      return user;
    } catch (error) {
      throw error;
    }
  }

  async function updateUserProfile(updates) {
    try {
      if (currentUser) {
        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', currentUser.id);
        if (error) throw error;
        setUserProfile(prev => ({ ...prev, ...updates }));
      }
    } catch (error) {
      throw error;
    }
  }

  const loadUserProfile = useCallback(async () => {
    if (!currentUser) return;

    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // PGRST116 = not found, which is OK for new OAuth users
        console.error('Error loading profile:', error);
        return;
      }

      if (profile) {
        setUserProfile(profile);
      } else {
        // Auto-create profile for OAuth users on first login
        const preferredLanguage = typeof window !== 'undefined'
          ? localStorage.getItem('Simnetiq-language') || 'en' : 'en';

        const newProfile = {
          id: currentUser.id,
          email: currentUser.email,
          display_name: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email,
          role: 'customer',
          email_verified: !!currentUser.email_confirmed_at,
          preferred_language: preferredLanguage,
        };

        const { data: created, error: createError } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single();

        if (!createError && created) {
          setUserProfile(created);

          // Add to newsletter for new users
          try {
            await addToNewsletter(currentUser.email, newProfile.display_name, 'web_dashboard');
          } catch {
            // Ignore
          }
        }
      }
    } catch {
      // Silent error handling for security
    }
  }, [currentUser]);

  useEffect(() => {
    let isMounted = true;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        const user = session?.user ?? null;
        setCurrentUser(user);

        if (!user) {
          setUserProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load profile when user changes
  useEffect(() => {
    if (currentUser) {
      loadUserProfile();
    }
  }, [currentUser, loadUserProfile]);

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
    loginAsGuest,
    // Admin functions
    hasAdminAccess: () => hasAdminAccess(userProfile),
    hasSuperAdminAccess: () => hasSuperAdminAccess(userProfile),
    hasAdminPermission: (permission) => hasAdminPermission(userProfile, permission),
  };

  async function addToNewsletter(email, displayName, source) {
    try {
      const { data: existing } = await supabase
        .from('newsletter_subscriptions')
        .select('id')
        .eq('email', email)
        .single();

      if (!existing) {
        await supabase.from('newsletter_subscriptions').insert({
          email,
          name: displayName,
          source,
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
