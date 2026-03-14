import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'Seyahat icin eSIM — Simnetiq | Roaming Olmadan Mobil Veri',
  description: 'Pahali roaming ucretlerini unutun. Simnetiq eSIM: 200+ ulkede internet, aninda aktivasyon, $3 dan basliyor.',
  keywords: ['esim satin al', 'esim seyahat', 'roaming olmadan internet'],
  openGraph: { title: 'Seyahat icin eSIM — Simnetiq', description: 'Pahali roaming ucretlerini unutun. Simnetiq eSIM.', type: 'website', locale: 'tr_TR', url: '/tr' },
  twitter: { card: 'summary_large_image', title: 'Seyahat icin eSIM — Simnetiq', description: 'Pahali roaming ucretlerini unutun.' },
  alternates: generateAlternates('/'),
};

export default function TurkishLayout({ children }) { return children; }
