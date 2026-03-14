import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM для подорожей — Simnetiq | Мобільний інтернет без роумінгу',
  description: 'Забудьте про дорогий роумінг. Simnetiq eSIM: інтернет у 200+ країнах, миттєва активація, тарифи від $3. Ідеально для мандрівників та цифрових кочівників.',
  keywords: [
    'купити eSIM онлайн',
    'eSIM для подорожей',
    'інтернет за кордоном без роумінгу',
    'eSIM безлімітний трафік подорож',
    'віртуальна SIM-карта мандрівники',
    'цифрові кочівники інтернет',
    'eSIM Європа подорож',
    'eSIM США турист',
    'eSIM Японія подорож',
    'eSIM Таїланд безлімітний',
    'як активувати eSIM iPhone',
    'уникнути плати за роумінг',
    'eSIM чи фізична SIM що краще'
  ],
  openGraph: {
    title: 'eSIM для подорожей — Simnetiq | Мобільний інтернет без роумінгу',
    description: 'Забудьте про дорогий роумінг. Simnetiq eSIM: інтернет у 200+ країнах, миттєва активація, тарифи від $3. Ідеально для мандрівників та цифрових кочівників.',
    type: 'website',
    locale: 'uk_UA',
    url: '/uk',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM для подорожей — Simnetiq | Мобільний інтернет без роумінгу',
    description: 'Забудьте про дорогий роумінг. Simnetiq eSIM: інтернет у 200+ країнах, миттєва активація, тарифи від $3. Ідеально для мандрівників та цифрових кочівників.',
  },
  alternates: generateAlternates('/'),
}

export default function UkrainianLayout({ children }) {
  return children;
}
