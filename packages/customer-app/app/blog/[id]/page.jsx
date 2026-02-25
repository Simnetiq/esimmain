import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import BlogPost from '../../../src/components/BlogPost'
import { BlogJsonLd } from '../../../src/components/seo/BlogJsonLd'
import Loading from '../../../src/components/Loading'
import blogServiceSupabase from '@esim/shared/services/blogServiceSupabase'

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'he', 'hi', 'ja', 'pl', 'pt', 'ru', 'uk', 'zh'];

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateMetadata({ params }) {
  try {
    const post = await blogServiceSupabase.getPostBySlug(params.id);

    if (!post) {
      return {
        title: 'Blog Post Not Found | Simnetiq',
        description: 'The blog post you are looking for could not be found.',
        robots: { index: false },
      }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const slug = post.baseSlug || params.id;
    const postUrl = `${baseUrl}/blog/${slug}`;
    const imageUrl = post.featuredImage ?
      (post.featuredImage.startsWith('http') ? post.featuredImage : `${baseUrl}${post.featuredImage}`) :
      `${baseUrl}/images/og-image.svg`;

    // Fallback cascade: og_* -> seo_* -> content fields
    const seoTitle = post.seoTitle || post.title;
    const seoDescription = post.seoDescription || post.excerpt || 'Read our latest insights about eSIM technology and global connectivity.';
    const ogTitle = post.ogTitle || seoTitle;
    const ogDescription = post.ogDescription || seoDescription;
    const imageAlt = post.imageAlt || post.title;
    const availableLanguages = post.availableLanguages || [];

    // Build hreflang only for languages with actual translations
    const languages = {};
    languages['x-default'] = `${baseUrl}/blog/${slug}`;
    languages['en'] = `${baseUrl}/blog/${slug}`;
    availableLanguages.forEach(lang => {
      if (lang !== 'en') {
        languages[lang] = `${baseUrl}/${lang}/blog/${slug}`;
      }
    });

    return {
      title: `${seoTitle} | Simnetiq Blog`,
      description: seoDescription,
      keywords: post.seoKeywords?.length > 0 ? post.seoKeywords : ['eSIM', 'travel', 'connectivity', 'blog'],
      authors: [{ name: post.author || 'Simnetiq Team' }],
      creator: post.author || 'Simnetiq',
      publisher: 'Simnetiq',
      openGraph: {
        type: 'article',
        locale: 'en_US',
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
        creator: '@Simnetiq',
        site: '@Simnetiq',
      },
      alternates: { canonical: postUrl, languages },
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

export default async function BlogPostPage({ params }) {
  // Verify the post exists server-side for proper 404
  let post = null;
  try {
    post = await blogServiceSupabase.getPostBySlug(params.id);
  } catch {
    // Fall through to notFound
  }

  if (!post) {
    notFound();
  }

  return (
    <>
      <BlogJsonLd post={post} locale="en" />
      <Suspense fallback={<Loading />}>
        <BlogPost slug={params.id} />
      </Suspense>
    </>
  )
}
