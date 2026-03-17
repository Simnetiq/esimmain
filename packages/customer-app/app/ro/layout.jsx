import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM pentru Călătorii — Simnetiq | Date Mobile fără Roaming',
  description: 'Uită de roaming scump. Simnetiq eSIM: Internet în 200+ țări, activare instantanee, de la $3. Ideal pentru călători și nomazi digitali.',
  openGraph: {
    title: 'eSIM pentru Călătorii — Simnetiq | Date Mobile fără Roaming',
    description: 'Uită de roaming scump. Simnetiq eSIM: Internet în 200+ țări, activare instantanee, de la $3. Ideal pentru călători și nomazi digitali.',
    type: 'website',
    locale: 'ro_RO',
    url: '/ro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM pentru Călătorii — Simnetiq | Date Mobile fără Roaming',
    description: 'Uită de roaming scump. Simnetiq eSIM: Internet în 200+ țări, activare instantanee, de la $3. Ideal pentru călători și nomazi digitali.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
