import BlogPost from '../../../../src/components/BlogPost';
import blogServiceSeparate from '@esim/shared/services/blogServiceSeparate';

export async function generateMetadata({ params }) {
  try {
    // Fetch the actual blog post data for French
    const post = await blogServiceSeparate.getPostBySlug(params.id, 'fr');
    
    if (!post) {
      return {
        title: 'Article de blog introuvable | Simnetiq',
        description: 'L\'article de blog que vous recherchez est introuvable.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.Simnetiq.net';
    const postUrl = `${baseUrl}/fr/blog/${params.id}`;
    const imageUrl = post.featuredImage ? 
      (post.featuredImage.startsWith('http') ? post.featuredImage : `${baseUrl}${post.featuredImage}`) :
      `${baseUrl}/images/og-image.svg`;

    return {
      title: `${post.title} | Simnetiq Blog`,
      description: post.excerpt || post.seoDescription || 'Lisez nos dernières perspectives sur la technologie eSIM et la connectivité mondiale.',
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'voyage', 'connectivité', 'blog'],
      authors: [{ name: post.author || 'Équipe Simnetiq' }],
      creator: post.author || 'Simnetiq',
      publisher: 'Simnetiq',
      
      // Open Graph for Facebook, LinkedIn, etc.
      openGraph: {
        type: 'article',
        locale: 'fr_FR',
        url: postUrl,
        title: post.title,
        description: post.excerpt || post.seoDescription || 'Lisez nos dernières perspectives sur la technologie eSIM et la connectivité mondiale.',
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
        description: post.excerpt || post.seoDescription || 'Lisez nos dernières perspectives sur la technologie eSIM et la connectivité mondiale.',
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
    console.error('Error generating metadata for French blog post:', error);
    return {
      title: 'Article de blog | Simnetiq',
      description: 'Lisez nos dernières perspectives sur la technologie eSIM et la connectivité mondiale.',
    }
  }
}

export default function FrenchBlogPostPage({ params }) {
  return <BlogPost slug={params.id} />;
}