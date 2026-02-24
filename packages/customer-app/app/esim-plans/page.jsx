'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../../src/components/EsimPlans';

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
