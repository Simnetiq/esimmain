import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM til Rejser — Simnetiq | Mobildata uden Roaming',
  description: 'Glem dyr roaming. Simnetiq eSIM: Internet i 200+ lande, øjeblikkelig aktivering, fra $3. Perfekt til rejsende og digitale nomader.',
  openGraph: {
    title: 'eSIM til Rejser — Simnetiq | Mobildata uden Roaming',
    description: 'Glem dyr roaming. Simnetiq eSIM: Internet i 200+ lande, øjeblikkelig aktivering, fra $3. Perfekt til rejsende og digitale nomader.',
    type: 'website',
    locale: 'da_DK',
    url: '/da',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM til Rejser — Simnetiq | Mobildata uden Roaming',
    description: 'Glem dyr roaming. Simnetiq eSIM: Internet i 200+ lande, øjeblikkelig aktivering, fra $3. Perfekt til rejsende og digitale nomader.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
