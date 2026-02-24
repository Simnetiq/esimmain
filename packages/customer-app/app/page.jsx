'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import HeroSection from '../src/components/sections/HeroSection';

// Lazy load non-critical sections — direct file imports for proper code splitting
const PlansSection = dynamic(() => import('../src/components/sections/PlansSection'), {
  loading: () => <div className="h-96 bg-white animate-pulse" />,
});

const FeaturesSection = dynamic(() => import('../src/components/sections/FeaturesSection'), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse" />,
});

const ActivationSection = dynamic(() => import('../src/components/sections/ActivationSection'), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse" />,
});

const TravelBlogsSection = dynamic(() => import('../src/components/sections/TravelBlogsSection'), {
  loading: () => <div className="h-96 bg-white animate-pulse" />,
});

export default function HomePage() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  const { currentUser, loading: authLoading } = useAuth();

  // Detect current language (default to 'en' for root pages)
  const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Redirect authenticated users to dashboard (non-blocking — don't gate content)
  useEffect(() => {
    if (!authLoading && currentUser) {
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.replace(dashboardUrl);
    }
  }, [authLoading, currentUser, currentLanguage, router]);

  return (
    <>
      <div dir={isRTL ? 'rtl' : 'ltr'} lang={currentLanguage}>
        <main className="min-h-screen bg-white overflow-x-hidden">
          {/* Hero Section - Value proposition + CTAs */}
          <HeroSection />

          {/* Plans Section - Immediate value / social proof */}
          <PlansSection />

          {/* Features Section - Supporting information */}
          <FeaturesSection />

          {/* Activation Section - FAQ */}
          <ActivationSection />

          {/* Travel Blogs Section - Content marketing */}
          <TravelBlogsSection />
        </main>
      </div>
    </>
  );
}
