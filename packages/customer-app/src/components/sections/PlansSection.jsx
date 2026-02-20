'use client';

import { Suspense } from 'react';
import EsimPlans from '../EsimPlans';

// PlansSection is now just a wrapper around EsimPlans
// All region logic comes from Supabase - NO hardcoded regions
// isHomePage=true makes "Show More" redirect to /esim-plans instead of expanding
export default function PlansSection() {
  return (
    <Suspense fallback={null}>
      <EsimPlans isHomePage={true} />
    </Suspense>
  );
}
