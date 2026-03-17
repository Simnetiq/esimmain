import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM for Reiser — Simnetiq | Mobildata uten Roaming',
  description: 'Glem dyr roaming. Simnetiq eSIM: Internett i 200+ land, umiddelbar aktivering, fra $3. Perfekt for reisende og digitale nomader.',
  openGraph: {
    title: 'eSIM for Reiser — Simnetiq | Mobildata uten Roaming',
    description: 'Glem dyr roaming. Simnetiq eSIM: Internett i 200+ land, umiddelbar aktivering, fra $3. Perfekt for reisende og digitale nomader.',
    type: 'website',
    locale: 'nb_NO',
    url: '/nb',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM for Reiser — Simnetiq | Mobildata uten Roaming',
    description: 'Glem dyr roaming. Simnetiq eSIM: Internett i 200+ land, umiddelbar aktivering, fra $3. Perfekt for reisende og digitale nomader.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
