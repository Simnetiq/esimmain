'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';

const SimnetiqLogo = ({ className = 'w-7 h-7' }) => (
  <svg className={className} viewBox="0 0 665 831" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g>
      <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="fill-[#1F1F1F] dark:fill-white" />
      <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="stroke-[#1F1F1F] dark:stroke-white" strokeWidth="131" strokeLinejoin="round" />
    </g>
    <path d="M242.302 649.7C226.102 649.7 211.802 646.8 199.402 641C187.002 635.2 177.302 626.9 170.302 616.1C163.302 605.3 159.802 592.3 159.802 577.1V568.7H198.802V577.1C198.802 589.7 202.702 599.2 210.502 605.6C218.302 611.8 228.902 614.9 242.302 614.9C255.902 614.9 266.002 612.2 272.602 606.8C279.402 601.4 282.802 594.5 282.802 586.1C282.802 580.3 281.102 575.6 277.702 572C274.502 568.4 269.702 565.5 263.302 563.3C257.102 560.9 249.502 558.7 240.502 556.7L233.602 555.2C219.202 552 206.802 548 196.402 543.2C186.202 538.2 178.302 531.7 172.702 523.7C167.302 515.7 164.602 505.3 164.602 492.5C164.602 479.7 167.602 468.8 173.602 459.8C179.802 450.6 188.402 443.6 199.402 438.8C210.602 433.8 223.702 431.3 238.702 431.3C253.702 431.3 267.002 433.9 278.602 439.1C290.402 444.1 299.602 451.7 306.202 461.9C313.002 471.9 316.402 484.5 316.402 499.7V508.7H277.402V499.7C277.402 491.7 275.802 485.3 272.602 480.5C269.602 475.5 265.202 471.9 259.402 469.7C253.602 467.3 246.702 466.1 238.702 466.1C226.702 466.1 217.802 468.4 212.002 473C206.402 477.4 203.602 483.5 203.602 491.3C203.602 496.5 204.902 500.9 207.502 504.5C210.302 508.1 214.402 511.1 219.802 513.5C225.202 515.9 232.102 518 240.502 519.8L247.402 521.3C262.402 524.5 275.402 528.6 286.402 533.6C297.602 538.6 306.302 545.2 312.502 553.4C318.702 561.6 321.802 572.1 321.802 584.9C321.802 597.7 318.502 609 311.902 618.8C305.502 628.4 296.302 636 284.302 641.6C272.502 647 258.502 649.7 242.302 649.7ZM352.535 645.5V496.7H389.735V516.2H395.135C397.535 511 402.035 506.1 408.635 501.5C415.235 496.7 425.235 494.3 438.635 494.3C450.235 494.3 460.335 497 468.935 502.4C477.735 507.6 484.535 514.9 489.335 524.3C494.135 533.5 496.535 544.3 496.535 556.7V645.5H458.735V559.7C458.735 548.5 455.935 540.1 450.335 534.5C444.935 528.9 437.135 526.1 426.935 526.1C415.335 530 406.335 530 399.935 537.8C393.535 545.4 390.335 556.1 390.335 569.9V645.5H352.535ZM399.635 479.9L421.835 435.5H464.435L432.635 479.9H399.635Z" className="fill-[#EDEDED] dark:fill-[#1F1F1F]" />
  </svg>
);

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
    <div className="relative min-h-screen bg-[var(--bg-primary)] overflow-hidden">
      {/* Dot grid background — matches login page */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(var(--tufts-blue, #4975D4) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" aria-hidden="true" />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-[var(--bg-secondary)] p-6 sm:p-10">
            {/* Logo */}
            <div className="mb-8 flex justify-center">
              <SimnetiqLogo className="h-10 w-auto" />
            </div>

            {/* 404 Number */}
            <p className="text-8xl sm:text-9xl font-bold leading-none select-none text-center text-eerie-black dark:text-white opacity-10 dark:opacity-20">
              404
            </p>

            {/* Title */}
            <h1 className="mt-4 text-2xl sm:text-3xl font-semibold text-center text-eerie-black dark:text-white">
              {t('notFound.title', 'Page Not Found')}
            </h1>

            {/* Description */}
            <p className="mt-3 text-base text-center text-text-muted">
              {t('notFound.description', "The page you are looking for doesn't exist or has been moved. Let's get you back on track.")}
            </p>

            {/* Divider */}
            <div className="w-full h-px my-8" style={{ backgroundColor: 'var(--divider)' }} />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href={getLocalizedUrl('/')}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-semibold transition-all duration-200"
                style={{ backgroundColor: 'var(--login-bg)', color: 'var(--login-text)' }}
              >
                {t('notFound.goHome', 'Go Home')}
              </Link>

              <button
                onClick={handleGoBack}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-[var(--bg-primary)] border border-[var(--card-border)] rounded-full font-semibold hover:bg-[var(--hover-bg)] transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                <span>{t('notFound.goBack', 'Go Back')}</span>
              </button>
            </div>

            {/* Help */}
            <p className="mt-6 text-xs text-text-muted text-center">
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
