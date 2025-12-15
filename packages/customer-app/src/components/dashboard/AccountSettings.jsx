import React, { useState, useCallback, useMemo } from 'react';
import { updateProfile, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname, useRouter } from 'next/navigation';

// Lazy load toast
const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

// Inline SVG Icons
const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const Edit3Icon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
  </svg>
);

const KeyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/>
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const SaveIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const CalendarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const BellOffIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="m2 2 20 20"/>
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

const AlertTriangleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const AccountSettings = ({ currentUser, userProfile, onLoadUserProfile }) => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  
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

  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';
  
  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newName, setNewName] = useState(currentUser?.displayName || '');
  const [newPhone, setNewPhone] = useState(userProfile?.phoneNumber || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Newsletter subscription status
  const isSubscribedToNewsletter = userProfile?.newsletterSubscribed !== false;

  // Check if user is authenticated with Google or Apple
  const isGoogleUser = currentUser?.providerData?.some(
    provider => provider.providerId === 'google.com'
  );
  const isAppleUser = currentUser?.providerData?.some(
    provider => provider.providerId === 'apple.com'
  );
  const isSocialUser = isGoogleUser || isAppleUser;

  const handleUpdateName = useCallback(async () => {
    if (!newName.trim()) {
      showToast('error', t('dashboard.nameCannotBeEmpty', 'Name cannot be empty'));
      return;
    }

    setIsUpdating(true);
    try {
      await updateProfile(currentUser, { displayName: newName.trim() });

      if (userProfile) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          displayName: newName.trim(),
          updatedAt: new Date()
        });
      }

      await onLoadUserProfile();
      setEditingName(false);
      showToast('success', t('dashboard.nameUpdatedSuccessfully', 'Name updated successfully'));
    } catch {
      showToast('error', t('dashboard.failedToUpdateName', 'Failed to update name'));
    } finally {
      setIsUpdating(false);
    }
  }, [newName, currentUser, userProfile, onLoadUserProfile, t]);

  const handleUpdatePhone = useCallback(async () => {
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        phoneNumber: newPhone.trim(),
        updatedAt: new Date()
      });

      await onLoadUserProfile();
      setEditingPhone(false);
      showToast('success', t('dashboard.phoneUpdatedSuccessfully', 'Phone number updated successfully'));
    } catch { 
      showToast('error', t('dashboard.failedToUpdatePhone', 'Failed to update phone number'));
    } finally {
      setIsUpdating(false);
    }
  }, [newPhone, currentUser, onLoadUserProfile, t]);

  const handlePasswordReset = useCallback(async () => {
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(currentUser.auth, currentUser.email);
      showToast('success', t('dashboard.passwordResetEmailSent', 'Password reset email sent! Check your inbox.'));
    } catch {
      showToast('error', t('dashboard.failedToSendPasswordReset', 'Failed to send password reset email'));
    } finally {
      setIsSendingReset(false);
    }
  }, [currentUser, t]);

  const cancelNameEdit = useCallback(() => {
    setNewName(currentUser?.displayName || '');
    setEditingName(false);
  }, [currentUser?.displayName]);

  const cancelPhoneEdit = useCallback(() => {
    setNewPhone(userProfile?.phoneNumber || '');
    setEditingPhone(false);
  }, [userProfile?.phoneNumber]);

  const handleNewsletterToggle = useCallback(async () => {
    setIsUnsubscribing(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      const newStatus = !isSubscribedToNewsletter;
      await updateDoc(userRef, {
        newsletterSubscribed: newStatus,
        newsletterUpdatedAt: new Date()
      });
      await onLoadUserProfile();
      showToast('success', newStatus 
        ? t('settings.subscribedToNewsletter', 'Subscribed to newsletter')
        : t('settings.unsubscribedFromNewsletter', 'Unsubscribed from newsletter')
      );
    } catch {
      showToast('error', t('settings.failedToUpdateNewsletter', 'Failed to update newsletter preferences'));
    } finally {
      setIsUnsubscribing(false);
    }
  }, [currentUser, isSubscribedToNewsletter, onLoadUserProfile, t]);

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText !== 'DELETE') {
      showToast('error', t('settings.pleaseTypeDelete', 'Please type DELETE to confirm'));
      return;
    }

    setIsDeleting(true);
    try {
      // Soft delete user data in Firestore
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        deleted: true,
        deletedAt: new Date(),
        email: `deleted_${currentUser.uid}@deleted.com`,
        displayName: 'Deleted User'
      });

      // Try to delete Firebase Auth account
      try {
        await deleteUser(currentUser);
      } catch (authError) {
        // If deletion requires recent login, just log out
        console.log('Auth deletion requires re-authentication:', authError);
      }

      // Log out and redirect
      await logout();
      showToast('success', t('settings.accountDeleted', 'Your account has been deleted'));
      const homeUrl = currentLanguage === 'en' ? '/' : `/${currentLanguage}`;
      router.push(homeUrl);
    } catch (error) {
      console.error('Error deleting account:', error);
      showToast('error', t('settings.failedToDeleteAccount', 'Failed to delete account. Please contact support.'));
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }, [deleteConfirmText, currentUser, logout, router, currentLanguage, t]);

  return (
    <div  dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Account Settings Section */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        
          
        <div className="space-y-6">
          {/* Personal Information */}
          <div className="bg-white shadow-lg shadow-gray-200/50 p-5 sm:p-6">
            <h3 className={`text-base font-semibold text-eerie-black mb-5 ${isRTL ? 'text-right' : ''}`}>
              {t('dashboard.personalInformation', 'Personal Information')} 
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Email */}
              <div className="space-y-2">
                <label className={`flex items-center gap-1.5 text-sm font-medium text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <MailIcon className="w-4 h-4" />
                  {t('dashboard.emailAddress', 'Email Address')}
                </label>
                <div className={`flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-eerie-black break-all">{currentUser.email}</span>
                  <span className="flex-shrink-0 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {t('dashboard.verified', 'Verified')}
                  </span>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <label className={`flex items-center gap-1.5 text-sm font-medium text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <UserIcon className="w-4 h-4" />
                  {t('dashboard.displayName', 'Display Name')}
                </label>
                {editingName ? (
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className={`flex-1 p-3.5 border border-gray-200 text-sm focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue transition-colors ${isRTL ? 'text-right' : ''}`}
                      placeholder={t('dashboard.enterYourName', 'Enter your name')}
                    />
                    <button
                      onClick={handleUpdateName}
                      disabled={isUpdating}
                      className="p-3.5 bg-tufts-blue text-white rounded-xl hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
                    >
                      <SaveIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelNameEdit}
                      className="p-3.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-eerie-black">{currentUser.displayName || t('dashboard.notSet', 'Not set')}</span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-tufts-blue hover:text-tufts-blue/80 transition-colors p-1.5 hover:bg-tufts-blue/10 rounded-lg"
                    >
                      <Edit3Icon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Phone Number */}
              <div className="space-y-2">
                <label className={`flex items-center gap-1.5 text-sm font-medium text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <PhoneIcon className="w-4 h-4" />
                  {t('dashboard.phoneNumber', 'Phone Number')}
                </label>
                {editingPhone ? (
                  <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className={`flex-1 p-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue transition-colors ${isRTL ? 'text-right' : ''}`}
                      placeholder={t('dashboard.enterYourPhone', 'Enter your phone number')}
                    />
                    <button
                      onClick={handleUpdatePhone}
                      disabled={isUpdating}
                      className="p-3.5 bg-tufts-blue text-white rounded-xl hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
                    >
                      <SaveIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelPhoneEdit}
                      className="p-3.5 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-eerie-black">{userProfile?.phoneNumber || t('dashboard.notSet', 'Not set')}</span>
                    <button
                      onClick={() => setEditingPhone(true)}
                      className="text-tufts-blue hover:text-tufts-blue/80 transition-colors p-1.5 hover:bg-tufts-blue/10 rounded-lg"
                    >
                      <Edit3Icon className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Account Created */}
              <div className="space-y-2">
                <label className={`flex items-center gap-1.5 text-sm font-medium text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <CalendarIcon className="w-4 h-4" />
                  {t('dashboard.accountCreated', 'Account Created')}
                </label>
                <div className={`flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-eerie-black">
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

          {/* Security - Only show for non-social users */}
          {!isSocialUser && (
            <div className="bg-white shadow-lg shadow-gray-200/50 p-5 sm:p-6">
              <h3 className={`text-base font-semibold text-eerie-black mb-5 ${isRTL ? 'text-right' : ''}`}>
                {t('dashboard.security', 'Security')}
              </h3>
              <div className="space-y-2">
                <label className={`flex items-center gap-1.5 text-sm font-medium text-gray-600 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <KeyIcon className="w-4 h-4" />
                  {t('dashboard.password', 'Password')}
                </label>
                <div className={`flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-eerie-black">••••••••</span>
                  <button
                    onClick={handlePasswordReset}
                    disabled={isSendingReset}
                    className="text-sm font-medium bg-tufts-blue text-white px-4 py-2 rounded-full hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
                  >
                    {isSendingReset ? t('dashboard.sending', 'Sending...') : t('dashboard.resetPassword', 'Reset Password')}
                  </button>
                </div>
                <p className={`text-xs text-gray-500 mt-2 ${isRTL ? 'text-right' : ''}`}>
                  {t('dashboard.passwordResetInfo', "We'll send a password reset link to your email address")}
                </p>
              </div>
            </div>
          )}

          {/* Social Account Info - Show for Google/Apple users */}
          {isSocialUser && (
            <div className={`shadow-lg shadow-gray-200/50 p-5 sm:p-6`}>  
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {isGoogleUser ? <GoogleIcon /> : <AppleIcon />}
                <span className={`text-sm font-semibold text-eerie-black`}>
                  {isGoogleUser 
                    ? t('dashboard.googleAccount', 'Signed in with Google')
                    : t('dashboard.appleAccount', 'Signed in with Apple')
                  }
                </span>
              </div>
              <p className={`text-sm ${isGoogleUser ? 'text-blue-700' : 'text-gray-600'} mt-2 ${isRTL ? 'text-right' : ''}`}>
                {isGoogleUser
                  ? t('dashboard.googleAccountInfo', 'Your password is managed by Google. Visit your Google Account to change it.')
                  : t('dashboard.appleAccountInfo', 'Your password is managed by Apple. Visit your Apple ID settings to change it.')
                }
              </p>
            </div>
          )}

          {/* Newsletter Preferences */}
          <div className="bg-white shadow-lg shadow-gray-200/50 p-5 sm:p-6">
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
             
              <div className="flex-1">
                <h3 className={`text-base font-semibold text-eerie-black ${isRTL ? 'text-right' : ''}`}>
                  {t('settings.newsletterPreferences', 'Newsletter Preferences')}
                </h3>
                <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>
                  {isSubscribedToNewsletter
                    ? t('settings.currentlySubscribed', 'You are currently subscribed to our newsletter and promotional emails.')
                    : t('settings.currentlyUnsubscribed', 'You are not subscribed to our newsletter.')
                  }
                </p>
                <button
                  onClick={handleNewsletterToggle}
                  disabled={isUnsubscribing}
                  className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 ${
                    isSubscribedToNewsletter 
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                      : 'bg-tufts-blue text-white hover:bg-tufts-blue/90'
                  } font-medium rounded-full transition-colors disabled:opacity-50 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {isUnsubscribing ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                  ) : (
                    <BellOffIcon className="w-4 h-4" />
                  )}
                  {isSubscribedToNewsletter
                    ? t('settings.unsubscribe', 'Unsubscribe')
                    : t('settings.subscribe', 'Subscribe')
                  }
                </button>
              </div>
            </div>
          </div>

          {/* Delete Account */}
          <div className="bg-white shadow-lg shadow-gray-200/50 p-5 sm:p-6">
            <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="flex-1">
                <h3 className={`text-base font-semibold text-eerie-black ${isRTL ? 'text-right' : ''}`}>
                  {t('settings.deleteAccount', 'Delete Account')}
                </h3>
                <p className={`text-sm text-gray-600 mt-1 ${isRTL ? 'text-right' : ''}`}>
                  {t('settings.deleteAccountDescription', 'Permanently delete your account and all associated data. This action cannot be undone.')}
                </p>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className={`mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <TrashIcon className="w-4 h-4" />
                  {t('settings.deleteMyAccount', 'Delete My Account')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}> 
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangleIcon className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-eerie-black">
                {t('settings.confirmDeleteAccount', 'Delete Account?')}
              </h3>
            </div>
            
            <p className={`text-gray-600 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t('settings.deleteWarning', 'This will permanently delete your account, all your eSIMs, order history, and personal data. This action cannot be undone.')}
            </p>
            
            <div className="mb-6">
              <label className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                {t('settings.typeDeleteToConfirm', 'Type DELETE to confirm')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-colors ${isRTL ? 'text-right' : ''}`}
              />
            </div>
            
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmText('');
                }}
                className="flex-1 px-5 py-3 bg-gray-100 text-gray-700 font-medium rounded-full hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className={`flex-1 px-5 py-3 bg-red-600 text-white font-medium rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                ) : (
                  <TrashIcon className="w-4 h-4" />
                )}
                {t('settings.deleteForever', 'Delete Forever')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSettings;
