import BlogPost from '../../../../src/components/BlogPost';
import blogServiceSeparate from '@esim/shared/services/blogServiceSeparate';

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
    // Fetch the actual blog post data for Arabic
    const post = await blogServiceSeparate.getPostBySlug(params.id, 'ar');
    
    if (!post) {
      return {
        title: 'مقال المدونة غير موجود | Simnetiq',
        description: 'مقال المدونة الذي تبحث عنه غير موجود.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const postUrl = `${baseUrl}/ar/blog/${params.id}`;
    const imageUrl = post.featuredImage ? 
      (post.featuredImage.startsWith('http') ? post.featuredImage : `${baseUrl}${post.featuredImage}`) :
      `${baseUrl}/images/og-image.svg`;

    // Get available languages for this post
    const availableLanguages = post.availableLanguages || [];

    return {
      title: `${post.title} | Simnetiq Blog`,
      description: post.excerpt || post.seoDescription || 'اقرأ أحدث رؤانا حول تقنية eSIM والاتصال العالمي.',
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'سفر', 'اتصال', 'مدونة'],
      authors: [{ name: post.author || 'فريق Simnetiq' }],
      creator: post.author || 'Simnetiq',
      publisher: 'Simnetiq',
      
      // Open Graph for Facebook, LinkedIn, etc.
      openGraph: {
        type: 'article',
        locale: 'ar_SA',
        url: postUrl,
        title: post.title,
        description: post.excerpt || post.seoDescription || 'اقرأ أحدث رؤانا حول تقنية eSIM والاتصال العالمي.',
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
        description: post.excerpt || post.seoDescription || 'اقرأ أحدث رؤانا حول تقنية eSIM والاتصال العالمي.',
        images: [imageUrl],
        creator: '@Simnetiq',
        site: '@Simnetiq',
      },
      
      // Hreflang alternates for multilingual SEO
      alternates: generateBlogAlternates(baseUrl, params.id, 'ar', availableLanguages),
      
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
    console.error('Error generating metadata for Arabic blog post:', error);
    return {
      title: 'مقال مدونة | Simnetiq',
      description: 'اقرأ أحدث رؤانا حول تقنية eSIM والاتصال العالمي.',
    }
  }
}

export default function ArabicBlogPostPage({ params }) {
  return <BlogPost slug={params.id} />;
}
