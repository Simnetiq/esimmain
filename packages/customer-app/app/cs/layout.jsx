import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM pro Cestování — Simnetiq | Mobilní Data bez Roamingu',
  description: 'Zapomeňte na drahý roaming. Simnetiq eSIM: Internet ve 200+ zemích, okamžitá aktivace, od $3. Ideální pro cestovatele a digitální nomády.',
  openGraph: {
    title: 'eSIM pro Cestování — Simnetiq | Mobilní Data bez Roamingu',
    description: 'Zapomeňte na drahý roaming. Simnetiq eSIM: Internet ve 200+ zemích, okamžitá aktivace, od $3. Ideální pro cestovatele a digitální nomády.',
    type: 'website',
    locale: 'cs_CZ',
    url: '/cs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM pro Cestování — Simnetiq | Mobilní Data bez Roamingu',
    description: 'Zapomeňte na drahý roaming. Simnetiq eSIM: Internet ve 200+ zemích, okamžitá aktivace, od $3. Ideální pro cestovatele a digitální nomády.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
