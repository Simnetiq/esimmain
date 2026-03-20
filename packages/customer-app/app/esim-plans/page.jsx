import React, { Suspense } from 'react';
import EsimPlans from '../../src/components/EsimPlans';

export const metadata = {
  title: 'eSIM Plans — Data Plans for 200+ Countries | Simnetiq',
  description: 'Browse affordable eSIM data plans for over 200 countries. Instant activation, no roaming charges. Find the perfect plan for your next trip with Simnetiq.',
  openGraph: {
    title: 'eSIM Plans — Data Plans for 200+ Countries | Simnetiq',
    description: 'Browse affordable eSIM data plans for over 200 countries. Instant activation, no roaming charges.',
    type: 'website',
  },
};

export default function EsimPlansPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 mx-auto" style={{ borderColor: '#9039FF' }}></div>
        <p className="mt-4 text-eerie-black">Loading plans...</p>
      </div>
    }>
      <EsimPlans />
    </Suspense>
  );
}
