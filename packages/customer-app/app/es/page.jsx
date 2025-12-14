'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { 
  HeroSection,
  FeaturesSection,
  PlansSection,
  ActivationSection
} from '../../src/components/sections';

export default function SpanishPage() {
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();
  const [selectedCountryFromHero, setSelectedCountryFromHero] = useState(null);
  const plansRef = useRef(null);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (!authLoading && currentUser) {
      router.push('/es/dashboard');
    }
  }, [authLoading, currentUser, router]);

  const handleCountrySelect = (country) => {
    setSelectedCountryFromHero(country);
    if (plansRef.current) {
      plansRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Show loading while checking auth or redirecting
  if (authLoading || currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tufts-blue"></div>
      </div>
    );
  }

  return (
    <div dir="ltr" lang="es">
      <main className="min-h-screen bg-white">
        <HeroSection onCountrySelect={handleCountrySelect} />
        <FeaturesSection />
        <div ref={plansRef}>
          <PlansSection selectedCountry={selectedCountryFromHero} />
        </div>
        <ActivationSection />
      </main>
    </div>
  );
}
