'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

// Inline SVG icons
const ArrowLeftIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const HomeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);

// Grid pattern style
const gridPatternStyle = {
  backgroundSize: '10px 10px',
  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
};

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

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

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue" />
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4"
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ background: 'linear-gradient(to bottom right, rgba(83, 116, 205, 0.08), rgba(240, 249, 255, 0.4), rgba(255, 255, 255, 1))' }}
    >
      {/* Gradient Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.1)' }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px] translate-x-1/4 translate-y-1/4 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.08)' }} />
      
      {/* Grid Pattern */}
      <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />
      <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-24 pointer-events-none" style={gridPatternStyle} />

      <div className="relative max-w-xl mx-auto text-center">
        {/* Illustration */}
        <div className="mb-8 flex justify-center">
          <div className="w-full max-w-sm">
            <Image 
              src="/images/logo_icon/404 Error-rafiki.svg" 
              alt="404 Error Illustration" 
              width={400}
              height={400}
              className="w-full h-auto"
              priority
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-eerie-black tracking-tight">
            {t('notFound.title', 'Oops! Page Not Found')}
          </h1>
          
          <p className="text-gray-600 max-w-md mx-auto">
            {t('notFound.description', "The page you're looking for doesn't exist or has been moved.")}
          </p>

          {/* Action Buttons */}
          <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
            <Link
              href={getLocalizedUrl('/')}
              className={`flex items-center justify-center gap-2 px-6 py-3 bg-eerie-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <HomeIcon className="w-4 h-4" />
              <span>{t('notFound.goHome', 'Go to Homepage')}</span>
            </Link>
            
            <button
              onClick={handleGoBack}
              className={`flex items-center justify-center gap-2 px-6 py-3 bg-white text-eerie-black border border-gray-200 rounded-full font-medium hover:bg-gray-50 transition-colors w-full sm:w-auto ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>{t('notFound.goBack', 'Go Back')}</span>
            </button>
          </div>

          {/* Help Link */}
          <div className="pt-6">
            <p className="text-sm text-gray-500">
              {t('notFound.needHelp', 'Need help?')}{' '}
              <Link href={getLocalizedUrl('/contact')} className="text-tufts-blue hover:underline font-medium">
                {t('notFound.contactSupport', 'Contact our support team')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
