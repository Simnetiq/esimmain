'use client';

import { 
  HeroSection,
  FeaturesSection,
  PlansSection,
  ActivationSection
} from '../../src/components/sections';

export default function ArabicPage() {
  return (
    <div dir="rtl" lang="ar">
      <main className="min-h-screen bg-alice-blue">
        <HeroSection />
        <FeaturesSection />
        <PlansSection />
        <ActivationSection />
      </main>
    </div>
  )
}


