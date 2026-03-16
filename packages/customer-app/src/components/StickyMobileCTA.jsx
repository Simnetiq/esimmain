'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';

export default function StickyMobileCTA() {
  const pathname = usePathname();
  const { locale, t, isLoading } = useI18n();
  const [isVisible, setIsVisible] = useState(false);

  const lang = isLoading ? (detectLanguageFromPath(pathname) || 'en') : (locale || 'en');
  const esimPlansUrl = lang !== 'en' ? `/${lang}/esim-plans` : '/esim-plans';

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setIsVisible(window.scrollY > window.innerHeight * 0.8);
        ticking = false;
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={`fixed bottom-6 inset-x-0 z-50 flex justify-center px-4 lg:hidden transition-all duration-300 pointer-events-none ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'
      }`}
    >
      <Link
        href={esimPlansUrl}
        className="pointer-events-auto inline-flex items-center rounded-full text-sm font-semibold transition-transform duration-200 active:scale-95 rtl-native-flex ps-6 pe-1.5 py-1.5"
        style={{
          backgroundColor: 'var(--cta-primary-bg, var(--tufts-blue, #4975D4))',
          color: 'var(--cta-primary-text, #fff)',
        }}
      >
        <span className="flex-1 text-center">{t('hero.explorePlans', 'Explore Plans')}</span>
        <span
          className="ms-3 flex-shrink-0 inline-flex items-center justify-center rounded-full w-9 h-9 rtl-native-flex"
          style={{ backgroundColor: 'var(--cta-primary-circle-bg, rgba(255,255,255,0.2))' }}
        >
          <svg className="w-4 h-4 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--cta-primary-circle-text, #fff)' }}>
            <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
          </svg>
        </span>
      </Link>
    </div>
  );
}
