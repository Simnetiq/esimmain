'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { getSupabase } from '@esim/shared/lib/supabase';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname, useRouter } from 'next/navigation';

// ─── Inline SVG icons (no lucide-react) ───────────────────────────────────

const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const PencilIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
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

const BellIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
  </svg>
);

const BellOffIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5"/><path d="M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="2" x2="22" y1="2" y2="22"/>
  </svg>
);

const Trash2Icon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

const AlertTriangleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
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

const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  type === 'success' ? toast.success(message) : toast.error(message);
};

const SettingsField = ({ icon: Icon, label, value, badge, onEdit, editing, editContent }) => (
  <div className="space-y-1.5 min-h-[60px]">
    <label className="flex items-center gap-1.5 text-xs font-medium tracking-widest uppercase text-gray-500 rtl-native-flex">
      <Icon className="w-3.5 h-3.5" />
      {label}
    </label>
    {editing ? editContent : (
      <div className="flex items-center justify-between p-3 bg-white transition-colors duration-300 rtl-native-flex">
        <span className="text-sm text-gray-900 break-all">{value}</span>
        <div className="flex items-center gap-2 flex-shrink-0 rtl-native-flex">
          {badge}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-tufts-blue hover:bg-tufts-blue/10 rounded-lg transition-colors duration-300"
            >
              <PencilIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    )}
  </div>
);

