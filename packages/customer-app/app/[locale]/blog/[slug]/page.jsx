import { notFound } from 'next/navigation';
import BlogPost from '../../../../src/components/BlogPost';
import { BlogJsonLd } from '../../../../src/components/seo/BlogJsonLd';
import blogServiceSupabase from '@esim/shared/services/blogServiceSupabase';

const VALID_LOCALES = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'uk', 'zh'];
const ALL_LANGUAGES = ['en', ...VALID_LOCALES];

const OG_LOCALES = {
  en: 'en_US', ar: 'ar_SA', de: 'de_DE', es: 'es_ES',
  fr: 'fr_FR', he: 'he_IL', hi: 'hi_IN', it: 'it_IT',
  ja: 'ja_JP', ko: 'ko_KR', nl: 'nl_NL', pl: 'pl_PL',
  pt: 'pt_BR', ru: 'ru_RU', th: 'th_TH', tr: 'tr_TR',
  uk: 'uk_UA', zh: 'zh_CN',
};

const FALLBACK_DESC = {
  en: 'Read our latest insights about eSIM technology and global connectivity.',
  ar: 'اقرأ أحدث رؤانا حول تقنية eSIM والاتصال العالمي.',
  de: 'Lesen Sie unsere neuesten Einblicke in die eSIM-Technologie und globale Konnektivität.',
  es: 'Lea nuestras últimas ideas sobre tecnología eSIM y conectividad global.',
  fr: 'Lisez nos dernières informations sur la technologie eSIM et la connectivité mondiale.',
  he: 'קראו את התובנות האחרונות שלנו על טכנולוגיית eSIM וקישוריות גלובלית.',
  hi: 'eSIM तकनीक और वैश्विक कनेक्टिविटी के बारे में हमारी नवीनतम जानकारी पढ़ें।',
  it: 'Leggi le nostre ultime novità sulla tecnologia eSIM e la connettività globale.',
  ja: 'eSIM技術とグローバル接続に関する最新情報をお読みください。',
  ko: 'eSIM 기술과 글로벌 연결에 대한 최신 정보를 확인하세요.',
  nl: 'Lees onze laatste inzichten over eSIM-technologie en wereldwijde connectiviteit.',
  pl: 'Przeczytaj nasze najnowsze informacje o technologii eSIM i globalnej łączności.',
  pt: 'Leia nossas ultimas novidades sobre tecnologia eSIM e conectividade global.',
  ru: 'Читайте наши последние идеи о технологии eSIM и глобальной связи.',
  th: 'อ่านข้อมูลล่าสุดเกี่ยวกับเทคโนโลยี eSIM และการเชื่อมต่อทั่วโลก',
  tr: 'eSIM teknolojisi ve küresel bağlantı hakkında en son bilgilerimizi okuyun.',
  uk: 'Читайте наші найновіші матеріали про технологію eSIM та глобальний зв\'язок.',
  zh: '阅读我们关于eSIM技术和全球连接的最新见解。',
};

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateMetadata({ params }) {
  const { locale: localeParam, slug: slugParam } = await params;
  const locale = VALID_LOCALES.includes(localeParam) ? localeParam : null;
  if (!locale) return {};

  try {
    const post = await blogServiceSupabase.getPostBySlug(slugParam, locale);
    if (!post) {
      return {
        title: 'Post Not Found | Simnetiq',
        robots: { index: false },
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const slug = post.baseSlug || slugParam;
    const postUrl = `${baseUrl}/${locale}/blog/${slug}`;
    const imageUrl = post.featuredImage?.startsWith('http')
      ? post.featuredImage
      : `${baseUrl}${post.featuredImage || '/images/og-image.svg'}`;

    // Fallback cascade: og_* -> seo_* -> content fields
    const seoTitle = post.seoTitle || post.title;
    const seoDescription = post.seoDescription || post.excerpt || FALLBACK_DESC[locale] || FALLBACK_DESC.en;
    const ogTitle = post.ogTitle || seoTitle;
    const ogDescription = post.ogDescription || seoDescription;
    const imageAlt = post.imageAlt || post.title;
    const availableLanguages = post.availableLanguages || [];

    // Build hreflang only for languages that actually have translations
    const languages = {};
    languages['x-default'] = `${baseUrl}/blog/${slug}`;
    if (availableLanguages.includes('en') || availableLanguages.length === 0) {
      languages['en'] = `${baseUrl}/blog/${slug}`;
    }
    availableLanguages.forEach(lang => {
      if (lang !== 'en') {
        languages[lang] = `${baseUrl}/${lang}/blog/${slug}`;
      }
    });

    return {
      title: `${seoTitle} | Simnetiq Blog`,
      description: seoDescription,
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'travel', 'connectivity'],
      authors: [{ name: post.author || 'Simnetiq Team' }],
      openGraph: {
        type: 'article',
        locale: OG_LOCALES[locale] || 'en_US',
        url: postUrl,
        title: ogTitle,
        description: ogDescription,
        siteName: 'Simnetiq',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: imageAlt }],
        article: {
          publishedTime: post.publishedAt?.toISOString(),
          modifiedTime: post.updatedAt?.toISOString(),
          author: post.author,
          section: post.category,
          tags: post.tags,
        },
      },
      twitter: {
        card: 'summary_large_image',
        title: ogTitle,
        description: ogDescription,
        images: [imageUrl],
      },
      alternates: { canonical: postUrl, languages },
      robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
      },
    };
  } catch (error) {
    console.error(`Error generating metadata for ${locale} blog post:`, error);
    return { title: 'Blog Post | Simnetiq' };
  }
}

export default async function LocaleBlogPostPage({ params }) {
  const { locale, slug } = await params;
  if (!VALID_LOCALES.includes(locale)) {
    notFound();
  }

  // Verify post exists server-side for proper 404
  let post = null;
  try {
    post = await blogServiceSupabase.getPostBySlug(slug, locale);
  } catch {
    // Fall through to notFound
  }

  if (!post) {
    notFound();
  }

  return (
    <>
      <BlogJsonLd post={post} locale={locale} />
      <BlogPost slug={slug} />
    </>
  );
}
