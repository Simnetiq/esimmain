'use client';

import dynamic from 'next/dynamic';

const TermsOfService = dynamic(() => import('../../src/components/TermsOfService'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function TermsOfServicePage() {
  return <TermsOfService />;
}
