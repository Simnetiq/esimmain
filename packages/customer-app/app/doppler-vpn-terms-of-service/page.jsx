'use client';

import dynamic from 'next/dynamic';
import RTLWrapper from '../../src/components/RTLWrapper';

const DopplerVPNTermsOfService = dynamic(() => import('../../src/components/DopplerVPNTermsOfService'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  )
});

export default function DopplerVPNTermsOfServicePage() {
  return (
    <RTLWrapper>
      <DopplerVPNTermsOfService />
    </RTLWrapper>
  );
}
