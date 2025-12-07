'use client';

import dynamic from 'next/dynamic';

const PaymentSuccess = dynamic(() => import('../../src/components/PaymentSuccess'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function PaymentSuccessPage() {
  return <PaymentSuccess />;
}
