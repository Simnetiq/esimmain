'use client';

import React, { Suspense } from 'react';
import EsimPlans from '../../../src/components/EsimPlans';

export default function EsimPlansPage() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto">
        <Suspense fallback={
          <div className="flex justify-center items-center min-h-64">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tufts-blue"></div>
          </div>
        }>
          <EsimPlans />
        </Suspense>
      </div>
    </div>
  );
}
