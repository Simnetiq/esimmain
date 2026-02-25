import { notFound } from 'next/navigation';
import BlogPost from '../../../../src/components/BlogPost';
import { BlogJsonLd } from '../../../../src/components/seo/BlogJsonLd';
import blogServiceSupabase from '@esim/shared/services/blogServiceSupabase';

const VALID_LOCALES = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'ja', 'pl', 'pt', 'ru', 'uk', 'zh'];
const ALL_LANGUAGES = ['en', ...VALID_LOCALES];

const OG_LOCALES = {
  en: 'en_US', ar: 'ar_SA', de: 'de_DE', es: 'es_ES',
  fr: 'fr_FR', he: 'he_IL', hi: 'hi_IN', ja: 'ja_JP',
  pl: 'pl_PL', pt: 'pt_BR', ru: 'ru_RU', uk: 'uk_UA', zh: 'zh_CN',
};

const FALLBACK_DESC = {
  en: 'Read our latest insights about eSIM technology and global connectivity.',
  ar: 'اقرأ أحدث رؤانا حول تقنية eSIM والاتصال العالمي.',
  de: 'Lesen Sie unsere neuesten Einblicke in die eSIM-Technologie und globale Konnektivität.',
  es: 'Lea nuestras últimas ideas sobre tecnología eSIM y conectividad global.',
  fr: 'Lisez nos dernières informations sur la technologie eSIM et la connectivité mondiale.',
  he: 'קראו את התובנות האחרונות שלנו על טכנולוגיית eSIM וקישוריות גלובלית.',
  ru: 'Читайте наши последние идеи о технологии eSIM и глобальной связи.',
  pt: 'Leia nossas ultimas novidades sobre tecnologia eSIM e conectividade global.',
  ja: 'eSIM技術とグローバル接続に関する最新情報をお読みください。',
  hi: 'eSIM तकनीक और वैश्विक कनेक्टिविटी के बारे में हमारी नवीनतम जानकारी पढ़ें।',
  zh: '阅读我们关于eSIM技术和全球连接的最新见解。',
  pl: 'Przeczytaj nasze najnowsze informacje o technologii eSIM i globalnej łączności.',
  uk: 'Читайте наші найновіші матеріали про технологію eSIM та глобальний зв\'язок.',
};

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateMetadata({ params }) {
  const locale = VALID_LOCALES.includes(params.locale) ? params.locale : null;
  if (!locale) return {};

  try {
    const post = await blogServiceSupabase.getPostBySlug(params.slug, locale);
    if (!post) {
      return {
        title: 'Post Not Found | Simnetiq',
        robots: { index: false },
      };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const slug = post.baseSlug || params.slug;
    const postUrl = `${baseUrl}/${locale}/blog/${slug}`;
    const imageUrl = post.featuredImage?.startsWith('http')
      ? post.featuredImage
      : `${baseUrl}${post.featuredImage || '/images/og-image.svg'}`;

    const description = post.excerpt || post.seoDescription || FALLBACK_DESC[locale] || FALLBACK_DESC.en;
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
      title: `${post.seoTitle || post.title} | Simnetiq Blog`,
      description,
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'travel', 'connectivity'],
      authors: [{ name: post.author || 'Simnetiq Team' }],
      openGraph: {
        type: 'article',
        locale: OG_LOCALES[locale] || 'en_US',
        url: postUrl,
        title: post.seoTitle || post.title,
        description,
        siteName: 'Simnetiq',
        images: [{ url: imageUrl, width: 1200, height: 630, alt: post.title }],
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
        title: post.seoTitle || post.title,
        description,
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
  if (!VALID_LOCALES.includes(params.locale)) {
    notFound();
  }

  // Verify post exists server-side for proper 404
  let post = null;
  try {
    post = await blogServiceSupabase.getPostBySlug(params.slug, params.locale);
  } catch {
    // Fall through to notFound
  }

  if (!post) {
    notFound();
  }

  return (
    <>
      <BlogJsonLd post={post} locale={params.locale} />
      <BlogPost slug={params.slug} />
    </>
  );
}
