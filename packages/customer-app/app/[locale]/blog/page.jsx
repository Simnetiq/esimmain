import { Suspense } from 'react';
import Blog from '../../../src/components/Blog';
import Loading from '../../../src/components/Loading';
import RTLWrapper from '../../../src/components/RTLWrapper';

const VALID_LOCALES = ['ar', 'de', 'es', 'fr', 'he', 'ru'];

const LOCALE_META = {
  ar: { title: 'المدونة - خطط eSIM', description: 'آخر الأخبار والنصائح حول تقنية eSIM وخطط البيانات العالمية.', ogLocale: 'ar_SA' },
  de: { title: 'Blog - eSIM-Pläne', description: 'Neueste Nachrichten, Tipps und Einblicke zu eSIM-Technologie und globalen Datenplänen.', ogLocale: 'de_DE' },
  es: { title: 'Blog - Planes eSIM', description: 'Últimas noticias, consejos e información sobre tecnología eSIM y planes de datos globales.', ogLocale: 'es_ES' },
  fr: { title: 'Blog - Forfaits eSIM', description: 'Dernières nouvelles, conseils et informations sur la technologie eSIM et les forfaits data mondiaux.', ogLocale: 'fr_FR' },
  he: { title: 'בלוג - תוכניות eSIM', description: 'חדשות אחרונות, טיפים ותובנות על טכנולוגיית eSIM ותוכניות נתונים גלובליות.', ogLocale: 'he_IL' },
  ru: { title: 'Блог - Планы eSIM', description: 'Последние новости, советы и аналитика о технологии eSIM и глобальных тарифах.', ogLocale: 'ru_RU' },
};

export async function generateStaticParams() {
  return VALID_LOCALES.map(locale => ({ locale }));
}

export async function generateMetadata({ params }) {
  const locale = VALID_LOCALES.includes(params.locale) ? params.locale : null;
  if (!locale) return {};

  const meta = LOCALE_META[locale];
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';

  const languages = { 'x-default': `${baseUrl}/blog`, en: `${baseUrl}/blog` };
  VALID_LOCALES.forEach(l => { languages[l] = `${baseUrl}/${l}/blog`; });

  return {
    title: meta.title,
    description: meta.description,
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `${baseUrl}/${locale}/blog`,
      locale: meta.ogLocale,
    },
    alternates: {
      canonical: `${baseUrl}/${locale}/blog`,
      languages,
    },
  };
}

export default function LocaleBlogPage({ params }) {
  if (!VALID_LOCALES.includes(params.locale)) {
    return null;
  }
  
  return (
    <RTLWrapper>
      <Suspense fallback={<Loading />}>
        <Blog />
      </Suspense>
    </RTLWrapper>
  );
}
