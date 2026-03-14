import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM voor Reizen — Simnetiq | Mobiele Data Zonder Roaming',
  description: 'Vergeet dure roaming. Simnetiq eSIM: internet in 200+ landen, directe activering, abonnementen vanaf $3.',
  keywords: ['esim kopen', 'esim reizen', 'internet zonder roaming'],
  openGraph: { title: 'eSIM voor Reizen — Simnetiq', description: 'Vergeet dure roaming. Simnetiq eSIM.', type: 'website', locale: 'nl_NL', url: '/nl' },
  twitter: { card: 'summary_large_image', title: 'eSIM voor Reizen — Simnetiq', description: 'Vergeet dure roaming.' },
  alternates: generateAlternates('/'),
};

export default function DutchLayout({ children }) { return children; }
