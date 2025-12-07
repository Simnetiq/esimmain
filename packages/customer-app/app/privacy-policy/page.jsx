'use client';

import dynamic from 'next/dynamic';
import RTLWrapper from '../../src/components/RTLWrapper';

const PrivacyPolicy = dynamic(() => import('../../src/components/PrivacyPolicy'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function PrivacyPolicyPage() {
  return (
    <RTLWrapper>
      <PrivacyPolicy />
    </RTLWrapper>
  );
}
