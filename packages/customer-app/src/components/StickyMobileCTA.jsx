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
        className="pointer-events-auto inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold text-white shadow-lg shadow-tufts-blue/30 transition-transform duration-200 active:scale-95"
        style={{
          backgroundColor: 'var(--tufts-blue, #4975D4)',
          boxShadow: '0 8px 32px rgba(73, 117, 212, 0.4)',
        }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        {t('hero.explorePlans', 'Explore Plans')}
      </Link>
    </div>
  );
}
