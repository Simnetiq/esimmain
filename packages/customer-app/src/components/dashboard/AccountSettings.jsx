import React, { useState } from 'react';
import { Settings, Edit3, Key, Phone, User, Mail, Save, X, Calendar } from 'lucide-react';
import { updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';

const AccountSettings = ({ currentUser, userProfile, onLoadUserProfile }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  
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
  
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newName, setNewName] = useState(currentUser?.displayName || '');
  const [newPhone, setNewPhone] = useState(userProfile?.phoneNumber || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  // Check if user is authenticated with Google
  const isGoogleUser = currentUser?.providerData?.some(
    provider => provider.providerId === 'google.com'
  );

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      toast.error(t('dashboard.nameCannotBeEmpty', 'Name cannot be empty'));
      return;
    }

    setIsUpdating(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: newName.trim()
      });

      // Update Firestore user document
      if (userProfile) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          displayName: newName.trim(),
          updatedAt: new Date()
        });
      }

      await onLoadUserProfile();
      setEditingName(false);
      toast.success(t('dashboard.nameUpdatedSuccessfully', 'Name updated successfully'));
    } catch {
      toast.error(t('dashboard.failedToUpdateName', 'Failed to update name'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdatePhone = async () => {
    setIsUpdating(true);
    try {
      // Update Firestore user document
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        phoneNumber: newPhone.trim(),
        updatedAt: new Date()
      });

      await onLoadUserProfile();
      setEditingPhone(false);
      toast.success(t('dashboard.phoneUpdatedSuccessfully', 'Phone number updated successfully'));
    } catch { 
      toast.error(t('dashboard.failedToUpdatePhone', 'Failed to update phone number'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordReset = async () => {
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(currentUser.auth, currentUser.email);
      toast.success(t('dashboard.passwordResetEmailSent', 'Password reset email sent! Check your inbox.'));
    } catch {
      toast.error(t('dashboard.failedToSendPasswordReset', 'Failed to send password reset email'));
    } finally {
      setIsSendingReset(false);
    }
  };

  const cancelNameEdit = () => {
    setNewName(currentUser?.displayName || '');
    setEditingName(false);
  };

  const cancelPhoneEdit = () => {
    setNewPhone(userProfile?.phoneNumber || '');
    setEditingPhone(false);
  };

  return (
    <div className="bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Separation Line */}
      <div className="w-full h-px bg-gray-200"></div>
      
      {/* Account Settings Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            {/* Section Header */}
            <div className={`flex items-center gap-2 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-8 h-8 bg-tufts-blue/10 rounded flex items-center justify-center">
                <Settings className="w-4 h-4 text-tufts-blue" />
              </div>
              <h2 className={`text-xl sm:text-2xl font-semibold text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('dashboard.accountSettings', 'Account Settings')}
              </h2>
            </div>
              
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 border border-gray-100 rounded p-4 sm:p-5">
                <h3 className={`text-sm font-medium text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('dashboard.personalInformation', 'Personal Information')} 
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Mail className="w-3.5 h-3.5" />
                      {t('dashboard.emailAddress', 'Email Address')}
                    </label>
                    <div className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-900 break-all">{currentUser.email}</span>
                      <span className="flex-shrink-0 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                        {t('dashboard.verified', 'Verified')}
                      </span>
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <User className="w-3.5 h-3.5" />
                      {t('dashboard.displayName', 'Display Name')}
                    </label>
                    {editingName ? (
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="text"
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          className={`flex-1 p-3 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-tufts-blue focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                          placeholder={t('dashboard.enterYourName', 'Enter your name')}
                        />
                        <button
                          onClick={handleUpdateName}
                          disabled={isUpdating}
                          className="p-3 bg-tufts-blue text-white rounded hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelNameEdit}
                          className="p-3 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm text-gray-900">{currentUser.displayName || t('dashboard.notSet', 'Not set')}</span>
                        <button
                          onClick={() => setEditingName(true)}
                          className="text-tufts-blue hover:text-tufts-blue/80 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Phone className="w-3.5 h-3.5" />
                      {t('dashboard.phoneNumber', 'Phone Number')}
                    </label>
                    {editingPhone ? (
                      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <input
                          type="tel"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          className={`flex-1 p-3 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-tufts-blue focus:border-transparent ${isRTL ? 'text-right' : 'text-left'}`}
                          placeholder={t('dashboard.enterYourPhone', 'Enter your phone number')}
                        />
                        <button
                          onClick={handleUpdatePhone}
                          disabled={isUpdating}
                          className="p-3 bg-tufts-blue text-white rounded hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelPhoneEdit}
                          className="p-3 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-sm text-gray-900">{userProfile?.phoneNumber || t('dashboard.notSet', 'Not set')}</span>
                        <button
                          onClick={() => setEditingPhone(true)}
                          className="text-tufts-blue hover:text-tufts-blue/80 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Account Created */}
                  <div className="space-y-1.5">
                    <label className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Calendar className="w-3.5 h-3.5" />
                      {t('dashboard.accountCreated', 'Account Created')}
                    </label>
                    <div className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-900">
                        {userProfile?.createdAt ? 
                          (userProfile.createdAt.toDate ? 
                            new Date(userProfile.createdAt.toDate()).toLocaleDateString() :
                            new Date(userProfile.createdAt).toLocaleDateString()
                          ) : 
                          t('dashboard.unknown', 'Unknown')
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Security - Only show for non-Google users */}
              {!isGoogleUser && (
                <div className="bg-gray-50 border border-gray-100 rounded p-4 sm:p-5">
                  <h3 className={`text-sm font-medium text-gray-900 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('dashboard.security', 'Security')}
                  </h3>
                  <div className="space-y-1.5">
                    <label className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <Key className="w-3.5 h-3.5" />
                      {t('dashboard.password', 'Password')}
                    </label>
                    <div className={`flex items-center justify-between p-3 bg-white border border-gray-200 rounded ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <span className="text-sm text-gray-900">••••••••</span>
                      <button
                        onClick={handlePasswordReset}
                        disabled={isSendingReset}
                        className="text-sm bg-tufts-blue text-white px-3 py-1.5 rounded hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
                      >
                        {isSendingReset ? t('dashboard.sending', 'Sending...') : t('dashboard.resetPassword', 'Reset Password')}
                      </button>
                    </div>
                    <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('dashboard.passwordResetInfo', "We'll send a password reset link to your email address")}
                    </p>
                  </div>
                </div>
              )}

              {/* Google Account Info - Show for Google users */}
              {isGoogleUser && (
                <div className="bg-blue-50 border border-blue-100 rounded p-4 sm:p-5">
                  <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-medium text-blue-900">
                      {t('dashboard.googleAccount', 'Signed in with Google')}
                    </span>
                  </div>
                  <p className={`text-xs text-blue-700 mt-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('dashboard.googleAccountInfo', 'Your password is managed by Google. Visit your Google Account to change it.')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountSettings;
