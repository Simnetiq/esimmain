'use client';

import dynamic from 'next/dynamic';
import RTLWrapper from '../../src/components/RTLWrapper';

const Contact = dynamic(() => import('../../src/components/Contact'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function ContactPage() {
  return (
    <>
      <RTLWrapper>
        <Contact />
      </RTLWrapper>
    </>
  );
}
