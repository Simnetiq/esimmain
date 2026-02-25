import { Suspense } from 'react';
import Blog from '../../../src/components/Blog';
import Loading from '../../../src/components/Loading';
import RTLWrapper from '../../../src/components/RTLWrapper';

const VALID_LOCALES = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'ja', 'pl', 'pt', 'ru', 'uk', 'zh'];

const LOCALE_META = {
  ar: { title: 'المدونة - خطط eSIM', description: 'آخر الأخبار والنصائح حول تقنية eSIM وخطط البيانات العالمية.', ogLocale: 'ar_SA' },
  de: { title: 'Blog - eSIM-Pläne', description: 'Neueste Nachrichten, Tipps und Einblicke zu eSIM-Technologie und globalen Datenplänen.', ogLocale: 'de_DE' },
  es: { title: 'Blog - Planes eSIM', description: 'Últimas noticias, consejos e información sobre tecnología eSIM y planes de datos globales.', ogLocale: 'es_ES' },
  fr: { title: 'Blog - Forfaits eSIM', description: 'Dernières nouvelles, conseils et informations sur la technologie eSIM et les forfaits data mondiaux.', ogLocale: 'fr_FR' },
  he: { title: 'בלוג - תוכניות eSIM', description: 'חדשות אחרונות, טיפים ותובנות על טכנולוגיית eSIM ותוכניות נתונים גלובליות.', ogLocale: 'he_IL' },
  pt: { title: 'Blog - Planos eSIM', description: 'Ultimas noticias, dicas e informacoes sobre tecnologia eSIM e planos de dados globais.', ogLocale: 'pt_BR' },
  ru: { title: 'Блог - Планы eSIM', description: 'Последние новости, советы и аналитика о технологии eSIM и глобальных тарифах.', ogLocale: 'ru_RU' },
  ja: { title: 'ブログ - eSIMプラン', description: 'eSIM技術、旅行接続、グローバルデータプランに関する最新ニュース、ヒント、情報。', ogLocale: 'ja_JP' },
  hi: { title: 'ब्लॉग - eSIM प्लान', description: 'eSIM तकनीक, यात्रा कनेक्टिविटी और वैश्विक डेटा प्लान के बारे में नवीनतम समाचार और जानकारी।', ogLocale: 'hi_IN' },
  zh: { title: '博客 - eSIM套餐', description: '关于eSIM技术、旅行连接和全球数据套餐的最新新闻、技巧和见解。', ogLocale: 'zh_CN' },
  pl: { title: 'Blog - Plany eSIM', description: 'Najnowsze wiadomości, porady i informacje o technologii eSIM i globalnych planach danych.', ogLocale: 'pl_PL' },
  uk: { title: 'Блог - Плани eSIM', description: 'Останні новини, поради та аналітика про технологію eSIM та глобальні тарифи.', ogLocale: 'uk_UA' },
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
