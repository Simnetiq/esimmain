"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import toast from 'react-hot-toast';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

// Lazy load Lottie to reduce initial bundle size
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="animate-pulse w-full h-full bg-gray-100 rounded-lg" />
});

// Inline SVG icons to avoid lucide-react bundle overhead
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
  const [redirecting, setRedirecting] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [mounted, setMounted] = useState(false);
  const { signInWithGoogle, signInWithApple } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  // Prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load Lottie animation
  useEffect(() => {
    fetch('/images/logo_icon/LoginCharacterAnimation.json')
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(() => {});
  }, []);

  // Get current language for localized URLs
  const currentLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  // Only calculate RTL after mount to prevent hydration mismatch
  const isRTL = mounted ? getLanguageDirection(currentLanguage) === 'rtl' : false;

  const getLocalizedUrl = useCallback((path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  }, [currentLanguage]);

  const handleGoogleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingProvider('google');
      await signInWithGoogle();
      toast.success(t('auth.login.signInSuccessful', 'Signed in successfully!'));
      setRedirecting(true);
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.push(dashboardUrl);
      // Don't reset loading - let the redirect happen with loading state
      return;
    } catch (error) {
      console.error('Google sign-in error:', error);
      toast.error(t('auth.login.signInFailed', 'Failed to sign in. Please try again.'));
      setLoading(false);
      setLoadingProvider(null);
    }
  }, [signInWithGoogle, t, currentLanguage, router]);

  const handleAppleSignIn = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingProvider('apple');
      await signInWithApple();
      toast.success(t('auth.login.signInSuccessful', 'Signed in successfully!'));
      setRedirecting(true);
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.push(dashboardUrl);
      // Don't reset loading - let the redirect happen with loading state
      return;
    } catch (error) {
      console.error('Apple sign-in error:', error);
      toast.error(t('auth.login.signInFailed', 'Failed to sign in. Please try again.'));
      setLoading(false);
      setLoadingProvider(null);
    }
  }, [signInWithApple, t, currentLanguage, router]);

  // Loading skeleton
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue" />
      </div>
    );
  }

  // Full-screen redirecting state to prevent empty flash
  if (redirecting) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue mx-auto mb-4" />
          <p className="text-gray-600 font-medium">{t('auth.login.redirecting', 'Taking you to your dashboard...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto px-4">
        <div className={`flex flex-col ${isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row'} min-h-screen`}>
          {/* Left Side - Content */}
          <div className={`w-full flex flex-col justify-center py-12 lg:py-0 ${isRTL ? 'lg:w-full' : 'lg:w-1/2'}`}>
            <div className="max-w-md mx-auto w-full">
              {/* Header */}
              <div className="mb-8">
                <p className="text-sm font-medium tracking-widest uppercase text-gray-500 mb-4">
                  {t('auth.login.welcome', 'Welcome Back')}
                </p>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-eerie-black tracking-tight mb-4">
                  {t('auth.login.title', 'Sign in to your account')}
                </h1>
                <p className="text-gray-600">
                  {t('auth.login.quickAccess', 'Quick and secure access with your Google or Apple account')}
                </p>
              </div>

              {/* Divider */}
              <div className="w-full h-px bg-gray-100 mb-8" />

              {/* Sign In Buttons */}
              <div className="space-y-4">
                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

                {/* Continue with Apple */}
                <button
                  type="button"
                  onClick={handleAppleSignIn}
                  disabled={loading}
                  className="group w-full flex items-center justify-center gap-3 px-6 py-4 bg-eerie-black text-white rounded-full hover:bg-gray-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      {t('auth.login.getOnAppStore', 'Get on App Store')}
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

          {/* Right Side - Lottie Animation (hidden on mobile and RTL) */}
          {!isRTL && (
            <div className="hidden lg:flex lg:w-1/2 items-center justify-center">
              <div className="w-full max-w-lg">
                {animationData && (
                  <Lottie 
                    animationData={animationData}
                    loop={true}
                    className="w-full h-auto"
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
