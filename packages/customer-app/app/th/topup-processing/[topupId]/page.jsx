'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';

const TopUpProcessing = dynamic(() => import('../../../../src/components/TopUpProcessing'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function TopUpProcessingPage({ params }) {
  const { topupId } = use(params);
  return <TopUpProcessing topupId={topupId} />;
}
