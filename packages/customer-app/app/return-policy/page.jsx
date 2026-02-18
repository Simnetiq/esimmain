import ReturnPolicyClient from './ReturnPolicyClient';

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

export default function ReturnPolicyPage() {
  return <ReturnPolicyClient />;
}
