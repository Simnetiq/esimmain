'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import AccountSettings from './dashboard/AccountSettings';

// Lazy load toast
const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
};



const ArrowLeftIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const LogOutIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);

// Grid pattern style
const gridPatternStyle = {
  backgroundSize: '10px 10px',
  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
};

// Skeleton component
const SettingsSkeleton = () => (
  <div className="min-h-screen bg-white relative overflow-hidden">
    <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
    <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
    
    <div className="relative pt-8 lg:pt-16 pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-10 h-10 bg-gray-200 animate-pulse" />
          <div>
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        
        {/* Content skeleton */}
        <div className="space-y-6">
          <div className="bg-gray-50 p-6">
            <div className="h-5 w-40 bg-gray-200 rounded animate-pulse mb-4" /> 
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                  <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Settings = () => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const { currentUser, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Language detection
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

  const isRTL = mounted ? getLanguageDirection(currentLanguage) === 'rtl' : false;

  const getLocalizedUrl = useCallback((path) => {
    if (currentLanguage === 'en') return path;
    return `/${currentLanguage}${path}`;
  }, [currentLanguage]);

  // Load user profile
  const loadUserProfile = useCallback(async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        setUserProfile(userSnap.data());
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !loading && !currentUser) {
      router.push(getLocalizedUrl('/login'));
    }
  }, [authLoading, loading, currentUser, router, getLocalizedUrl]);

  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      showToast('success', t('settings.loggedOutSuccessfully', 'Logged out successfully'));
      router.push(getLocalizedUrl('/'));
    } catch {
      showToast('error', t('settings.failedToLogout', 'Failed to logout'));
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout, t, router, getLocalizedUrl]);

  // Loading state
  if (!mounted || authLoading || loading) {
    return <SettingsSkeleton />;
  }

  // Redirect state (prevents flash)
  if (!currentUser) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-white relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.08)' }} />
      <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full blur-[100px] translate-x-1/3 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.06)' }} />

      {/* Grid Pattern */}
      <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
      <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />

      {/* Header Section */}
      <div className="relative pt-8 lg:pt-16 pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Back Link */}
          <Link 
            href={getLocalizedUrl('/dashboard')}
            className={`inline-flex items-center gap-2 text-eerie-black hover:text-tufts-blue font-medium transition-colors mb-6 `}
          >
            <ArrowLeftIcon className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t('settings.backToDashboard', 'Back to Dashboard')}
          </Link>

        </div>
      </div>

      {/* Account Settings Section */}
      <div className="relative">
        <AccountSettings 
          currentUser={currentUser} 
          userProfile={userProfile} 
          onLoadUserProfile={loadUserProfile}
        />
      </div>

      {/* Logout Section */}
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pb-8">
        <div className="bg-white shadow-lg shadow-gray-200/50 p-6">
          <div className={`flex items-start gap-4 `}>
          
            <div className="flex-1">
              <h3 className={`text-lg font-semibold text-eerie-black ${isRTL ? 'text-right' : ''}`}>
                {t('settings.signOut', 'Sign Out')}
              </h3>
              <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>
                {t('settings.signOutDescription', 'Sign out of your account on this device. You can sign back in anytime.')}
              </p>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`mt-4 inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed `}
              >
                {isLoggingOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <LogOutIcon className="w-4 h-4" /> 
                )}
                {isLoggingOut ? t('settings.signingOut', 'Signing out...') : t('settings.signOutButton', 'Sign Out')}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Settings;