const AccountSettings = ({ currentUser, userProfile, onLoadUserProfile }) => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const { logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

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

  const [editingName, setEditingName] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [newName, setNewName] = useState(userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.user_metadata?.full_name || '');
  const [newPhone, setNewPhone] = useState(userProfile?.phone || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnsubscribing, setIsUnsubscribing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const isSubscribedToNewsletter = userProfile?.metadata?.newsletter_subscribed !== false;
  const authProvider = currentUser?.app_metadata?.provider;
  const isGoogleUser = authProvider === 'google';
  const isAppleUser = authProvider === 'apple';

  const handleUpdateName = useCallback(async () => {
    if (!newName.trim()) {
      showToast('error', t('dashboard.nameCannotBeEmpty', 'Name cannot be empty'));
      return;
    }
    setIsUpdating(true);
    try {
      const supabase = getSupabase();
      await supabase.auth.updateUser({ data: { display_name: newName.trim() } });
      await supabase.from('users').update({
        display_name: newName.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', currentUser.id);
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
      const supabase = getSupabase();
      await supabase.from('users').update({
        phone: newPhone.trim(),
        updated_at: new Date().toISOString()
      }).eq('id', currentUser.id);
      await onLoadUserProfile();
      setEditingPhone(false);
      showToast('success', t('dashboard.phoneUpdatedSuccessfully', 'Phone number updated successfully'));
    } catch {
      showToast('error', t('dashboard.failedToUpdatePhone', 'Failed to update phone number'));
    } finally {
      setIsUpdating(false);
    }
  }, [newPhone, currentUser, onLoadUserProfile, t]);

  const cancelNameEdit = useCallback(() => {
    setNewName(userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.user_metadata?.full_name || '');
    setEditingName(false);
  }, [userProfile?.display_name, currentUser?.user_metadata]);

  const cancelPhoneEdit = useCallback(() => {
    setNewPhone(userProfile?.phone || '');
    setEditingPhone(false);
  }, [userProfile?.phone]);

  const handleNewsletterToggle = useCallback(async () => {
    setIsUnsubscribing(true);
    try {
      const supabase = getSupabase();
      const newStatus = !isSubscribedToNewsletter;
      await supabase.from('users').update({
        metadata: {
          ...(userProfile?.metadata || {}),
          newsletter_subscribed: newStatus,
          newsletter_updated_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }).eq('id', currentUser.id);
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
      const supabase = getSupabase();
      await supabase.from('users').update({
        is_blocked: true,
        block_reason: 'user_requested_deletion',
        email: `deleted_${currentUser.id}@deleted.com`,
        display_name: 'Deleted User',
        updated_at: new Date().toISOString()
      }).eq('id', currentUser.id);
      try {
        await fetch('/api/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch {
        // If auth deletion fails, still proceed with logout
      }
      await logout();
      showToast('success', t('settings.accountDeleted', 'Your account has been deleted'));
      router.push(currentLanguage === 'en' ? '/' : `/${currentLanguage}`);
    } catch {
      showToast('error', t('settings.failedToDeleteAccount', 'Failed to delete account. Please contact support.'));
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }, [deleteConfirmText, currentUser, logout, router, currentLanguage, t]);

  const EditInput = ({ value, onChange, onSave, onCancel, type = 'text', placeholder }) => (
    <div className="flex gap-2 rtl-native-flex">
      <input
        type={type}
        value={value}
        onChange={onChange}
        className="flex-1 p-3 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-tufts-blue/20 outline-none transition-all duration-300 text-start"
        placeholder={placeholder}
      />
      <button
        onClick={onSave}
        disabled={isUpdating}
        className="p-3 bg-eerie-black text-white rounded-full hover:bg-gray-800 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <CheckIcon className="w-4 h-4" />}
      </button>
      <button
        onClick={onCancel}
        className="p-3 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200 transition-colors duration-300"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );

  const sections = [
    { step: '01', label: t('dashboard.personalInformation', 'Personal Information') },
    { step: '02', label: isGoogleUser || isAppleUser ? t('dashboard.signInProvider', 'Sign-in Provider') : null },
    { step: isGoogleUser || isAppleUser ? '03' : '02', label: t('settings.newsletterPreferences', 'Newsletter') },
    { step: isGoogleUser || isAppleUser ? '04' : '03', label: t('settings.deleteAccount', 'Delete Account') },
  ].filter(s => s.label);

  return (
    <div>
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl space-y-4">

        {/* ── Personal Information ── */}
        <div className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 p-5">
          <span
            className="absolute top-3 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-400/20 select-none pointer-events-none"
            aria-hidden="true"
          >
            01
          </span>

          <div className="relative">
            <div className="flex items-center gap-3 mb-5 rtl-native-flex">
              <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <UserIcon className="w-5 h-5 text-tufts-blue" />
              </div>
              <h3 className="text-xs font-medium tracking-widest uppercase text-tufts-blue">
                {t('dashboard.personalInformation', 'Personal Information')}
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SettingsField
                icon={MailIcon}
                label={t('dashboard.emailAddress', 'Email')}
                value={currentUser.email}

                badge={
                  <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    {t('dashboard.verified', 'Verified')}
                  </span>
                }
              />

              <SettingsField
                icon={UserIcon}
                label={t('dashboard.displayName', 'Name')}
                value={userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.user_metadata?.full_name || t('dashboard.notSet', 'Not set')}

                onEdit={() => setEditingName(true)}
                editing={editingName}
                editContent={
                  <EditInput
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onSave={handleUpdateName}
                    onCancel={cancelNameEdit}
                    placeholder={t('dashboard.enterYourName', 'Enter your name')}
                  />
                }
              />

              <SettingsField
                icon={PhoneIcon}
                label={t('dashboard.phoneNumber', 'Phone')}
                value={userProfile?.phone || t('dashboard.notSet', 'Not set')}

                onEdit={() => setEditingPhone(true)}
                editing={editingPhone}
                editContent={
                  <EditInput
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    onSave={handleUpdatePhone}
                    onCancel={cancelPhoneEdit}
                    placeholder={t('dashboard.enterYourPhone', 'Enter your phone number')}
                  />
                }
              />

              <SettingsField
                icon={CalendarIcon}
                label={t('dashboard.accountCreated', 'Member since')}
                value={
                  userProfile?.created_at
                    ? new Date(userProfile.created_at).toLocaleDateString()
                    : t('dashboard.unknown', 'Unknown')
                }

              />
            </div>
          </div>
        </div>

        {/* ── Social Provider ── */}
        {(isGoogleUser || isAppleUser) && (
          <div className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 p-5">
            <span
              className="absolute top-3 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-400/20 select-none pointer-events-none"
              aria-hidden="true"
            >
              02
            </span>

            <div className="relative">
              <div className="flex items-center gap-3 rtl-native-flex">
                <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  {isGoogleUser ? <GoogleIcon /> : <AppleIcon />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue text-start">
                    {isGoogleUser
                      ? t('dashboard.googleAccount', 'Signed in with Google')
                      : t('dashboard.appleAccount', 'Signed in with Apple')
                    }
                  </p>
                  <p className="text-sm text-gray-500 leading-relaxed mt-1 text-start">
                    {isGoogleUser
                      ? t('dashboard.googleAccountInfo', 'Your password is managed by Google. Visit your Google Account to change it.')
                      : t('dashboard.appleAccountInfo', 'Your password is managed by Apple. Visit your Apple ID settings to change it.')
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Newsletter ── */}
        <div className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 p-5">
          <span
            className="absolute top-3 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-400/20 select-none pointer-events-none"
            aria-hidden="true"
          >
            {isGoogleUser || isAppleUser ? '03' : '02'}
          </span>

          <div className="relative">
            <div className="flex items-center gap-3 mb-2 rtl-native-flex">
              <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                {isSubscribedToNewsletter
                  ? <BellIcon className="w-5 h-5 text-tufts-blue" />
                  : <BellOffIcon className="w-5 h-5 text-gray-400" />
                }
              </div>
              <h3 className="text-xs font-medium tracking-widest uppercase text-tufts-blue">
                {t('settings.newsletterPreferences', 'Newsletter')}
              </h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mt-2 mb-4 text-start">
              {isSubscribedToNewsletter
                ? t('settings.currentlySubscribed', 'You are currently subscribed to our newsletter and promotional emails.')
                : t('settings.currentlyUnsubscribed', 'You are not subscribed to our newsletter.')
              }
            </p>
            <button
              onClick={handleNewsletterToggle}
              disabled={isUnsubscribing}
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium rounded-full transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                isSubscribedToNewsletter
                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'bg-eerie-black text-white hover:bg-gray-800'
              }`}
            >
              {isUnsubscribing ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent" />
              ) : isSubscribedToNewsletter ? (
                <BellOffIcon className="w-3.5 h-3.5" />
              ) : (
                <BellIcon className="w-3.5 h-3.5" />
              )}
              {isSubscribedToNewsletter
                ? t('settings.unsubscribe', 'Unsubscribe')
                : t('settings.subscribe', 'Subscribe')
              }
            </button>
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 p-5">
          <span
            className="absolute top-3 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-red-400/15 select-none pointer-events-none"
            aria-hidden="true"
          >
            {isGoogleUser || isAppleUser ? '04' : '03'}
          </span>

          <div className="relative">
            <div className="flex items-center gap-3 mb-2 rtl-native-flex">
              <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <AlertTriangleIcon className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-xs font-medium tracking-widest uppercase text-red-500">
                {t('settings.deleteAccount', 'Delete Account')}
              </h3>
            </div>
            <p className="text-sm text-gray-500 leading-relaxed mt-2 mb-4 text-start">
              {t('settings.deleteAccountDescription', 'Permanently delete your account and all associated data. This action cannot be undone.')}
            </p>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors duration-300"
            >
              <Trash2Icon className="w-3.5 h-3.5" />
              {t('settings.deleteMyAccount', 'Delete')}
            </button>
          </div>
        </div>
      </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4 rtl-native-flex">
              <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-eerie-black">
                  {t('settings.confirmDeleteAccount', 'Delete Account?')}
                </h3>
              </div>
            </div>

            <p className="text-sm text-gray-500 leading-relaxed mb-5 text-start">
              {t('settings.deleteWarning', 'This will permanently delete your account, all your eSIMs, order history, and personal data. This action cannot be undone.')}
            </p>

            <div className="mb-5">
              <label className="block text-xs font-medium tracking-widest uppercase text-gray-500 mb-1.5 text-start">
                {t('settings.typeDeleteToConfirm', 'Type DELETE to confirm')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full px-4 py-3 bg-gray-50 text-sm focus:ring-2 focus:ring-red-200 outline-none transition-all duration-300 text-start"
              />
              <div className="h-5" />
            </div>

            <div className="flex gap-3 rtl-native-flex">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors duration-300"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-3 text-sm font-medium text-white bg-red-600 rounded-full hover:bg-red-700 transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2Icon className="w-4 h-4" />
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
