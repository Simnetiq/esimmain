export function BlogJsonLd({ post, locale }) {
  if (!post) return null;

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
  const prefix = locale === 'en' ? '' : `/${locale}`;
  const postUrl = `${baseUrl}${prefix}/blog/${post.baseSlug || post.slug}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt || '',
    image: post.featuredImage || `${baseUrl}/images/og-image.svg`,
    datePublished: post.publishedAt instanceof Date ? post.publishedAt.toISOString() : post.publishedAt,
    dateModified: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
    author: {
      '@type': 'Organization',
      name: post.author || 'Simnetiq',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Simnetiq',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/logo_icon/logo.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
    inLanguage: locale || 'en',
    articleSection: post.category || 'General',
    keywords: post.tags?.join(', ') || '',
    wordCount: post.content ? post.content.split(/\s+/).length : 0,
    url: postUrl,
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
    </>
  );
}
