import BlogPost from '../../../../src/components/BlogPost';
import blogServiceSeparate from '@esim/shared/services/blogServiceSeparate';

export async function generateMetadata({ params }) {
  try {
    // Fetch the actual blog post data for Russian
    const post = await blogServiceSeparate.getPostBySlug(params.id, 'ru');
    
    if (!post) {
      return {
        title: 'Пост блога не найден | Simnetiq',
        description: 'Пост блога, который вы ищете, не найден.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.Simnetiq.net';
    const postUrl = `${baseUrl}/ru/blog/${params.id}`;
    const imageUrl = post.featuredImage ? 
      (post.featuredImage.startsWith('http') ? post.featuredImage : `${baseUrl}${post.featuredImage}`) :
      `${baseUrl}/images/og-image.svg`;

    return {
      title: `${post.title} | Simnetiq Blog`,
      description: post.excerpt || post.seoDescription || 'Читайте наши последние идеи о технологии eSIM и глобальной связи.',
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'путешествия', 'связь', 'блог'],
      authors: [{ name: post.author || 'Команда Simnetiq' }],
      creator: post.author || 'Simnetiq',
      publisher: 'Simnetiq',
      
      // Open Graph for Facebook, LinkedIn, etc.
      openGraph: {
        type: 'article',
        locale: 'ru_RU',
        url: postUrl,
        title: post.title,
        description: post.excerpt || post.seoDescription || 'Читайте наши последние идеи о технологии eSIM и глобальной связи.',
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
        description: post.excerpt || post.seoDescription || 'Читайте наши последние идеи о технологии eSIM и глобальной связи.',
        images: [imageUrl],
        creator: '@Simnetiq',
        site: '@Simnetiq',
      },
      
      // Additional meta tags
      alternates: {
        canonical: postUrl,
      },
      
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
    console.error('Error generating metadata for Russian blog post:', error);
    return {
      title: 'Пост блога | Simnetiq',
      description: 'Читайте наши последние идеи о технологии eSIM и глобальной связи.',
    }
  }
}

export default function RussianBlogPostPage({ params }) {
  return <BlogPost slug={params.id} />;
}