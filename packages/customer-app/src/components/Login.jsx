"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';

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
    } catch (error) {
      console.error('Apple sign-in error:', error);
      showToast('error', t('auth.login.signInFailed', 'Failed to sign in. Please try again.'));
      setLoading(false);
      setLoadingProvider(null);
    }
  }, [signInWithApple, t]);

  return (
    <div
      className="relative min-h-screen bg-[var(--bg-primary)] overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Dot grid background — matches hero */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(var(--tufts-blue, #4975D4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" aria-hidden="true" />

      {/* Content */}
      <div className={`relative z-10 min-h-screen flex items-center justify-center px-4 py-8 sm:py-12 transition-opacity duration-150 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[var(--bg-secondary)] p-6 sm:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <p className="text-sm font-medium tracking-widest uppercase text-text-muted mb-3">
                {t('auth.login.welcome', 'Welcome Back')}
              </p>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-3">
                <span className="text-tufts-blue">{t('auth.login.signIn', 'Sign in')}</span>{' '}
                <span className="text-eerie-black">{t('auth.login.or', 'or')}</span>{' '}
                <span className="text-eerie-black">{t('auth.login.getStarted', 'get started')}</span>
              </h1>
              <p className="text-text-muted text-sm">
                {t('auth.login.quickAccess', 'Quick and secure access with your Google or Apple account')}
              </p>
            </div>

            {/* Divider */}
            <div className="w-full h-px mb-8" style={{ backgroundColor: 'var(--divider)' }} />

            {/* Sign In Buttons */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading || !mounted}
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-full hover:bg-[var(--hover-bg)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingProvider === 'google' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[var(--text-muted)]" />
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
                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-full hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--login-bg)', color: 'var(--login-text)' }}
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

            {/* Terms */}
            <p className="mt-6 text-xs text-text-muted text-center">
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

          {/* Download App CTA — matches ActivationSection style */}
          <div className="mt-4 bg-[var(--bg-secondary)] p-6 sm:p-8">
            <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-1 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('auth.login.downloadApp', 'Download our app')}
            </p>
            <p className={`text-sm text-text-muted mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('auth.login.appDescription', 'Get instant eSIM activation and manage your plans on the go.')}
            </p>

            <div className={`flex flex-col sm:flex-row gap-3 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
              <a
                href={appStoreLinks.ios}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-gray-900 pl-5 pr-1 py-1 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-gray-800 hover:scale-[1.02] w-full sm:w-auto"
              >
                <span className="flex-1 text-center">{t('activation.appStore', 'App Store')}</span>
                <span className="ml-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white/20 w-8 h-8">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                  </svg>
                </span>
              </a>
              <a
                href={appStoreLinks.android}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[var(--bg-primary)] pl-5 pr-1 py-1 text-sm font-semibold text-text-primary ring-1 ring-[var(--card-border)] shadow-sm transition-all duration-150 hover:bg-[var(--hover-bg)] hover:scale-[1.02] w-full sm:w-auto"
              >
                <span className="flex-1 text-center">{t('activation.googlePlay', 'Google Play')}</span>
                <span className="ml-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-[var(--subtle-bg)] w-8 h-8">
                  <svg className="w-4 h-4 text-text-primary" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/>
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
