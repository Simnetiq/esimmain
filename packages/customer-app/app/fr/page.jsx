'use client';

import { 
  HeroSection,
  FeaturesSection,
  PlansSection,
  ActivationSection
} from '../../src/components/sections';

export default function FrenchPage() {
  return (
    <div dir="ltr" lang="fr">
      <main className="min-h-screen bg-alice-blue">
        <HeroSection />
        <FeaturesSection />
        <PlansSection />
        <ActivationSection />
      </main>
    </div>
  )
}


