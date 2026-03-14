import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM per Viaggiare — Simnetiq | Dati Mobili Senza Roaming',
  description: 'Dimentica il roaming costoso. Simnetiq eSIM: internet in 200+ paesi, attivazione istantanea, piani da $3.',
  keywords: ['comprare esim online', 'esim viaggio', 'internet senza roaming'],
  openGraph: { title: 'eSIM per Viaggiare — Simnetiq', description: 'Dimentica il roaming costoso. Simnetiq eSIM.', type: 'website', locale: 'it_IT', url: '/it' },
  twitter: { card: 'summary_large_image', title: 'eSIM per Viaggiare — Simnetiq', description: 'Dimentica il roaming costoso.' },
  alternates: generateAlternates('/'),
};

export default function ItalianLayout({ children }) { return children; }
