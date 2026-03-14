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
      <main className="min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
