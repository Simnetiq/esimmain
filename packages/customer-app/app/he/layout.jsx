import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: 'eSIM לטיולים — Simnetiq | אינטרנט סלולרי בלי רומינג',
  description: 'שכחו מרומינג יקר. Simnetiq eSIM: אינטרנט ב-200+ מדינות, הפעלה תוך דקה, מחירים מ-$3. מושלם למטיילים ונוודים דיגיטליים.',
  keywords: [
    'esim לטיולים',
    'לקנות esim אונליין',
    'אינטרנט בחול בלי רומינג',
    'סים לחול',
    'חבילת גלישה לחול',
    'esim ישראל',
    'esim אירופה',
    'esim ארצות הברית',
    'esim תאילנד',
    'esim יוון',
    'esim טורקיה',
    'esim קפריסין',
    'איך להתקין esim באייפון',
    'esim או סים רגיל',
    'לחסוך ברומינג',
    'אינטרנט לנוודים דיגיטליים'
  ],
  openGraph: {
    title: 'eSIM לטיולים — Simnetiq | אינטרנט סלולרי בלי רומינג',
    description: 'שכחו מרומינג יקר. Simnetiq eSIM: אינטרנט ב-200+ מדינות, הפעלה תוך דקה, מחירים מ-$3. מושלם למטיילים ונוודים דיגיטליים.',
    type: 'website',
    locale: 'he_IL',
    url: '/he',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'eSIM לטיולים — Simnetiq | אינטרנט סלולרי בלי רומינג',
    description: 'שכחו מרומינג יקר. Simnetiq eSIM: אינטרנט ב-200+ מדינות, הפעלה תוך דקה, מחירים מ-$3. מושלם למטיילים ונוודים דיגיטליים.',
  },
  alternates: generateAlternates('/'),
}

export default function HebrewLayout({ children }) {
  return children;
}


