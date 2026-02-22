"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { createContactRequest } from '@esim/shared/services/contactService';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import BackgroundDecor from './ui/BackgroundDecor';

const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const SendIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
  </svg>
);

const TrashIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const DeleteInfo = () => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLanguage = useMemo(() => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname) || 'en';
  }, [locale, pathname]);

  const isRTL = mounted ? getLanguageDirection(currentLanguage) === 'rtl' : false;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    agreementAccepted: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createContactRequest({
        ...formData,
        message: 'Account Deletion Request',
        type: 'deletion_request',
        agreementText: "I hereby request the deletion of my account and all associated data. I understand this action is irreversible and will result in the permanent loss of my purchase history, active eSIMs, and account settings."
      });
      setSubmitted(true);
      showToast('success', t('deleteInfo.success', 'Your deletion request has been submitted successfully.'));
    } catch {
      showToast('error', t('deleteInfo.error', 'Failed to submit request. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, t]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue" />
      </div>
    );
  }

  const dataItems = [
    {
      label: t('deleteInfo.data.account', 'Account profile and credentials'),
      deleted: true,
    },
    {
      label: t('deleteInfo.data.purchaseHistory', 'Purchase history and transaction records'),
      deleted: true,
    },
    {
      label: t('deleteInfo.data.esims', 'Active eSIMs and associated data'),
      deleted: true,
    },
    {
      label: t('deleteInfo.data.preferences', 'App preferences and settings'),
      deleted: true,
    },
    {
      label: t('deleteInfo.data.contactRequests', 'Support requests and messages'),
      deleted: true,
    },
  ];

  return (
    <div className="min-h-screen relative" dir={isRTL ? 'rtl' : 'ltr'}>
      <BackgroundDecor />

      {/* Header */}
      <div className="relative border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6 sm:px-6">
          <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <TrashIcon className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className={`text-sm font-medium tracking-widest uppercase text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                {t('deleteInfo.title', 'Data Deletion')}
              </p>
            </div>
          </div>
          <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
            {t('deleteInfo.heading', 'Request Account & Data Deletion')}
          </h1>
          <p className={`mt-1.5 text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>
            {t('deleteInfo.subtitle', 'Submit a request to permanently delete your Simnetiq account and all associated personal data.')}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* What gets deleted */}
        <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-5 sm:p-6">
          <h2 className={`text-base font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
            {t('deleteInfo.whatDeleted', 'What data will be deleted?')}
          </h2>
          <p className={`text-sm text-gray-600 mb-4 ${isRTL ? 'text-right' : ''}`}>
            {t('deleteInfo.whatDeletedDesc', 'When you request account deletion, the following data will be permanently removed from our systems:')}
          </p>
          <ul className="space-y-3">
            {dataItems.map((item, idx) => (
              <li key={idx} className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <CheckCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0" />
                <span className="text-sm text-gray-700">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Timeframe & process */}
        <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-5 sm:p-6">
          <h2 className={`text-base font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
            {t('deleteInfo.process', 'Deletion Process')}
          </h2>
          <div className="space-y-4">
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-tufts-blue/10 text-tufts-blue flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
              <div>
                <p className={`text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : ''}`}>
                  {t('deleteInfo.step1Title', 'Submit your request')}
                </p>
                <p className={`text-sm text-gray-500 mt-0.5 ${isRTL ? 'text-right' : ''}`}>
                  {t('deleteInfo.step1Desc', 'Fill out the form below with the email associated with your account.')}
                </p>
              </div>
            </div>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-tufts-blue/10 text-tufts-blue flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
              <div>
                <p className={`text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : ''}`}>
                  {t('deleteInfo.step2Title', 'Verification')}
                </p>
                <p className={`text-sm text-gray-500 mt-0.5 ${isRTL ? 'text-right' : ''}`}>
                  {t('deleteInfo.step2Desc', 'We verify your identity and confirm the request via email.')}
                </p>
              </div>
            </div>
            <div className={`flex gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-tufts-blue/10 text-tufts-blue flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
              <div>
                <p className={`text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : ''}`}>
                  {t('deleteInfo.step3Title', 'Data removal')}
                </p>
                <p className={`text-sm text-gray-500 mt-0.5 ${isRTL ? 'text-right' : ''}`}>
                  {t('deleteInfo.step3Desc', 'Your data is permanently deleted within 30 days of the verified request.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Deletion Form or Success */}
        {submitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50/80 backdrop-blur-sm p-5 sm:p-6 text-center">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t('deleteInfo.successTitle', 'Request Submitted')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('deleteInfo.successDesc', 'We have received your account deletion request. You will receive a confirmation email shortly. Your data will be deleted within 30 days.')}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm p-5 sm:p-6">
            <h2 className={`text-base font-semibold text-gray-900 mb-4 ${isRTL ? 'text-right' : ''}`}>
              {t('deleteInfo.formTitle', 'Request Deletion')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t('contact.fullName', 'Full Name')}
                </label>
                <div className="relative">
                  <UserIcon className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-10 py-3 border border-gray-200 focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue transition-colors ${isRTL ? 'text-right' : ''}`}
                    placeholder={t('contact.fullNamePlaceholder', 'Enter your name')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className={`block text-sm font-medium text-gray-700 mb-2 ${isRTL ? 'text-right' : ''}`}>
                  {t('contact.emailAddress', 'Email Address')}
                </label>
                <div className="relative">
                  <MailIcon className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'right-3' : 'left-3'}`} />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-10 py-3 border border-gray-200 focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue transition-colors ${isRTL ? 'text-right' : ''}`}
                    placeholder={t('contact.emailPlaceholder', 'your@email.com')}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  />
                </div>
                <p className={`mt-1.5 text-xs text-gray-400 ${isRTL ? 'text-right' : ''}`}>
                  {t('deleteInfo.emailHint', 'Use the email address associated with your Simnetiq account.')}
                </p>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <h4 className="text-red-800 font-medium mb-2 text-sm">
                  {t('contact.deletionWarning', 'Account Deletion is Permanent')}
                </h4>
                <p className="text-red-600 text-sm leading-relaxed">
                  {t('contact.deletionAgreement', "I hereby request the deletion of my account and all associated data. I understand this action is irreversible and will result in the permanent loss of my purchase history, active eSIMs, and account settings.")}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex items-center h-5">
                  <input
                    id="agreementAccepted"
                    name="agreementAccepted"
                    type="checkbox"
                    checked={formData.agreementAccepted}
                    onChange={handleInputChange}
                    required
                    className="h-4 w-4 text-tufts-blue focus:ring-tufts-blue border-gray-300 rounded"
                  />
                </div>
                <label htmlFor="agreementAccepted" className="font-medium text-gray-700 text-sm cursor-pointer select-none">
                  {t('contact.confirmDeletion', 'I understand and agree to delete my account and data')}
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-red-600 text-white rounded-full font-medium flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <span>{t('deleteInfo.submitButton', 'Request Account Deletion')}</span>
                    <SendIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Contact info */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>
                {t('deleteInfo.contactAlt', 'You can also request deletion by emailing')}
              </p>
              <a
                href="mailto:support@simnetiq.net"
                className={`text-tufts-blue font-medium hover:underline ${isRTL ? 'block text-right' : ''}`}
              >
                support@simnetiq.net
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeleteInfo;
