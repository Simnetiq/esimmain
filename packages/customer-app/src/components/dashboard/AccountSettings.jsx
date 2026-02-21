'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Mail, User, Phone, Pencil, X, Calendar,
  Bell, BellOff, Trash2, AlertTriangle, Check
} from 'lucide-react';
import { getSupabase } from '@esim/shared/lib/supabase';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname, useRouter } from 'next/navigation';

const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  type === 'success' ? toast.success(message) : toast.error(message);
};

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

const SettingsField = ({ icon: Icon, label, value, isRTL, badge, onEdit, editing, editContent }) => (
  <div className="space-y-1.5 min-h-[60px]">
    <label className={`flex items-center gap-1.5 text-xs font-medium text-gray-500 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </label>
    {editing ? editContent : (
      <div className={`flex items-center justify-between p-3 bg-gray-50/80 border border-gray-200 rounded-xl transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse' : ''}`}>
        <span className="text-sm text-gray-900 break-all">{value}</span>
        <div className={`flex items-center gap-2 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {badge}
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-tufts-blue hover:bg-tufts-blue/10 rounded-lg transition-colors duration-150 ease-out"
            >
              <Pencil className="w-3.5 h-3.5" />
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

  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

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
    <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        className={`flex-1 p-3 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue outline-none transition-all duration-150 ease-out ${isRTL ? 'text-right' : ''}`}
        placeholder={placeholder}
      />
      <button
        onClick={onSave}
        disabled={isUpdating}
        className="p-3 bg-tufts-blue text-white rounded-xl hover:bg-tufts-blue/90 transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUpdating ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Check className="w-4 h-4" />}
      </button>
      <button
        onClick={onCancel}
        className="p-3 bg-gray-100 text-gray-500 rounded-xl hover:bg-gray-200 transition-colors duration-150 ease-out"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-5">

        {/* ── Personal Information ── */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5">
          <h3 className={`text-sm font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
            {t('dashboard.personalInformation', 'Personal Information')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingsField
              icon={Mail}
              label={t('dashboard.emailAddress', 'Email')}
              value={currentUser.email}
              isRTL={isRTL}
              badge={
                <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {t('dashboard.verified', 'Verified')}
                </span>
              }
            />

            <SettingsField
              icon={User}
              label={t('dashboard.displayName', 'Name')}
              value={userProfile?.display_name || currentUser?.user_metadata?.display_name || currentUser?.user_metadata?.full_name || t('dashboard.notSet', 'Not set')}
              isRTL={isRTL}
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
              icon={Phone}
              label={t('dashboard.phoneNumber', 'Phone')}
              value={userProfile?.phone || t('dashboard.notSet', 'Not set')}
              isRTL={isRTL}
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
              icon={Calendar}
              label={t('dashboard.accountCreated', 'Member since')}
              value={
                userProfile?.created_at
                  ? new Date(userProfile.created_at).toLocaleDateString()
                  : t('dashboard.unknown', 'Unknown')
              }
              isRTL={isRTL}
            />
          </div>
        </div>

        {/* ── Social Provider ── */}
        {(isGoogleUser || isAppleUser) && (
          <div className={`flex items-center gap-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center flex-shrink-0">
              {isGoogleUser ? <GoogleIcon /> : <AppleIcon />}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : ''}`}>
                {isGoogleUser
                  ? t('dashboard.googleAccount', 'Signed in with Google')
                  : t('dashboard.appleAccount', 'Signed in with Apple')
                }
              </p>
              <p className={`text-xs text-gray-500 mt-0.5 ${isRTL ? 'text-right' : ''}`}>
                {isGoogleUser
                  ? t('dashboard.googleAccountInfo', 'Your password is managed by Google. Visit your Google Account to change it.')
                  : t('dashboard.appleAccountInfo', 'Your password is managed by Apple. Visit your Apple ID settings to change it.')
                }
              </p>
            </div>
          </div>
        )}

        {/* ── Newsletter ── */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl p-5">
          <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="min-w-0">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {isSubscribedToNewsletter
                  ? <Bell className="w-4 h-4 text-tufts-blue flex-shrink-0" />
                  : <BellOff className="w-4 h-4 text-gray-400 flex-shrink-0" />
                }
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('settings.newsletterPreferences', 'Newsletter')}
                </h3>
              </div>
              <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                {isSubscribedToNewsletter
                  ? t('settings.currentlySubscribed', 'You are currently subscribed to our newsletter and promotional emails.')
                  : t('settings.currentlyUnsubscribed', 'You are not subscribed to our newsletter.')
                }
              </p>
            </div>
            <button
              onClick={handleNewsletterToggle}
              disabled={isUnsubscribing}
              className={`flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed ${
                isSubscribedToNewsletter
                  ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                  : 'bg-tufts-blue text-white hover:bg-tufts-blue/90'
              }`}
            >
              {isUnsubscribing ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-current border-t-transparent" />
              ) : isSubscribedToNewsletter ? (
                <BellOff className="w-3.5 h-3.5" />
              ) : (
                <Bell className="w-3.5 h-3.5" />
              )}
              {isSubscribedToNewsletter
                ? t('settings.unsubscribe', 'Unsubscribe')
                : t('settings.subscribe', 'Subscribe')
              }
            </button>
          </div>
        </div>

        {/* ── Danger Zone ── */}
        <div className="bg-white/80 backdrop-blur-sm border border-red-200 rounded-xl p-5">
          <div className={`flex items-start justify-between gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="min-w-0">
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-gray-900">
                  {t('settings.deleteAccount', 'Delete Account')}
                </h3>
              </div>
              <p className={`text-xs text-gray-500 mt-1 ${isRTL ? 'text-right' : ''}`}>
                {t('settings.deleteAccountDescription', 'Permanently delete your account and all associated data. This action cannot be undone.')}
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors duration-150 ease-out"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('settings.deleteMyAccount', 'Delete')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-150 ease-out"
          onClick={() => setShowDeleteModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            dir={isRTL ? 'rtl' : 'ltr'}
            onClick={e => e.stopPropagation()}
          >
            <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-11 h-11 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('settings.confirmDeleteAccount', 'Delete Account?')}
                </h3>
              </div>
            </div>

            <p className={`text-sm text-gray-500 mb-5 ${isRTL ? 'text-right' : ''}`}>
              {t('settings.deleteWarning', 'This will permanently delete your account, all your eSIMs, order history, and personal data. This action cannot be undone.')}
            </p>

            <div className="mb-5">
              <label className={`block text-xs font-medium text-gray-500 mb-1.5 ${isRTL ? 'text-right' : ''}`}>
                {t('settings.typeDeleteToConfirm', 'Type DELETE to confirm')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className={`w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none transition-all duration-150 ease-out ${isRTL ? 'text-right' : ''}`}
              />
              {/* Reserved height for error state — prevents layout jump */}
              <div className="h-5" />
            </div>

            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors duration-150 ease-out"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmText !== 'DELETE'}
                className="flex-1 py-3 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Trash2 className="w-4 h-4" />
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
