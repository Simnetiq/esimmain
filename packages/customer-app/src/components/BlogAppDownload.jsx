"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import { trackAppDownloadClick } from '@esim/shared/utils/trackingPixels';
import { subscribeToNewsletter } from '@esim/shared/services/newsletterService';

/**
 * Blog App Download & Newsletter CTA Component
 * Features two beautiful cards:
 * 1. App download CTA with background image
 * 2. Newsletter signup that saves to Supabase
 */

const BlogAppDownload = ({
  className = '',
  location = 'unknown',
  context = {}
}) => {
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'already_subscribed', 'error'

  const handleDownloadClick = (platform) => {
    trackAppDownloadClick(platform, location, context);
  };

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) return;
    
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const result = await subscribeToNewsletter({
        email: email.trim().toLowerCase(),
        source: 'blog',
        tags: ['blog_subscriber']
      });

      if (result.success) {
        setSubmitStatus('success');
        setEmail('');
      } else if (result.message === 'Email already subscribed') {
        setSubmitStatus('already_subscribed');
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mt-16 space-y-6 ${className}`}>
      {/* App Download CTA Section */}
      <div className="relative isolate overflow-hidden">
        {/* Background image + dark gradient overlay */}
        <div className="absolute inset-0 -z-10">
          <Image
            src="/images/blog.avif"
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority={false}
          />
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.6) 50%, rgba(15, 23, 42, 0.8) 100%)'
            }}
          />
        </div>

        <div className="px-6 py-16 md:px-12 md:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-balance text-white md:text-3xl lg:text-4xl">
              {t('blogApp.appTitle', 'Stay connected wherever you travel')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base font-normal text-pretty text-gray-200 md:text-lg">
              {t('blogApp.appDescription', 'Get instant eSIM data plans for 200+ countries. No physical SIM needed, activate in minutes.')}
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row rtl-native-flex">
              {/* iOS Download */}
              <a
                href={appStoreLinks.ios}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDownloadClick('iOS')}
                className="group inline-flex items-center rounded-full bg-white/10 ps-6 pe-1.5 py-1.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:bg-white/20 hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
              >
                <span className="flex-1 text-center">{t('blogApp.getApp', 'App Store')}</span>
                <span className="ms-3 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white w-9 h-9">
                  <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                  </svg>
                </span>
              </a>

              {/* Android Download */}
              <a
                href={appStoreLinks.android}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDownloadClick('Android')}
                className="group inline-flex items-center rounded-full bg-white ps-6 pe-1.5 py-1.5 text-base font-semibold text-gray-900 ring-1 ring-gray-200 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
              >
                <span className="flex-1 text-center">{t('blogApp.getAndroidApp', 'Google Play')}</span>
                <span className="ms-3 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-gray-100 w-9 h-9">
                  <svg className="w-5 h-5 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                    <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/>
                  </svg>
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter Signup Section */}
      <div className="bg-gray-50/80">
        <div className="flex min-h-40 flex-col flex-wrap items-start justify-center gap-6 px-6 py-10 md:px-10 lg:flex-row lg:items-center">
          {/* Text Content */}
          <div className="max-w-md shrink grow">
            <h3 className="text-lg font-semibold tracking-tight text-balance text-gray-900 md:text-xl text-start">
              {t('blogApp.newsletterTitle', 'Get travel tips & exclusive deals')}
            </h3>
            <p className="mt-1 text-sm text-gray-600 text-start">
              {t('blogApp.newsletterDescription', 'Subscribe to our newsletter for the latest eSIM news, travel guides, and special offers.')}
            </p>
          </div>

          {/* Email Form */}
          <div className="w-full max-w-md grow-0 lg:w-auto">
            {submitStatus === 'success' ? (
              <div className="flex h-14 items-center justify-center rounded-xl bg-green-50 px-6 text-green-700 font-medium">
                {t('blogApp.successMessage', 'Thanks for subscribing! 🎉')}
              </div>
            ) : submitStatus === 'already_subscribed' ? (
              <div className="flex h-14 items-center justify-center rounded-xl bg-blue-50 px-6 text-blue-700 font-medium">
                {t('blogApp.alreadySubscribed', 'You\'re already subscribed!')}
              </div>
            ) : (
              <form onSubmit={handleNewsletterSubmit} className="relative flex w-full">
                <input
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('blogApp.emailPlaceholder', 'Enter your email')}
                  required
                  disabled={isSubmitting}
                  className="h-14 w-full rounded-xl bg-white pe-28 ps-4 text-gray-900 shadow-sm ring-1 ring-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 text-start"
                />
                <button
                  type="submit"
                  disabled={isSubmitting || !email}
                  className="absolute top-1/2 end-2 h-10 -translate-y-1/2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition-all duration-200 hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmitting ? t('blogApp.subscribing', 'Subscribing...') : t('blogApp.subscribe', 'Subscribe')}
                </button>
              </form>
            )}
            
            {submitStatus === 'error' && (
              <p className="mt-2 text-sm text-red-600">
                {t('blogApp.errorMessage', 'Something went wrong. Please try again.')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogAppDownload;
