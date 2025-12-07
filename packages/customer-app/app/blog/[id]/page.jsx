import { Suspense } from 'react'
import BlogPost from '../../../src/components/BlogPost'
import Loading from '../../../src/components/Loading'
import blogServiceSeparate from '@esim/shared/services/blogServiceSeparate'

export async function generateMetadata({ params }) {
  try {
    // Fetch the actual blog post data
    const post = await blogServiceSeparate.getPostBySlug(params.id);
    
    if (!post) {
      return {
        title: 'Blog Post Not Found | Simnetiq',
        description: 'The blog post you are looking for could not be found.',
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.Simnetiq.net';
    const postUrl = `${baseUrl}/blog/${params.id}`;
    const imageUrl = post.featuredImage ? 
      (post.featuredImage.startsWith('http') ? post.featuredImage : `${baseUrl}${post.featuredImage}`) :
      `${baseUrl}/images/og-image.svg`;

    return {
      title: `${post.title} | Simnetiq Blog`,
      description: post.excerpt || post.seoDescription || 'Read our latest insights about eSIM technology and global connectivity.',
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'travel', 'connectivity', 'blog'],
      authors: [{ name: post.author || 'Simnetiq Team' }],
      creator: post.author || 'Simnetiq',
      publisher: 'Simnetiq',
      
      // Open Graph for Facebook, LinkedIn, etc.
      openGraph: {
        type: 'article',
        locale: 'en_US',
        url: postUrl,
        title: post.title,
        description: post.excerpt || post.seoDescription || 'Read our latest insights about eSIM technology and global connectivity.',
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
        description: post.excerpt || post.seoDescription || 'Read our latest insights about eSIM technology and global connectivity.',
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
    console.error('Error generating metadata for blog post:', error);
    return {
      title: 'Blog Post | Simnetiq',
      description: 'Read our latest insights about eSIM technology and global connectivity.',
    }
  }
}

export default function BlogPostPage({ params }) {
  return (
    <Suspense fallback={<Loading />}>
      <BlogPost slug={params.id} />
    </Suspense>
  )
}
