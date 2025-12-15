'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { HeroSection } from '../src/components/sections';

// Lazy load non-critical sections
const FeaturesSection = dynamic(() => import('../src/components/sections').then(mod => ({ default: mod.FeaturesSection })), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse" />,
});

const PlansSection = dynamic(() => import('../src/components/sections').then(mod => ({ default: mod.PlansSection })), {
  loading: () => <div className="h-96 bg-white animate-pulse" />,
});

const ActivationSection = dynamic(() => import('../src/components/sections').then(mod => ({ default: mod.ActivationSection })), {
  loading: () => <div className="h-96 bg-gray-50 animate-pulse" />,
});

const TravelBlogsSection = dynamic(() => import('../src/components/sections').then(mod => ({ default: mod.TravelBlogsSection })), {
  loading: () => <div className="h-96 bg-white animate-pulse" />,
});

export default function HomePage() {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  const { currentUser, loading: authLoading } = useAuth();
  const [selectedCountryFromHero, setSelectedCountryFromHero] = useState(null);
  const plansRef = useRef(null);

  // Detect current language (default to 'en' for root pages)
  const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && currentUser) {
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.push(dashboardUrl);
    }
  }, [authLoading, currentUser, currentLanguage, router]);

  const handleCountrySelect = (country) => {
    setSelectedCountryFromHero(country);
    // Scroll to plans section
    if (plansRef.current) {
      plansRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Show nothing while checking auth or redirecting
  if (authLoading || currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tufts-blue"></div>
      </div>
    );
  }

  return (
    <>
      <div dir={isRTL ? 'rtl' : 'ltr'} lang={currentLanguage}>
        <main className="min-h-screen bg-white overflow-x-hidden">
          {/* Hero Section - Only for non-authenticated users */}
          <HeroSection onCountrySelect={handleCountrySelect} />

          {/* Features Section */}
          <FeaturesSection />

          {/* Plans Section */}
          <div ref={plansRef}>
            <PlansSection selectedCountry={selectedCountryFromHero} />
          </div>

          {/* How It Works & Mobile Apps Section (Combined) */}
          <ActivationSection />

          {/* Travel Blogs Section - Top 3 Travel Articles */}
          <TravelBlogsSection />
        </main>
      </div>
      
    </>
  );
}
