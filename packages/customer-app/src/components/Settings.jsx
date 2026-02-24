'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
// ─── Inline SVG icons (no lucide-react) ───────────────────────────────────

const ArrowLeftIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const LogOutIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>
  </svg>
);
import { getSupabase } from '@esim/shared/lib/supabase';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
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
  if (authLoading || loading) {
    return <SettingsSkeleton />;
  }

  // Redirect state (prevents flash)
  if (!currentUser) {
    return <SettingsSkeleton />;
  }

  return (
    <div className="min-h-screen relative">
      <BackgroundDecor />

      <div className="relative transition-opacity duration-300 opacity-100">
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 pt-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              {/* Back Link */}
              <Link
                href={getLocalizedUrl('/dashboard')}
                className="inline-flex items-center gap-2 text-gray-500 hover:text-tufts-blue text-sm font-medium transition-colors duration-300 mb-4 rtl-native-flex"
              >
                <ArrowLeftIcon className="w-4 h-4 rtl:-scale-x-100" />
                {t('settings.backToDashboard', 'Back to Dashboard')}
              </Link>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <AccountSettings
          currentUser={currentUser}
          userProfile={userProfile}
          onLoadUserProfile={loadUserProfile}
        />

        {/* Sign Out Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 pb-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 p-5">
                <span
                  className="absolute top-3 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-400/20 select-none pointer-events-none"
                  aria-hidden="true"
                >
                  {/* Dynamic step number based on whether social provider section exists */}
                  05
                </span>

                <div className="relative">
                  <div className="flex items-center gap-3 mb-2 rtl-native-flex">
                    <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <LogOutIcon className="w-5 h-5 text-tufts-blue rtl:-scale-x-100" />
                    </div>
                    <h3 className="text-xs font-medium tracking-widest uppercase text-tufts-blue">
                      {t('settings.signOut', 'Sign Out')}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed mt-2 mb-4 text-start">
                    {t('settings.signOutDescription', 'Sign out of your account on this device.')}
                  </p>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed rtl-native-flex"
                  >
                    {isLoggingOut ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
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
      </div>
    </div>
  );
};

export default Settings;
