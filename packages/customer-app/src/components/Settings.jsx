'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LogOut } from 'lucide-react';
import { getSupabase } from '@esim/shared/lib/supabase';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import AccountSettings from './dashboard/AccountSettings';
import BackgroundDecor from './ui/BackgroundDecor';
import { AccountSettingsSkeleton } from './ui/PageSkeleton';

const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  type === 'success' ? toast.success(message) : toast.error(message);
};

const SettingsSkeleton = () => (
  <div className="min-h-screen relative">
    <BackgroundDecor />
    <div className="relative">
      <AccountSettingsSkeleton />
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
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
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
    <div className="min-h-screen relative" dir={isRTL ? 'rtl' : 'ltr'}>
      <BackgroundDecor />

      <div className="relative transition-opacity duration-150 ease-out opacity-100">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-6">
          {/* Back Link */}
          <Link
            href={getLocalizedUrl('/dashboard')}
            className={`inline-flex items-center gap-2 text-gray-600 hover:text-tufts-blue text-sm font-medium transition-colors duration-150 ease-out mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
            {t('settings.backToDashboard', 'Back to Dashboard')}
          </Link>
        </div>

        {/* Account Settings */}
        <AccountSettings
          currentUser={currentUser}
          userProfile={userProfile}
          onLoadUserProfile={loadUserProfile}
        />

        {/* Sign Out Section */}
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pb-8">
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5">
            <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={isRTL ? 'text-right' : ''}>
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('settings.signOut', 'Sign Out')}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {t('settings.signOutDescription', 'Sign out of your account on this device.')}
                </p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {isLoggingOut ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400" />
                ) : (
                  <LogOut className="w-4 h-4" />
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
