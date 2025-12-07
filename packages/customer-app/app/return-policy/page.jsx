import dynamic from 'next/dynamic';

export const metadata = {
  title: 'Return Policy - No Returns or Exchanges - eSIM Plans',
  description: 'Our eSIM return policy: No returns or exchanges accepted. All purchases are final sale due to the digital nature of eSIM products.',
  keywords: ['return policy', 'no returns', 'no exchanges', 'final sale', 'eSIM policy', 'digital goods'],
  openGraph: {
    title: 'Return Policy - No Returns or Exchanges - eSIM Plans',
    description: 'Our eSIM return policy: No returns or exchanges accepted. All purchases are final sale.',
    url: '/return-policy',
  },
  alternates: {
    canonical: '/return-policy',
  },
};

const ReturnPolicy = dynamic(() => import('../../src/components/ReturnPolicy'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function ReturnPolicyPage() {
  return <ReturnPolicy />;
}
