import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM för Resor — Simnetiq | Mobildata utan Roaming',
  description: 'Glöm dyr roaming. Simnetiq eSIM: Internet i 200+ länder, omedelbar aktivering, från $3. Perfekt för resenärer och digitala nomader.',
  openGraph: {
    title: 'eSIM för Resor — Simnetiq | Mobildata utan Roaming',
    description: 'Glöm dyr roaming. Simnetiq eSIM: Internet i 200+ länder, omedelbar aktivering, från $3. Perfekt för resenärer och digitala nomader.',
    type: 'website',
    locale: 'sv_SE',
    url: '/sv',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM för Resor — Simnetiq | Mobildata utan Roaming',
    description: 'Glöm dyr roaming. Simnetiq eSIM: Internet i 200+ länder, omedelbar aktivering, från $3. Perfekt för resenärer och digitala nomader.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
