'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

export default function HomePageWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  const { currentUser, loading: authLoading } = useAuth();

  const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Redirect authenticated users to dashboard (non-blocking)
  useEffect(() => {
    if (!authLoading && currentUser) {
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.replace(dashboardUrl);
    }
  }, [authLoading, currentUser, currentLanguage, router]);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} lang={currentLanguage}>
      <main className="min-h-screen overflow-x-hidden bg-bg-primary relative">
        {/* Decorative orbs — span the entire page for unified background */}
        <div className="absolute top-[5%] -start-40 w-[30rem] h-[30rem] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(73, 117, 212, 0.08)' }} aria-hidden="true" />
        <div className="absolute top-[25%] -end-32 w-[36rem] h-[36rem] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(73, 117, 212, 0.05)' }} aria-hidden="true" />
        <div className="absolute top-[55%] -start-24 w-[28rem] h-[28rem] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(73, 117, 212, 0.06)' }} aria-hidden="true" />
        <div className="absolute top-[80%] -end-40 w-[32rem] h-[32rem] rounded-full blur-3xl pointer-events-none" style={{ backgroundColor: 'rgba(73, 117, 212, 0.04)' }} aria-hidden="true" />
        {/* Content above orbs */}
        <div className="relative z-[1]">
          {children}
        </div>
      </main>
    </div>
  );
}
