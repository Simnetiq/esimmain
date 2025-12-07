'use client';

import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
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

export default function HomePage() {
  const pathname = usePathname();
  const { locale } = useI18n();
  const [selectedCountryFromHero, setSelectedCountryFromHero] = useState(null);
  const plansRef = useRef(null);

  // Detect current language (default to 'en' for root pages)
  const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  const handleCountrySelect = (country) => {
    setSelectedCountryFromHero(country);
    // Scroll to plans section
    if (plansRef.current) {
      plansRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <>
      <div dir={isRTL ? 'rtl' : 'ltr'} lang={currentLanguage}>
        <main className="min-h-screen bg-white">
          {/* Hero Section */}
          <HeroSection onCountrySelect={handleCountrySelect} />

          {/* Features Section */}
          <FeaturesSection />

          {/* Plans Section */}
          <div ref={plansRef}>
            <PlansSection selectedCountry={selectedCountryFromHero} />
          </div>

          {/* How It Works & Mobile Apps Section (Combined) */}
          <ActivationSection />
        </main>
      </div>
      
    </>
  );
}
