"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import BackgroundDecor from './ui/BackgroundDecor';

// Lazy load toast to reduce initial bundle
const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

// Inline SVG icons
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const SmartphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { signInWithGoogle, signInWithApple } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  // SSR-safe language from pathname — consistent between server and client
  const ssrSafeLanguage = useMemo(() => detectLanguageFromPath(pathname) || 'en', [pathname]);

  const currentLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return ssrSafeLanguage;
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, ssrSafeLanguage, i18nLoading]);

  // Use pathname-based language for direction to avoid hydration mismatch
  const isRTL = getLanguageDirection(ssrSafeLanguage) === 'rtl';

  const getLocalizedUrl = useCallback((path) => {
    if (currentLanguage === 'en') return path;
    return `/${currentLanguage}${path}`;
  }, [currentLanguage]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingProvider('google');
      await signInWithGoogle();
      // signInWithOAuth resolves before the browser navigates to Google.
      // Do NOT show success or redirect here — /auth/callback handles that
      // after the PKCE exchange completes and session is confirmed.
    } catch (error) {
      console.error('Google sign-in error:', error);
      showToast('error', t('auth.login.signInFailed', 'Failed to sign in. Please try again.'));
      setLoading(false);
      setLoadingProvider(null);
    }
  }, [signInWithGoogle, t]);

  const handleAppleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingProvider('apple');
      await signInWithApple();
      // Same as Google — browser navigates to Apple; /auth/callback handles the rest.
    } catch (error) {
      console.error('Apple sign-in error:', error);
      showToast('error', t('auth.login.signInFailed', 'Failed to sign in. Please try again.'));
      setLoading(false);
      setLoadingProvider(null);
    }
  }, [signInWithApple, t]);

  return (
    <div
      className="min-h-screen relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <BackgroundDecor />

      {/* Content - Centered. Opacity transition prevents blink on hydration. */}
      <div className={`relative min-h-screen flex items-center justify-center px-4 py-12 transition-opacity duration-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white/80 backdrop-blur-sm shadow-2xl shadow-gray-200/40 p-8 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-sm font-medium tracking-widest uppercase text-gray-500 mb-3">
                {t('auth.login.welcome', 'Welcome Back')}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold text-eerie-black tracking-tight mb-3">
                {t('auth.login.title', 'Sign in to your account')}
              </h1>
              <p className="text-gray-600 text-sm">
                {t('auth.login.quickAccess', 'Quick and secure access with your Google or Apple account')}
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gray-200 mb-8" />

            {/* Sign In Buttons */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || !mounted}
                className="group w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProvider === 'google' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600" />
                ) : (
                  <GoogleIcon />
                )}
                <span className="text-base font-medium text-eerie-black">
                  {t('auth.login.continueWithGoogle', 'Continue with Google')}
                </span>
              </button>

              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={loading || !mounted}
                className="group w-full flex items-center justify-center gap-3 px-6 py-4 bg-eerie-black text-white rounded-full hover:bg-gray-800 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProvider === 'apple' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <AppleIcon />
                )}
                <span className="text-base font-medium">
                  {t('auth.login.continueWithApple', 'Continue with Apple')}
                </span>
              </button>
            </div>

            {/* Info Card */}
            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                  <SmartphoneIcon className="w-5 h-5 text-tufts-blue" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-eerie-black mb-1">
                    {t('auth.login.downloadApp', 'Download our app')}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {t('auth.login.appDescription', 'Get instant eSIM activation and manage your plans on the go.')}
                  </p>
                  <a
                    href="https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-tufts-blue hover:text-cobalt-blue transition-colors"
                  >
                    {t('auth.login.getOnAppStore', 'App Store')}
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            {/* Terms */}
            <p className="mt-6 text-xs text-gray-500 text-center">
              {t('auth.login.termsNotice', 'By continuing, you agree to our')}{' '}
              <Link href={getLocalizedUrl('/terms-of-service')} className="text-tufts-blue hover:underline">
                {t('auth.login.termsOfService', 'Terms of Service')}
              </Link>{' '}
              {t('auth.login.and', 'and')}{' '}
              <Link href={getLocalizedUrl('/privacy-policy')} className="text-tufts-blue hover:underline">
                {t('auth.login.privacyPolicy', 'Privacy Policy')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
