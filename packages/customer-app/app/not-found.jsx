'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';

export default function NotFound() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  const getCurrentLanguage = () => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();

  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-alice-blue via-white to-jordy-blue/20 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto text-center">
        {/* Simnetiq Logo */}
        <div className="mb-8 flex justify-center">
          <img
            src="/images/logoblack.png"
            alt="Simnetiq"
            className="h-8 sm:h-10 w-auto"
          />
        </div>

        {/* 404 Number */}
        <p className="text-8xl sm:text-9xl font-bold text-eerie-black/10 leading-none select-none">
          404
        </p>

        {/* Title */}
        <h1 className="mt-4 text-2xl sm:text-3xl lg:text-4xl font-semibold text-eerie-black">
          {t('notFound.title', 'Page Not Found')}
        </h1>

        {/* Subtitle */}
        <p className="mt-3 text-base sm:text-lg text-cool-black max-w-md mx-auto">
          {t('notFound.description', 'The page you are looking for doesn\'t exist or has been moved. Let\'s get you back on track.')}
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={getLocalizedUrl('/')}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-eerie-black text-white rounded-full font-semibold hover:bg-eerie-black/90 transition-all duration-200 shadow-md hover:shadow-lg w-full sm:w-auto"
          >
            {t('notFound.goHome', 'Go Home')}
          </Link>

          <button
            onClick={handleGoBack}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-white text-eerie-black border-2 border-eerie-black/20 rounded-full font-semibold hover:border-eerie-black/40 transition-all duration-200 w-full sm:w-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            <span>{t('notFound.goBack', 'Go Back')}</span>
          </button>
        </div>

        {/* Footer Message */}
        <div className="mt-12">
          <p className="text-sm text-cool-black">
            {t('notFound.needHelp', 'Need help?')}{' '}
            <Link href={getLocalizedUrl('/contact')} className="text-tufts-blue hover:underline font-medium">
              {t('notFound.contactSupport', 'Contact our support team')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
