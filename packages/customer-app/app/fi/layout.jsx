import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM Matkailuun — Simnetiq | Mobiilidata ilman Roamingia',
  description: 'Unohda kallis roaming. Simnetiq eSIM: Internet yli 200 maassa, välitön aktivointi, alkaen $3. Täydellinen matkailijoille ja digitaalisille nomadeille.',
  openGraph: {
    title: 'eSIM Matkailuun — Simnetiq | Mobiilidata ilman Roamingia',
    description: 'Unohda kallis roaming. Simnetiq eSIM: Internet yli 200 maassa, välitön aktivointi, alkaen $3. Täydellinen matkailijoille ja digitaalisille nomadeille.',
    type: 'website',
    locale: 'fi_FI',
    url: '/fi',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM Matkailuun — Simnetiq | Mobiilidata ilman Roamingia',
    description: 'Unohda kallis roaming. Simnetiq eSIM: Internet yli 200 maassa, välitön aktivointi, alkaen $3. Täydellinen matkailijoille ja digitaalisille nomadeille.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
