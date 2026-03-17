import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM Perjalanan — Simnetiq | Data Seluler tanpa Roaming',
  description: 'Lupakan roaming mahal. Simnetiq eSIM: Internet di 200+ negara, aktivasi instan, mulai $3. Sempurna untuk wisatawan dan digital nomad.',
  openGraph: {
    title: 'eSIM Perjalanan — Simnetiq | Data Seluler tanpa Roaming',
    description: 'Lupakan roaming mahal. Simnetiq eSIM: Internet di 200+ negara, aktivasi instan, mulai $3. Sempurna untuk wisatawan dan digital nomad.',
    type: 'website',
    locale: 'id_ID',
    url: '/id',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM Perjalanan — Simnetiq | Data Seluler tanpa Roaming',
    description: 'Lupakan roaming mahal. Simnetiq eSIM: Internet di 200+ negara, aktivasi instan, mulai $3. Sempurna untuk wisatawan dan digital nomad.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
