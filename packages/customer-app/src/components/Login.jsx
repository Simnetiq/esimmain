"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

// Lazy load Lottie to reduce initial bundle size
const Lottie = dynamic(() => import('lottie-react'), {
  ssr: false,
  loading: () => <div className="animate-pulse w-full h-full bg-gray-200 rounded-lg"></div>
});

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animationData, setAnimationData] = useState(null);
  const [honeypot, setHoneypot] = useState('');
  const [mounted, setMounted] = useState(false);
  const { login, signInWithGoogle } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { executeRecaptcha } = useGoogleReCaptcha();

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

  // Get current language for localized URLs - prioritize locale from context
  const currentLanguage = React.useMemo(() => {
    try {
      // Wait for I18n to initialize before using locale
      if (i18nLoading) {
        // While loading, use localStorage or pathname detection
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      // Once loaded, prioritize locale from I18nContext
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  // Only calculate RTL after mount to prevent hydration mismatch
  const isRTL = mounted ? getLanguageDirection(currentLanguage) === 'rtl' : false;

  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Honeypot check: silently abort if filled
    if (honeypot && honeypot.trim() !== '') {
      return;
    }

    // Sanitize inputs
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedPassword = (password || '').toString();
    
    if (!normalizedEmail || !normalizedPassword) {
      toast.error(t('auth.login.fillAllFields', 'Please fill in all fields'));
      return;
    }

    try {
      setLoading(true);
      
      // Execute reCAPTCHA if available
      let recaptchaToken = null;
      if (executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha('login');
        } catch (recaptchaError) {
          console.warn('reCAPTCHA execution failed:', recaptchaError);
          // Continue without reCAPTCHA token
        }
      }
      // Add a small jitter to reduce timing predictability
      await new Promise((r) => setTimeout(r, 80 + Math.floor(Math.random() * 120)));
      
      await login(normalizedEmail, normalizedPassword, recaptchaToken);
      toast.success(t('auth.login.loginSuccessful', 'Login successful!'));
      // Get current language and redirect to appropriate dashboard
      const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.push(dashboardUrl);
    } catch {
      toast.error(t('auth.login.loginFailed', 'Failed to login'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
      toast.success(t('auth.login.googleSignInSuccessful', 'Signed in with Google successfully!'));
      // Get current language and redirect to appropriate dashboard
      const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.push(dashboardUrl);
    } catch {
      toast.error(t('auth.login.googleSignInFailed', 'Failed to sign in with Google'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-white max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className={`flex flex-col ${isRTL ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}>
        {/* Left Side - Form Content */}
        <div className={`w-full px-4 ${isRTL ? 'lg:w-full' : 'lg:w-1/2'}`}>
          {/* Header Section */}
          <div className="mx-auto w-full">
            <div className="mx-auto max-w-2xl mt-10 sm:mt-40">
              <div className="mx-auto max-w-2xl pt-10 sm:pt-0">
              <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 text-start rtl:font-bold rtl:tracking-tight">
                  {t('auth.login.welcome', 'Welcome Back')}
                </p>
                <h2 className="my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
                  {t('auth.login.title', 'Sign in to your account')}
                </h2>
                <p className="mt-4 text-start text-sm sm:text-base text-cool-black">
                  {t('auth.login.subtitle', 'Or')}{' '}
                  <Link
                    href={getLocalizedUrl('/register')}
                    className="font-semibold text-tufts-blue hover:text-cobalt-blue transition-colors"
                  >
                    {t('auth.login.createAccount', 'create a new account')}
                  </Link>
                </p>
              </div>
            </div>
          </div>
          <div className="w-full my-4 h-px bg-gray-100"></div>

          {/* Form Section */}
          <div className="mx-auto max-w-2xl">
            <form className="space-y-4 max-w-md" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm sm:text-base font-medium text-cool-black mb-2 text-start">
                    {t('auth.login.emailLabel', 'Email address')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 px-2 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-cool-black opacity-60" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field w-full pl-12 py-1.5"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      inputMode="email"
                      maxLength={254}
                      placeholder={t('auth.login.emailPlaceholder', 'Enter your email')}
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm sm:text-base font-medium text-cool-black mb-2 text-start">
                    {t('auth.login.passwordLabel', 'Password')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 px-2 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-cool-black opacity-60" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field w-full pl-12 pr-12 py-1.5"
                      maxLength={128}
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder={t('auth.login.passwordPlaceholder', 'Enter your password')}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 px-2 flex items-center hover:bg-gray-50 rounded-r-lg transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-cool-black opacity-60" />
                      ) : (
                        <Eye className="h-5 w-5 text-cool-black opacity-60" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-start">
                <div className="text-sm sm:text-base text-start">
                  <Link
                    href="/forgot-password"
                    className="font-semibold text-tufts-blue hover:text-cobalt-blue transition-colors"
                  >
                    {t('auth.login.forgotPassword', 'Forgot your password?')}
                  </Link>
                </div>
              </div>

              {/* reCAPTCHA Notice */}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Shield className="w-3 h-3" />
                <span>{t('auth.login.protectedByRecaptcha', 'Protected by reCAPTCHA')}</span>
              </div>

              {/* Honeypot field (hidden from users) */}
              <label htmlFor="company" className="sr-only">Company</label>
              <input
                id="company"
                name="company"
                type="text"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
              />

              <div className="space-y-4 items-start justify-start">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-1.5 flex items-center justify-center text-start"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    t('auth.login.signInButton', 'Sign in')
                  )}
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-sm sm:text-base text-cool-black">
                      {t('auth.login.orContinueWith', 'Or continue with')}
                    </span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="btn-secondary w-full py-1.5 flex justify-center items-center"
                >
                  <svg className={`h-6 w-6 ${isRTL ? 'ml-2' : 'mr-2'}`} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {t('auth.login.signInWithGoogle', 'Sign in with Google')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side - Full Height Lottie Animation (hidden on mobile, visible on lg+, hidden in RTL) */}
        {!isRTL && (
          <div className="hidden lg:block lg:w-1/2  max-w-7xl mx-auto lg:right-0 lg:top-0 lg:h-screen lg:pt-20">
            <div className="relative h-full w-full flex items-center justify-center ">
              {animationData && (
                <Lottie 
                  animationData={animationData}
                  loop={true}
                  className="w-full h-full max-w-2xl"
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Login = () => {
  const recaptchaSiteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  
  // Allow login to work without reCAPTCHA in development
  if (!recaptchaSiteKey) {
    console.warn('reCAPTCHA site key is not configured - running without reCAPTCHA protection');
    return <LoginForm />;
  }
  
  return (
    <GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
      <LoginForm />
    </GoogleReCaptchaProvider>
  );
};

export default Login;
