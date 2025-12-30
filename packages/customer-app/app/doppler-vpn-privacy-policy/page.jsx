'use client';

import dynamic from 'next/dynamic';
import RTLWrapper from '../../src/components/RTLWrapper';

const DopplerVPNPrivacyPolicy = dynamic(() => import('../../src/components/DopplerVPNPrivacyPolicy'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  )
});

export default function DopplerVPNPrivacyPolicyPage() {
  return (
    <RTLWrapper>
      <DopplerVPNPrivacyPolicy />
    </RTLWrapper>
  );
}
