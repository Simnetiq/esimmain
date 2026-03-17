import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM για Ταξίδια — Simnetiq | Κινητά Δεδομένα χωρίς Roaming',
  description: 'Ξεχάστε το ακριβό roaming. Simnetiq eSIM: Ίντερνετ σε 200+ χώρες, άμεση ενεργοποίηση, από $3. Ιδανικό για ταξιδιώτες και digital nomads.',
  openGraph: {
    title: 'eSIM για Ταξίδια — Simnetiq | Κινητά Δεδομένα χωρίς Roaming',
    description: 'Ξεχάστε το ακριβό roaming. Simnetiq eSIM: Ίντερνετ σε 200+ χώρες, άμεση ενεργοποίηση, από $3. Ιδανικό για ταξιδιώτες και digital nomads.',
    type: 'website',
    locale: 'el_GR',
    url: '/el',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM για Ταξίδια — Simnetiq | Κινητά Δεδομένα χωρίς Roaming',
    description: 'Ξεχάστε το ακριβό roaming. Simnetiq eSIM: Ίντερνετ σε 200+ χώρες, άμεση ενεργοποίηση, από $3. Ιδανικό για ταξιδιώτες και digital nomads.',
  },
  alternates: generateAlternates('/'),
}

export default function Layout({ children }) {
  return children;
}
