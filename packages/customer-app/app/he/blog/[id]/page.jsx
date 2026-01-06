import BlogPost from '../../../../src/components/BlogPost';
import blogServiceSupabase from '@esim/shared/services/blogServiceSupabase';

// Supported languages for hreflang
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'he', 'ru'];

// Generate hreflang alternates for blog posts
function generateBlogAlternates(baseUrl, slug, currentLang, availableLanguages = []) {
  const alternates = {
    canonical: `${baseUrl}/${currentLang}/blog/${slug}`,
    languages: {}
  };

  // x-default points to English version
  alternates.languages['x-default'] = `${baseUrl}/blog/${slug}`;
  alternates.languages['en'] = `${baseUrl}/blog/${slug}`;

  // Add all available translations
  SUPPORTED_LANGUAGES.forEach(lang => {
    if (lang !== 'en') {
      if (availableLanguages.length === 0 || availableLanguages.includes(lang)) {
        alternates.languages[lang] = `${baseUrl}/${lang}/blog/${slug}`;
      }
    }
  });

  return alternates;
}

export async function generateMetadata({ params }) {
  try {
    // Fetch the actual blog post data for Hebrew
    const post = await blogServiceSupabase.getPostBySlug(params.id, 'he');
    
    if (!post) {
      return {
        title: 'פוסט בבלוג לא נמצא | Simnetiq',
        description: 'הפוסט בבלוג שאתה מחפש לא נמצא.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const postUrl = `${baseUrl}/he/blog/${params.id}`;
    const imageUrl = post.featuredImage ? 
      (post.featuredImage.startsWith('http') ? post.featuredImage : `${baseUrl}${post.featuredImage}`) :
      `${baseUrl}/images/og-image.svg`;

    // Get available languages for this post
    const availableLanguages = post.availableLanguages || [];

    return {
      title: `${post.title} | Simnetiq Blog`,
      description: post.excerpt || post.seoDescription || 'קרא את התובנות האחרונות שלנו על טכנולוגיית eSIM וקישוריות גלובלית.',
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'נסיעות', 'קישוריות', 'בלוג'],
      authors: [{ name: post.author || 'צוות Simnetiq' }],
      creator: post.author || 'Simnetiq',
      publisher: 'Simnetiq',
      
      // Open Graph for Facebook, LinkedIn, etc.
      openGraph: {
        type: 'article',
        locale: 'he_IL',
        url: postUrl,
        title: post.title,
        description: post.excerpt || post.seoDescription || 'קרא את התובנות האחרונות שלנו על טכנולוגיית eSIM וקישוריות גלובלית.',
        siteName: 'Simnetiq',
        images: [
          {
            url: imageUrl,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
        article: {
          publishedTime: post.publishedAt?.toISOString(),
          modifiedTime: post.updatedAt?.toISOString(),
          author: post.author,
          section: post.category,
          tags: post.tags,
        },
      },
      
      // Twitter Cards
      twitter: {
        card: 'summary_large_image',
        title: post.title,
        description: post.excerpt || post.seoDescription || 'קרא את התובנות האחרונות שלנו על טכנולוגיית eSIM וקישוריות גלובלית.',
        images: [imageUrl],
        creator: '@Simnetiq',
        site: '@Simnetiq',
      },
      
      // Hreflang alternates for multilingual SEO
      alternates: generateBlogAlternates(baseUrl, params.id, 'he', availableLanguages),
      
      // Robots
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    }
  } catch (error) {
    console.error('Error generating metadata for Hebrew blog post:', error);
    return {
      title: 'פוסט בבלוג | Simnetiq',
      description: 'קרא את התובנות האחרונות שלנו על טכנולוגיית eSIM וקישוריות גלובלית.',
    }
  }
}

export default function HebrewBlogPostPage({ params }) {
  return <BlogPost slug={params.id} />;
}
