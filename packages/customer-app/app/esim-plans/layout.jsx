import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM Plans for 200+ Countries — Buy Online | Simnetiq',
  description: 'Browse eSIM data plans for 200+ countries. Instant activation, no roaming fees, plans from $3. Find the best eSIM for your next trip with Simnetiq.',
  keywords: [
    'buy esim online',
    'esim plans',
    'travel esim',
    'esim for travel',
    'international data plan',
    'esim europe',
    'esim usa',
    'cheap esim data',
    'prepaid esim',
    'global esim plans',
  ],
  openGraph: {
    title: 'eSIM Plans for 200+ Countries — Buy Online | Simnetiq',
    description: 'Browse eSIM data plans for 200+ countries. Instant activation, no roaming fees, plans from $3. Find the best eSIM for your next trip with Simnetiq.',
    url: '/esim-plans',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM Plans for 200+ Countries — Buy Online | Simnetiq',
    description: 'Browse eSIM data plans for 200+ countries. Instant activation, no roaming fees, plans from $3.',
  },
  alternates: generateAlternates('/esim-plans'),
};

export default function EsimPlansLayout({ children }) {
  return children;
}
