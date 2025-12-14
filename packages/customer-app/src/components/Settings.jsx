'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, LogOut, ArrowLeft } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';
import AccountSettings from './dashboard/AccountSettings';
import Loading from './Loading';
import Link from 'next/link';

const Settings = () => {
  const { t, locale } = useI18n();
  const { currentUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Get current language for RTL detection
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  // Load user profile
  const loadUserProfile = async () => {
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
  };

  useEffect(() => {
    loadUserProfile();
  }, [currentUser]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !currentUser) {
      router.push(getLocalizedUrl('/login'));
    }
  }, [loading, currentUser, router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success(t('settings.loggedOutSuccessfully', 'Logged out successfully'));
      router.push(getLocalizedUrl('/'));
    } catch {
      toast.error(t('settings.failedToLogout', 'Failed to logout'));
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-4 py-6">
          <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <Link 
              href={getLocalizedUrl('/dashboard')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className={`w-5 h-5 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
            </Link>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-10 h-10 bg-tufts-blue/10 rounded-lg flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-tufts-blue" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl font-semibold text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.title', 'Settings')}
                </h1>
                <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('settings.subtitle', 'Manage your account settings and preferences')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Account Settings Section */}
      <AccountSettings 
        currentUser={currentUser} 
        userProfile={userProfile} 
        onLoadUserProfile={loadUserProfile}
      />

      {/* Logout Section */}
      <div className="bg-white border-t border-gray-200">
        <div className="mx-auto max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <div className="bg-red-50 border border-red-100 rounded-lg p-4 sm:p-5">
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className={`text-base font-semibold text-red-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.signOut', 'Sign Out')}
                  </h3>
                  <p className={`text-sm text-red-700 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('settings.signOutDescription', 'Sign out of your account on this device. You can sign back in anytime.')}
                  </p>
                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className={`mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <LogOut className="w-4 h-4" />
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
