"use client";

import React from 'react';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import { trackAppDownloadClick } from '@esim/shared/utils/trackingPixels';

/**
 * Reusable Blog App Download CTA Component
 * Can be used in blog list pages, blog post pages, and anywhere app download promotion is needed
 * 
 * @param {Object} props
 * @param {string} props.language - The language code (en, es, fr, de, ar, he, ru)
 * @param {boolean} props.isRTL - Whether the layout is RTL
 * @param {string} props.className - Additional CSS classes for the container
 * @param {string} props.location - Location identifier for tracking (blog_post, blog_list, contact, etc.)
 * @param {Object} props.context - Additional context for tracking (blog post info, etc.)
 */

// Translations for the component
const translations = {
  title: {
    en: 'Get the Simnetiq App',
    es: 'Obtén la App de Simnetiq',
    fr: 'Téléchargez l\'App Simnetiq',
    de: 'Holen Sie sich die Simnetiq App',
    ar: 'احصل على تطبيق Simnetiq',
    he: 'הורד את אפליקציית Simnetiq',
    ru: 'Скачайте приложение Simnetiq'
  },
  description: {
    en: 'Download our app to easily manage your eSIMs, top up data, and stay connected wherever you go.',
    es: 'Descarga nuestra aplicación para gestionar fácilmente tus eSIMs, recargar datos y mantenerte conectado dondequiera que vayas.',
    fr: 'Téléchargez notre application pour gérer facilement vos eSIM, recharger vos données et rester connecté où que vous soyez.',
    de: 'Laden Sie unsere App herunter, um Ihre eSIMs einfach zu verwalten, Daten aufzuladen und überall verbunden zu bleiben.',
    ar: 'قم بتنزيل تطبيقنا لإدارة بطاقات eSIM الخاصة بك بسهولة، وإعادة شحن البيانات، والبقاء على اتصال أينما ذهبت.',
    he: 'הורד את האפליקציה שלנו כדי לנהל בקלות את ה-eSIM שלך, לטעון נתונים ולהישאר מחובר לאן שתלך.',
    ru: 'Загрузите наше приложение, чтобы легко управлять своими eSIM, пополнять данные и оставаться на связи, где бы вы ни находились.'
  },
  appStore: {
    en: 'App Store',
    es: 'App Store',
    fr: 'App Store',
    de: 'App Store',
    ar: 'App Store',
    he: 'App Store',
    ru: 'App Store'
  },
  googlePlay: {
    en: 'Google Play',
    es: 'Google Play',
    fr: 'Google Play',
    de: 'Google Play',
    ar: 'Google Play',
    he: 'Google Play',
    ru: 'Google Play'
  }
};

const BlogAppDownload = ({ 
  language = 'en', 
  isRTL = false, 
  className = '', 
  location = 'unknown',
  context = {}
}) => {
  const t = (key) => translations[key][language] || translations[key].en;

  const handleDownloadClick = (platform) => {
    trackAppDownloadClick(platform, location, context);
  };

  return (
    <div className={`mt-12 ${className}`} dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative border border-gray-200/50 overflow-hidden">
        <div className="absolute inset-px bg-white"></div>
        <div className="relative flex h-full flex-col overflow-hidden">
          <div className="px-6 py-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            {/* Text Content */}
            <div className="flex-1">
              <p className="text-base lg:text-lg font-medium tracking-tight text-cool-black mb-2">
                {t('title')}
              </p>
              <p className="text-sm lg:text-base font-light text-cool-black">
                {t('description')}
              </p>
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
              {/* iOS Button */}
              <a
                href={appStoreLinks.ios}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDownloadClick('iOS')}
                className="btn-primary text-white shadow-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                <span className="text-base">{t('appStore')}</span>
              </a>

              {/* Android Button */}
              <a
                href={appStoreLinks.android}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleDownloadClick('Android')}
                className="btn-primary text-white shadow-sm inline-flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396z"/>
                </svg>
                <span className="text-base">{t('googlePlay')}</span>
              </a>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-px shadow-sm ring-1 ring-black/5"></div>
      </div>
    </div>
  );
};

export default BlogAppDownload;

