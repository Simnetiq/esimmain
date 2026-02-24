# Simnetiq Blog System - Technical Blueprint

> Full audit, redesign, and implementation plan.
> Aligned with Doppler VPN's production-grade blog architecture.
> Date: 2026-02-24

---

## Table of Contents

1. [Executive Technical Diagnosis](#1-executive-technical-diagnosis)
2. [Redirect & Routing Fix Plan](#2-redirect--routing-fix-plan)
3. [SEO Architecture Blueprint](#3-seo-architecture-blueprint)
4. [Supabase Schema (SQL-Ready)](#4-supabase-schema-sql-ready)
5. [Blog Automation API Spec](#5-blog-automation-api-spec)
6. [n8n Workflow Design](#6-n8n-workflow-design)
7. [Migration Plan](#7-migration-plan)
8. [Risk Analysis & Edge Cases](#8-risk-analysis--edge-cases)

---

## 1. Executive Technical Diagnosis

### Current State Summary

| Dimension | Simnetiq (Current) | Doppler (Reference) | Gap Severity |
|-----------|-------------------|---------------------|-------------|
| Blog posts | 1 post, 1 language | Mature, 21 locales | Content gap |
| Routing | Manual per-locale folders (7 langs x 2 routes = 14 files) | `next-intl` with `[locale]` dynamic segment (2 files) | **CRITICAL** |
| SSR/SEO | Blog list is client-rendered; no SSR content for crawlers | Full SSR + `generateStaticParams` for ISR | **CRITICAL** |
| JSON-LD | Client-side only (invisible to crawlers) | Server-rendered in dedicated component | **CRITICAL** |
| 404 handling | Returns HTTP 200 with error UI for missing posts | Proper `notFound()` with HTTP 404 | **HIGH** |
| Metadata | Duplicated across 7 locale files; hreflang emits phantom languages | Centralized; hreflang only for existing translations | **HIGH** |
| Sitemap | English-only blog URLs; no locale variants | Full multi-locale sitemap with alternates | **HIGH** |
| ISR/Caching | `force-dynamic` everywhere; 0 caching | `generateStaticParams` + ISR revalidation | **HIGH** |
| Double fetch | `generateMetadata` + client component both fetch same post | Single server fetch, data passed as prop | **MEDIUM** |
| Admin creation | Modal-based, in-place editing only | Full-page form with URL extraction + AI rewrite | **MEDIUM** |
| Automation API | None (translate-blog is internal only) | Dedicated `/api/blog/create` with webhook callback | **CRITICAL** |
| Tags | Array field on `blog_posts` | Normalized `blog_tags` + `blog_post_tags` + translations | **LOW** |
| Internal links | None | `blog_internal_links` table with ordering | **LOW** |
| Translation jobs | None (fire-and-forget) | `translation_jobs` audit table | **MEDIUM** |
| Schema in VCS | No DDL committed; schema lives only in Supabase | Types defined in `types.ts` | **HIGH** |
| Slug handling | Bug: modal generates `{slug}-{lang}`, bulk uses `{slug}` | Single slug per post across all locales | **HIGH** |
| `robots.txt` | Stale `public/robots.txt` with wrong domain | Clean `robots.ts` only | **LOW** |
| View counting | Unbounded increment per page load | Same (both need session guard) | **LOW** |

### 12 Critical Issues (Ordered by Impact)

1. **Blog list is 100% client-rendered** - `Blog.jsx` fetches posts after hydration. Google sees an empty page. The #1 reason blog SEO underperforms.

2. **No automation API** - Cannot create posts from n8n. The translate-blog endpoint is internal to the customer app and requires no auth (vulnerability).

3. **JSON-LD structured data is client-only** - `BlogPost.jsx` generates `BlogPosting` schema in `useMemo`. Crawlers that don't execute JS see nothing.

4. **Missing posts return HTTP 200** - When `getPostBySlug` returns null, the component renders an error UI, not `notFound()`. Google indexes these as valid pages with thin content.

5. **No ISR anywhere** - Every blog page request hits Supabase in real-time. Blog content is static once published; this is wasteful and slow.

6. **14 duplicate route files** - 7 locales x 2 pages, nearly identical. A single `[locale]/blog/[slug]` route would suffice.

7. **Hreflang emits phantom languages** - When `availableLanguages` is empty, all 7 languages are emitted even if translations don't exist. Google sees broken hreflang.

8. **Sitemap has English-only blog URLs** - `/blog/{slug}` only. No `/fr/blog/{slug}`, `/de/blog/{slug}` etc. Google doesn't know localized blog pages exist.

9. **Slug inconsistency** - `BlogPostModal.jsx:87` generates `{slug}-{lang}` for per-language slugs, but `BlogManagement.jsx:472` uses just `{slug}`. The `blog_post_translations_unique_slug` constraint will cause collisions or lookup failures.

10. **No schema DDL in version control** - 6 RPC functions and 2 tables exist only in Supabase. No migration files committed.

11. **translate-blog API has no authentication** - `customer-app/app/api/translate-blog/route.js` is a public endpoint that calls OpenAI with a key from `app_config`. Anyone can trigger unlimited translations.

12. **Double Supabase fetch per post** - `generateMetadata` fetches the post server-side, then `BlogPost.jsx` fetches the same post client-side again.

---

## 2. Redirect & Routing Fix Plan

### Problem Statement

The current routing uses physical folders per locale (`app/ar/blog/`, `app/de/blog/`, etc.). This creates:
- 14 near-identical files that drift out of sync
- No middleware-driven locale routing for `/blog` paths
- Missing posts return 200 instead of 404
- Blog list pages are `force-dynamic` but render no server content (client component does the work)

### Solution: Unified `[locale]` Routing

**Target architecture** (matching Doppler):

```
app/
  [locale]/
    blog/
      page.jsx          # Blog list (SSR)
      [slug]/
        page.jsx        # Blog post (SSR + ISR)
  blog/                 # English fallback (redirects or serves en)
    page.jsx
    [slug]/
      page.jsx
```

### Implementation Steps

#### Step 1: Middleware Enhancement

File: `packages/customer-app/middleware.js`

Current middleware only redirects `/` based on `Accept-Language`. Extend it to:

```javascript
// Match blog routes without locale prefix
// /blog/some-post → detect language → redirect to /en/blog/some-post (or serve as English)
const blogPathRegex = /^\/blog(\/.*)?$/;

if (blogPathRegex.test(pathname)) {
  // Option A: Serve as English (no redirect, set x-language: en)
  // Option B: Redirect to /{detected-locale}/blog/...
  // Recommendation: Option A (avoid redirect chains for SEO)
}

// Match locale-prefixed blog routes
const localeBlogRegex = /^\/(ar|de|es|fr|he|ru)\/blog(\/.*)?$/;
if (localeBlogRegex.test(pathname)) {
  // Extract locale, set x-language header, pass through
}
```

**Decision: Use Option A** - Treat `/blog/*` as English. This preserves existing Google-indexed URLs and avoids redirect penalties.

#### Step 2: Create Unified Route Files

**`app/[locale]/blog/page.jsx`** (replaces 7 list pages):
```jsx
// Server component - fetches posts at request time
import { blogServiceSupabase } from '@esim/shared/services/blogServiceSupabase';
import BlogList from '@/components/BlogList'; // New server-compatible component

const VALID_LOCALES = ['en', 'ar', 'de', 'es', 'fr', 'he', 'ru'];

export async function generateMetadata({ params }) {
  const locale = VALID_LOCALES.includes(params.locale) ? params.locale : 'en';
  // Return locale-specific metadata with proper canonical and alternates
}

export default async function BlogPage({ params }) {
  const locale = VALID_LOCALES.includes(params.locale) ? params.locale : 'en';
  const { posts } = await blogServiceSupabase.getPublishedPosts(50, 0, locale);
  // Pass posts as props to a client component for interactivity
  return <BlogList initialPosts={posts} locale={locale} />;
}
```

**`app/[locale]/blog/[slug]/page.jsx`** (replaces 7 post pages):
```jsx
import { notFound } from 'next/navigation';
import { blogServiceSupabase } from '@esim/shared/services/blogServiceSupabase';
import BlogPostView from '@/components/BlogPostView';
import { BlogJsonLd } from '@/components/seo/BlogJsonLd'; // NEW: server component

export const revalidate = 3600; // ISR: revalidate every hour

export async function generateStaticParams() {
  const { posts } = await blogServiceSupabase.getAllPosts(100);
  const locales = ['en', 'ar', 'de', 'es', 'fr', 'he', 'ru'];
  return posts.flatMap(post =>
    locales.map(locale => ({ locale, slug: post.baseSlug }))
  );
}

export async function generateMetadata({ params }) {
  const post = await blogServiceSupabase.getPostBySlug(params.slug, params.locale);
  if (!post) return {};

  const baseUrl = 'https://www.simnetiq.store';
  const availableLangs = post.availableLanguages || [];
  const alternates = {};
  availableLangs.forEach(lang => {
    const prefix = lang === 'en' ? '' : `/${lang}`;
    alternates[lang] = `${baseUrl}${prefix}/blog/${post.baseSlug}`;
  });
  alternates['x-default'] = `${baseUrl}/blog/${post.baseSlug}`;

  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    alternates: {
      canonical: `${baseUrl}/${params.locale}/blog/${post.baseSlug}`,
      languages: alternates,
    },
    openGraph: {
      type: 'article',
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      url: `${baseUrl}/${params.locale}/blog/${post.baseSlug}`,
      images: post.featuredImage ? [{ url: post.featuredImage, width: 1200, height: 630 }] : [],
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author],
      section: post.category,
      tags: post.tags,
      locale: params.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt,
      images: post.featuredImage ? [post.featuredImage] : [],
    },
    robots: { index: true, follow: true },
  };
}

export default async function BlogPostPage({ params }) {
  const post = await blogServiceSupabase.getPostBySlug(params.slug, params.locale);
  if (!post) notFound(); // <-- HTTP 404, not a soft error

  return (
    <>
      <BlogJsonLd post={post} locale={params.locale} />
      <BlogPostView post={post} locale={params.locale} />
    </>
  );
}
```

#### Step 3: Server-Rendered JSON-LD Component

**New file: `packages/customer-app/src/components/seo/BlogJsonLd.jsx`**
```jsx
// Server component - rendered in HTML, visible to crawlers
export function BlogJsonLd({ post, locale }) {
  const baseUrl = 'https://www.simnetiq.store';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.featuredImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    author: { '@type': 'Organization', name: 'Simnetiq' },
    publisher: {
      '@type': 'Organization',
      name: 'Simnetiq',
      logo: { '@type': 'ImageObject', url: `${baseUrl}/logo.png` }
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/${locale}/blog/${post.baseSlug}`
    },
    inLanguage: locale,
    articleSection: post.category,
    keywords: post.tags?.join(', '),
    wordCount: post.content?.split(/\s+/).length || 0,
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${baseUrl}/blog` },
      { '@type': 'ListItem', position: 3, name: post.title },
    ]
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
    </>
  );
}
```

#### Step 4: Delete Redundant Files

After the unified route is working, delete:
```
app/ar/blog/page.jsx
app/ar/blog/[id]/page.jsx
app/de/blog/page.jsx
app/de/blog/[id]/page.jsx
app/es/blog/page.jsx
app/es/blog/[id]/page.jsx
app/fr/blog/page.jsx
app/fr/blog/[id]/page.jsx
app/he/blog/page.jsx
app/he/blog/[id]/page.jsx
app/ru/blog/page.jsx
app/ru/blog/[id]/page.jsx
```

Keep `app/blog/page.jsx` and `app/blog/[id]/page.jsx` as English-only entry points that either redirect or serve English content directly.

#### Step 5: Fix the Double-Fetch Problem

The unified `[slug]/page.jsx` above fetches the post server-side and passes it as a prop. The client component (`BlogPostView`) receives `post` directly and does NOT re-fetch. View counting is done via a lightweight `useEffect` in the client component (no data re-fetch needed).

---

## 3. SEO Architecture Blueprint

### 3.1 Metadata Strategy

| Element | Implementation | Location |
|---------|---------------|----------|
| `<title>` | `meta_title \|\| title` (max 70 chars) | `generateMetadata` |
| `<meta description>` | `meta_description \|\| excerpt` (max 160 chars) | `generateMetadata` |
| `canonical` | Absolute URL with locale prefix | `generateMetadata.alternates.canonical` |
| `hreflang` | Only for languages with actual translations | `generateMetadata.alternates.languages` |
| `x-default` | Points to English URL | `generateMetadata.alternates.languages` |
| `og:type` | `article` | `generateMetadata.openGraph` |
| `og:image` | Featured image, 1200x630 | `generateMetadata.openGraph.images` |
| `og:locale` | Locale code (e.g., `en_US`, `de_DE`) | `generateMetadata.openGraph.locale` |
| `twitter:card` | `summary_large_image` | `generateMetadata.twitter` |
| `robots` | `index, follow` for published; `noindex` for drafts | `generateMetadata.robots` |

### 3.2 Structured Data (JSON-LD)

Two schemas per blog post page, both server-rendered:

**Schema 1: `BlogPosting`**
```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "description": "...",
  "image": "...",
  "datePublished": "2026-02-24T00:00:00Z",
  "dateModified": "2026-02-24T00:00:00Z",
  "author": { "@type": "Organization", "name": "Simnetiq" },
  "publisher": {
    "@type": "Organization",
    "name": "Simnetiq",
    "logo": { "@type": "ImageObject", "url": "https://www.simnetiq.store/logo.png" }
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://www.simnetiq.store/en/blog/slug" },
  "inLanguage": "en",
  "articleSection": "Travel",
  "keywords": "esim, travel, data",
  "wordCount": 1200
}
```

**Schema 2: `BreadcrumbList`**
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.simnetiq.store" },
    { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.simnetiq.store/blog" },
    { "@type": "ListItem", "position": 3, "name": "Article Title" }
  ]
}
```

### 3.3 Sitemap (Multi-Language)

Replace current `app/sitemap.js` with:

```javascript
export default async function sitemap() {
  const baseUrl = 'https://www.simnetiq.store';
  const locales = ['en', 'ar', 'de', 'es', 'fr', 'he', 'ru'];

  // Static pages
  const staticPages = ['', '/blog', '/pricing'].flatMap(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: path === '/blog' ? 'daily' : 'weekly',
    priority: path === '' ? 1.0 : 0.8,
    alternates: {
      languages: Object.fromEntries(
        locales.map(l => [l, `${baseUrl}/${l}${path}`])
      )
    }
  }));

  // Blog posts - with per-locale alternates based on ACTUAL translations
  const supabase = createServiceClient();
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('base_slug, updated_at, blog_post_translations(language)')
    .eq('status', 'published');

  const blogEntries = (posts || []).map(post => {
    const availableLangs = post.blog_post_translations.map(t => t.language);
    const alternates = {};
    availableLangs.forEach(lang => {
      const prefix = lang === 'en' ? '' : `/${lang}`;
      alternates[lang] = `${baseUrl}${prefix}/blog/${post.base_slug}`;
    });

    return {
      url: `${baseUrl}/blog/${post.base_slug}`,
      lastModified: post.updated_at,
      changeFrequency: 'weekly',
      priority: 0.7,
      alternates: { languages: alternates }
    };
  });

  return [...staticPages, ...blogEntries];
}
```

### 3.4 robots.txt

Delete `public/robots.txt` (stale, wrong domain). Keep `app/robots.js` as-is.

### 3.5 Slug Rules

| Rule | Implementation |
|------|---------------|
| Single slug per post | `blog_posts.base_slug` is the canonical slug for all languages |
| Slug format | Lowercase, alphanumeric + hyphens, max 100 chars |
| No locale in slug | `/fr/blog/how-to-use-esim` not `/fr/blog/comment-utiliser-esim` |
| Uniqueness | Enforced by `UNIQUE` constraint on `blog_posts.base_slug` |
| Auto-generation | From English title via `slugify()` |
| Immutability | Once published, slug should never change (add redirect if needed) |

### 3.6 Internal Linking Strategy

Add `blog_internal_links` table (matching Doppler) to enable:
- "Related posts" section at bottom of each article
- Ordered links per post (up to 3-5 related articles)
- Bidirectional linking considered by the admin
- Links respect language context (show related post in same locale)

---

## 4. Supabase Schema (SQL-Ready)

### 4.1 Schema Alignment Plan

The Simnetiq schema is close but needs several additions to match Doppler. Here is the complete target schema with migration SQL.

### 4.2 Current vs Target Comparison

| Feature | Simnetiq Current | Target (Doppler-aligned) |
|---------|-----------------|--------------------------|
| `blog_posts.slug` | `base_slug` column | Keep `base_slug` |
| `blog_posts.author_name` | `author` (varchar) | Keep as-is (no FK needed) |
| `blog_posts.image_url` | `featured_image` (text) | Keep as-is |
| Tags | `tags text[]` on `blog_posts` | Keep array (normalized tags are overkill for 7 languages) |
| `blog_post_translations.locale` | `language` (enum) | Keep `language` (already works) |
| `blog_post_translations.meta_title` | `seo_title` | Keep `seo_title` |
| `blog_post_translations.meta_description` | `seo_description` | Keep `seo_description` |
| `blog_post_translations.og_title` | **MISSING** | **ADD** |
| `blog_post_translations.og_description` | **MISSING** | **ADD** |
| `blog_post_translations.image_alt` | **MISSING** | **ADD** |
| `blog_internal_links` | **MISSING** | **ADD** |
| `translation_jobs` | **MISSING** | **ADD** |

### 4.3 Migration SQL

```sql
-- Migration: Align Simnetiq blog schema with Doppler reference
-- Run on: eujmomonscnlmwcbkbfy

-- 1. Add missing columns to blog_post_translations
ALTER TABLE blog_post_translations
  ADD COLUMN IF NOT EXISTS og_title varchar(70),
  ADD COLUMN IF NOT EXISTS og_description varchar(200),
  ADD COLUMN IF NOT EXISTS image_alt text;

-- 2. Create blog_internal_links table
CREATE TABLE IF NOT EXISTS blog_internal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  target_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  link_order integer DEFAULT 0,
  CONSTRAINT unique_internal_link UNIQUE (source_post_id, target_post_id),
  CONSTRAINT no_self_link CHECK (source_post_id != target_post_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_links_source ON blog_internal_links(source_post_id);

-- 3. Create translation_jobs table
CREATE TABLE IF NOT EXISTS translation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES blog_posts(id) ON DELETE SET NULL,
  locale text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  model text,
  tokens_used integer,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_translation_jobs_post ON translation_jobs(post_id);
CREATE INDEX IF NOT EXISTS idx_translation_jobs_status ON translation_jobs(status);

-- 4. Enable RLS on new tables
ALTER TABLE blog_internal_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_jobs ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for blog_internal_links
CREATE POLICY "Public can read internal links of published posts"
  ON blog_internal_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_internal_links.source_post_id
      AND blog_posts.status = 'published'
    )
  );

CREATE POLICY "Service role full access for blog_internal_links"
  ON blog_internal_links FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins full access blog_internal_links"
  ON blog_internal_links FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 6. RLS policies for translation_jobs
CREATE POLICY "Service role full access for translation_jobs"
  ON translation_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins full access translation_jobs"
  ON translation_jobs FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- 7. Fix the slug inconsistency:
-- Remove the unique slug constraint on translations (it causes issues when
-- all translations share the same base_slug value, which is the correct behavior)
-- Instead, the unique constraint should be on blog_posts.base_slug (already exists)
DROP INDEX IF EXISTS blog_post_translations_unique_slug;

-- 8. Add missing composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published_at
  ON blog_posts(status, published_at DESC)
  WHERE status = 'published';
-- Note: This already exists as idx_blog_posts_status_published, so this is a safety no-op.
```

### 4.4 RPC Functions — Already Good

The existing Simnetiq RPC functions are well-designed:

- `get_blog_post_by_slug` — 3-tier fallback (preferred lang → English → any) via CTEs. Correct.
- `get_published_blog_posts` — COALESCE-based fallback with `available_languages` subquery. Correct.
- `search_blog_posts` — Full-text search + ILIKE fallback + tag matching. Correct.
- `increment_blog_views` — Simple atomic increment. Correct.
- `get_blog_categories` — Distinct categories from published posts. Correct.

**One enhancement needed:** `get_blog_post_by_slug` should also return `available_languages`:

```sql
-- Add available_languages to the slug lookup RPC
-- (Add to the SELECT at the end of get_blog_post_by_slug)
(
  SELECT array_agg(bpt.language ORDER BY bpt.language)::blog_language_code[]
  FROM blog_post_translations bpt
  WHERE bpt.post_id = bp.id
) as available_languages
```

### 4.5 Indexing Summary

| Index | Table | Purpose | Status |
|-------|-------|---------|--------|
| `blog_posts_pkey` | blog_posts | PK lookup | EXISTS |
| `blog_posts_base_slug_key` | blog_posts | Unique slug constraint | EXISTS |
| `idx_blog_posts_status_published` | blog_posts | Published post queries | EXISTS |
| `idx_blog_posts_published_at` | blog_posts | Sort by date | EXISTS |
| `idx_blog_posts_category` | blog_posts | Category filter | EXISTS |
| `idx_blog_posts_tags` | blog_posts | GIN for tag array contains | EXISTS |
| `blog_post_translations_unique_post_lang` | translations | Unique (post_id, language) | EXISTS |
| `idx_blog_translations_slug` | translations | Slug lookup | EXISTS |
| `idx_blog_translations_search` | translations | GIN full-text search | EXISTS |
| `idx_internal_links_source` | internal_links | Related posts query | **ADD** |
| `idx_translation_jobs_post` | translation_jobs | Job lookup by post | **ADD** |

---

## 5. Blog Automation API Spec

### 5.1 Endpoint Overview

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/api/blog/create` | `BLOG_API_KEY` header | Create post + auto-translate |
| `POST` | `/api/blog/translate` | `BLOG_API_KEY` header | Translate existing post |
| `GET` | `/api/blog/status` | `BLOG_API_KEY` header | Health check + stats |
| `POST` | `/api/blog/revalidate` | `BLOG_API_KEY` header | Trigger ISR revalidation |

### 5.2 Authentication

```
Authorization: Bearer {BLOG_API_KEY}
```

The `BLOG_API_KEY` is a static bearer token stored as an environment variable on Vercel. It is NOT a Supabase key. The API route uses `createServiceClient()` (service role) internally.

**Env var:** `BLOG_API_KEY=simnetiq-blog-{random-64-hex}`

Generate with: `openssl rand -hex 32`

### 5.3 `POST /api/blog/create`

**Request:**
```json
{
  "title": "Best eSIM Plans for Europe in 2026",
  "content": "## Introduction\n\nTraveling to Europe...\n\n## Top Plans\n\n...",
  "slug": "best-esim-plans-europe-2026",
  "excerpt": "Compare the top eSIM plans for European travel in 2026.",
  "featured_image": "https://eujmomonscnlmwcbkbfy.supabase.co/storage/v1/object/public/blog-images/europe.webp",
  "category": "Travel",
  "tags": ["esim", "europe", "travel"],
  "author": "Simnetiq Bot",
  "status": "published",
  "seo_title": "Best eSIM Plans for Europe 2026 | Simnetiq",
  "seo_description": "Compare affordable eSIM data plans for European travel.",
  "seo_keywords": ["esim europe", "travel esim", "european data plan"],
  "auto_translate": true,
  "target_languages": ["es", "fr", "de", "ar", "he", "ru"],
  "webhook_url": "https://n8n.example.com/webhook/blog-created"
}
```

**Required fields:** `title`, `content`
**Optional fields:** Everything else (sensible defaults applied)

**Defaults:**
| Field | Default |
|-------|---------|
| `slug` | Auto-generated from `title` via `slugify()` |
| `excerpt` | First 160 chars of content, HTML stripped |
| `featured_image` | `null` |
| `category` | `"General"` |
| `tags` | `[]` |
| `author` | `"Simnetiq"` |
| `status` | `"published"` |
| `seo_title` | Same as `title` |
| `seo_description` | Same as `excerpt` |
| `seo_keywords` | `[]` |
| `auto_translate` | `true` |
| `target_languages` | All supported non-English languages |
| `webhook_url` | `null` |

**Response (201 Created):**
```json
{
  "success": true,
  "post_id": "uuid",
  "slug": "best-esim-plans-europe-2026",
  "urls": {
    "en": "https://www.simnetiq.store/blog/best-esim-plans-europe-2026",
    "es": "https://www.simnetiq.store/es/blog/best-esim-plans-europe-2026",
    "fr": "https://www.simnetiq.store/fr/blog/best-esim-plans-europe-2026",
    "de": "https://www.simnetiq.store/de/blog/best-esim-plans-europe-2026",
    "ar": "https://www.simnetiq.store/ar/blog/best-esim-plans-europe-2026",
    "he": "https://www.simnetiq.store/he/blog/best-esim-plans-europe-2026",
    "ru": "https://www.simnetiq.store/ru/blog/best-esim-plans-europe-2026"
  },
  "translations": {
    "completed": ["en", "es", "fr", "de"],
    "failed": ["ar"],
    "pending": []
  },
  "translation_complete": false,
  "errors": [
    { "language": "ar", "error": "OpenAI rate limit exceeded" }
  ]
}
```

**Error responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing `title` or `content` |
| 401 | Invalid or missing `BLOG_API_KEY` |
| 409 | Slug already exists |
| 500 | Database error |

**Idempotency:** If a post with the same slug already exists, return `409` with the existing post ID and URLs. The caller can then use `/api/blog/translate` to add missing translations.

### 5.4 `POST /api/blog/translate`

**Request:**
```json
{
  "post_id": "uuid",
  "target_languages": ["ar", "he"],
  "force": false
}
```

- `post_id` (required): UUID of the post to translate
- `target_languages` (optional): Specific languages. Defaults to all missing.
- `force` (optional): If `true`, re-translate even if translation exists.

**Response (200):**
```json
{
  "success": true,
  "post_id": "uuid",
  "translations": {
    "completed": ["ar", "he"],
    "failed": [],
    "skipped": ["en", "es", "fr", "de", "ru"]
  }
}
```

### 5.5 `GET /api/blog/status`

**Response (200):**
```json
{
  "status": "healthy",
  "total_posts": 42,
  "published_posts": 38,
  "draft_posts": 4,
  "translation_coverage": {
    "en": 42,
    "es": 40,
    "fr": 39,
    "de": 38,
    "ar": 35,
    "he": 34,
    "ru": 40
  },
  "recent_posts": [
    { "slug": "best-esim-europe", "title": "...", "published_at": "2026-02-24T..." }
  ]
}
```

### 5.6 `POST /api/blog/revalidate`

Triggers Next.js ISR revalidation for specific paths.

**Request:**
```json
{
  "slug": "best-esim-plans-europe-2026",
  "languages": ["en", "es", "fr"]
}
```

**Implementation:**
```javascript
import { revalidatePath } from 'next/cache';

// Revalidate specific locale paths
languages.forEach(lang => {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  revalidatePath(`${prefix}/blog/${slug}`);
});
// Also revalidate blog list pages
revalidatePath('/blog');
languages.forEach(lang => {
  if (lang !== 'en') revalidatePath(`/${lang}/blog`);
});
```

### 5.7 Route Implementation

**File: `packages/customer-app/app/api/blog/create/route.js`**

```javascript
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

function requireApiKey(request) {
  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === process.env.BLOG_API_KEY;
}

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

export async function POST(request) {
  if (!requireApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { title, content } = body;

  if (!title || !content) {
    return NextResponse.json({ error: 'title and content are required' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const slug = body.slug || slugify(title);
  const excerpt = body.excerpt || content.replace(/<[^>]*>/g, '').substring(0, 160);

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id, base_slug')
    .eq('base_slug', slug)
    .single();

  if (existing) {
    return NextResponse.json({
      error: 'Slug already exists',
      existing_post_id: existing.id,
      slug: existing.base_slug
    }, { status: 409 });
  }

  // Create post
  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .insert({
      base_slug: slug,
      author: body.author || 'Simnetiq',
      category: body.category || 'General',
      tags: body.tags || [],
      featured_image: body.featured_image || null,
      status: body.status || 'published',
      seo_keywords: body.seo_keywords || [],
      published_at: (body.status || 'published') === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  // Insert English translation
  await supabase.from('blog_post_translations').insert({
    post_id: post.id,
    language: 'en',
    title,
    slug,
    content,
    excerpt,
    seo_title: body.seo_title || title,
    seo_description: body.seo_description || excerpt,
  });

  // Auto-translate
  const targetLangs = body.auto_translate !== false
    ? (body.target_languages || ['es', 'fr', 'de', 'ar', 'he', 'ru'])
    : [];

  const results = { completed: ['en'], failed: [], errors: [] };
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';

  for (const lang of targetLangs) {
    try {
      // Log translation job
      const { data: job } = await supabase.from('translation_jobs').insert({
        post_id: post.id,
        locale: lang,
        status: 'processing',
        model: 'gpt-4o-mini'
      }).select().single();

      // Call internal translate endpoint or direct OpenAI
      const translated = await translateContent(title, content, lang, supabase);

      await supabase.from('blog_post_translations').insert({
        post_id: post.id,
        language: lang,
        title: translated.title,
        slug: slug, // Same slug for all languages
        content: translated.content,
        excerpt: translated.content.replace(/<[^>]*>/g, '').substring(0, 160),
        seo_title: translated.title,
        seo_description: translated.title.substring(0, 160),
      });

      // Update job status
      await supabase.from('translation_jobs').update({
        status: 'completed',
        tokens_used: translated.tokens_used || null,
        completed_at: new Date().toISOString()
      }).eq('id', job.id);

      results.completed.push(lang);
    } catch (err) {
      results.failed.push(lang);
      results.errors.push({ language: lang, error: err.message });
    }

    // Rate limit protection
    await new Promise(r => setTimeout(r, 1000));
  }

  // Build URLs
  const urls = {};
  results.completed.forEach(lang => {
    const prefix = lang === 'en' ? '' : `/${lang}`;
    urls[lang] = `${baseUrl}${prefix}/blog/${slug}`;
  });

  // Revalidate ISR paths
  try {
    revalidatePath('/blog');
    results.completed.forEach(lang => {
      const prefix = lang === 'en' ? '' : `/${lang}`;
      revalidatePath(`${prefix}/blog/${slug}`);
      revalidatePath(`${prefix}/blog`);
    });
  } catch (e) { /* ISR revalidation is best-effort */ }

  // Webhook callback
  if (body.webhook_url) {
    try {
      await fetch(body.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          slug,
          urls,
          translations: results,
          translation_complete: results.failed.length === 0,
        })
      });
    } catch (e) { /* Webhook failure is non-fatal */ }
  }

  return NextResponse.json({
    success: true,
    post_id: post.id,
    slug,
    urls,
    translations: {
      completed: results.completed,
      failed: results.failed,
      pending: []
    },
    translation_complete: results.failed.length === 0,
    errors: results.errors,
  }, { status: 201 });
}
```

### 5.8 Translation Function

```javascript
async function translateContent(title, content, targetLanguage, supabase) {
  // Get OpenAI key from app_config (matching existing pattern)
  const { data: config } = await supabase
    .from('app_config')
    .select('api_key')
    .eq('id', 'openai')
    .single();

  if (!config?.api_key) throw new Error('OpenAI API key not configured');

  const languageNames = {
    es: 'Spanish', fr: 'French', de: 'German',
    ar: 'Arabic', he: 'Hebrew', ru: 'Russian'
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.api_key}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the blog post title and content from English to ${languageNames[targetLanguage]}.

Rules:
- Preserve ALL Markdown formatting exactly
- Keep technical terms in English: eSIM, SIM, QR code, APN, LTE, 5G, iOS, Android, GB, MB
- Keep brand names in English: Simnetiq, Apple, Google, Samsung
- For RTL languages (Arabic, Hebrew): translate naturally, the app handles RTL rendering
- Return valid JSON with "title" and "content" keys
- Do not add any commentary or notes, just the translation`
        },
        {
          role: 'user',
          content: JSON.stringify({ title, content })
        }
      ],
      temperature: 0.3,
      max_tokens: 4096,
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenAI API error');

  const result = JSON.parse(data.choices[0].message.content);
  return {
    title: result.title,
    content: result.content,
    tokens_used: data.usage?.total_tokens || null
  };
}
```

---

## 6. n8n Workflow Design

### 6.1 Workflow: Automated Blog Pipeline

```
┌──────────────────┐
│  Trigger          │  Schedule (daily) OR Manual OR Webhook
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Content Source   │  Options:
│                   │  A) RSS feed parser (industry news)
│                   │  B) OpenAI topic generation
│                   │  C) Manual topic input
└────────┬─────────┘
         │
┌────────▼─────────┐
│  AI Writer        │  OpenAI GPT-4o
│                   │  - System prompt with brand voice
│                   │  - SEO keywords injection
│                   │  - Markdown output
│                   │  - 800-1500 words target
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Image Generator  │  Options:
│  (Optional)       │  A) DALL-E 3 for featured image
│                   │  B) Unsplash API
│                   │  C) Pre-uploaded from Supabase Storage
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Upload Image     │  POST to Supabase Storage
│  (if generated)   │  bucket: blog-images
│                   │  Returns public URL
└────────┬─────────┘
         │
┌────────▼─────────┐
│  Create Post      │  POST /api/blog/create
│                   │  {
│                   │    title, content, slug,
│                   │    featured_image, category, tags,
│                   │    auto_translate: true,
│                   │    webhook_url: "n8n-webhook-url"
│                   │  }
└────────┬─────────┘
         │
    (Async wait for webhook callback)
         │
┌────────▼─────────┐
│  Webhook Receiver │  Receives translation results
│                   │  Checks translation_complete
└────────┬─────────┘
         │
┌────────▼──────────────┐
│  Telegram Notification │  Send to @simnetiq channel
│                        │  - Post title + link
│                        │  - "New article published"
│                        │  - Include featured image
└────────────────────────┘
```

### 6.2 n8n Node Configuration

**Node 1: Schedule Trigger**
- Cron: `0 9 * * 1,3,5` (Mon/Wed/Fri at 9 AM)

**Node 2: OpenAI - Generate Topic**
```json
{
  "model": "gpt-4o",
  "prompt": "Generate a blog post topic for Simnetiq (eSIM platform for travelers). Focus on: eSIM travel tips, country-specific guides, comparison articles, how-to guides. Return JSON: {topic, title, keywords[], category}",
  "response_format": "json_object"
}
```

**Node 3: OpenAI - Write Article**
```json
{
  "model": "gpt-4o",
  "prompt": "Write a 1000-word SEO-optimized blog post in Markdown format about: {{$node.Generate_Topic.json.topic}}. Target keywords: {{$node.Generate_Topic.json.keywords}}. Include: introduction, 3-4 sections with H2 headings, practical tips, conclusion. Brand: Simnetiq. Tone: helpful, knowledgeable, traveler-friendly.",
  "max_tokens": 4096
}
```

**Node 4: HTTP Request - Create Post**
```json
{
  "method": "POST",
  "url": "https://www.simnetiq.store/api/blog/create",
  "headers": {
    "Authorization": "Bearer {{$env.SIMNETIQ_BLOG_API_KEY}}",
    "Content-Type": "application/json"
  },
  "body": {
    "title": "={{$node.Generate_Topic.json.title}}",
    "content": "={{$node.Write_Article.json.content}}",
    "category": "={{$node.Generate_Topic.json.category}}",
    "tags": "={{$node.Generate_Topic.json.keywords}}",
    "auto_translate": true,
    "author": "Simnetiq Bot",
    "webhook_url": "https://n8n.your-vps.com/webhook/blog-callback"
  }
}
```

**Node 5: Webhook - Receive Callback**
- Path: `/webhook/blog-callback`
- Method: POST
- Waits for the blog creation API to POST back results

**Node 6: Telegram - Notify**
```json
{
  "chatId": "-100XXXXXXXXXX",
  "text": "📝 New blog post published!\n\n*{{$node.Webhook.json.slug}}*\n\n🇺🇸 {{$node.Webhook.json.urls.en}}\n🇷🇺 {{$node.Webhook.json.urls.ru}}\n🇪🇸 {{$node.Webhook.json.urls.es}}\n\nTranslations: {{$node.Webhook.json.translations.completed.length}}/7",
  "parse_mode": "Markdown"
}
```

### 6.3 Error Handling in n8n

| Error | Recovery |
|-------|----------|
| OpenAI rate limit | Retry with 30s delay (n8n retry config) |
| Blog API 409 (slug exists) | Append timestamp to slug, retry |
| Blog API 500 | Alert via Telegram, pause workflow |
| Translation partial failure | Log failures, send alert, continue |
| Webhook timeout | Poll `/api/blog/status` after 5 minutes |

---

## 7. Migration Plan

### Phase 1: Database (Day 1)

1. Run migration SQL from Section 4.3 on Simnetiq Supabase
2. Drop `blog_post_translations_unique_slug` index (allows all translations to share `base_slug`)
3. Update `get_blog_post_by_slug` RPC to include `available_languages` in response
4. Commit all SQL as migration file: `packages/shared/supabase/migrations/004_blog_enhancements.sql`

**Risk: LOW** - Additive changes only, no existing data modified.

### Phase 2: API Layer (Day 2-3)

1. Create `packages/customer-app/app/api/blog/create/route.js`
2. Create `packages/customer-app/app/api/blog/translate/route.js`
3. Create `packages/customer-app/app/api/blog/status/route.js`
4. Create `packages/customer-app/app/api/blog/revalidate/route.js`
5. Add authentication to existing `app/api/translate-blog/route.js`
6. Add `BLOG_API_KEY` env var to Vercel
7. Test all endpoints with curl

**Risk: LOW** - New endpoints, no existing functionality affected.

### Phase 3: Routing Refactor (Day 4-5)

1. Create `app/[locale]/blog/page.jsx` (unified blog list)
2. Create `app/[locale]/blog/[slug]/page.jsx` (unified blog post)
3. Create `src/components/seo/BlogJsonLd.jsx` (server-rendered)
4. Refactor `BlogPost.jsx` into `BlogPostView.jsx` (receives props, no self-fetch)
5. Refactor `Blog.jsx` into `BlogList.jsx` (receives `initialPosts` prop)
6. Update middleware to handle locale detection for blog routes
7. Add `generateStaticParams` + `revalidate = 3600`
8. Test all 7 locale x blog routes
9. Delete 12 redundant locale-specific blog files
10. Rename `[id]` folder to `[slug]` for clarity

**Risk: MEDIUM** - Routing changes affect live pages. Test thoroughly in preview deploy before production.

### Phase 4: Sitemap & SEO Fix (Day 5)

1. Update `app/sitemap.js` to include multi-locale blog URLs with real translation data
2. Delete `public/robots.txt`
3. Verify hreflang only emits for existing translations
4. Test with Google Search Console URL Inspection

**Risk: LOW** - Sitemap is regenerated on every request.

### Phase 5: n8n Integration (Day 6-7)

1. Create n8n workflow on VPS (Germany #1: 72.61.87.54)
2. Configure `SIMNETIQ_BLOG_API_KEY` as n8n credential
3. Test with manual trigger
4. Enable scheduled trigger
5. Set up Telegram notification

**Risk: LOW** - Independent system, doesn't affect existing functionality.

### Phase 6: Cleanup (Day 7)

1. Remove dead code:
   - `formData.slug` reference in `BlogManagement.jsx:199`
   - Unused `checkSlugAvailability` debounce (references non-existent `formData.slug`)
2. Fix `BlogPostModal.jsx:87` slug generation to use `base_slug` consistently
3. Add `not-found.jsx` specific to blog routes (optional, nice-to-have)

---

## 8. Risk Analysis & Edge Cases

### 8.1 Critical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Routing refactor breaks existing indexed URLs | Google drops pages from index | Keep `/blog/*` as English fallback; add 301 redirects for any changed URLs; submit updated sitemap |
| Translation API exposes OpenAI key | Unlimited cost via unauthenticated endpoint | Add `BLOG_API_KEY` auth immediately (Phase 2 priority) |
| ISR cache serves stale content after edit | Users see old version | Call `/api/blog/revalidate` after every admin edit |
| `blog_post_translations_unique_slug` drop allows duplicate slugs | `getPostBySlug` returns wrong post | `base_slug` uniqueness on `blog_posts` table prevents this; translations share the slug |
| n8n generates low-quality content | Brand reputation damage | Add human review step (draft status) or quality threshold |

### 8.2 Edge Cases

| Case | Current Behavior | Target Behavior |
|------|-----------------|-----------------|
| Non-existent slug | HTTP 200 with error UI | HTTP 404 via `notFound()` |
| Slug with special chars | `slugify` strips them | Same, but add URL encoding for safety |
| Very long content (>50KB) | Works but slow | Add `read_time` calculation, lazy-load below fold |
| RTL language (ar, he) blog post | Works (CSS handles it) | Verify `dir="rtl"` on article element |
| Post with 0 translations | RPC returns nothing | `notFound()` in page component |
| Concurrent slug creation | Race condition possible | DB unique constraint catches it; return 409 |
| Translation fails mid-batch | Partial translations saved | Return partial success in response; allow retry via `/api/blog/translate` |
| Image upload >5MB | Client validates, rejects | Server also validates (defense in depth) |
| OpenAI rate limit during bulk translate | Translation fails silently | `translation_jobs` table logs failure; retry mechanism in n8n |
| Sitemap >50MB | Next.js handles splitting | Unlikely with <1000 posts; monitor |
| `app_config.openai` row missing | Translate silently fails | Throw explicit error: "OpenAI API key not configured in app_config" |

### 8.3 Performance Targets

| Metric | Current | Target |
|--------|---------|--------|
| Blog list LCP | ~3-4s (client fetch) | <1.5s (SSR) |
| Blog post LCP | ~2-3s (client fetch after SSR metadata) | <1.0s (full SSR + ISR) |
| Supabase calls per post view | 2 (metadata + client) | 1 (SSR only, cached by ISR) |
| Time to First Byte | ~500ms (force-dynamic) | <200ms (ISR cache hit) |
| Blog creation API latency | N/A | <2s (post only), <60s (with 6 translations) |

### 8.4 Agent Responsibilities

| Agent | Scope |
|-------|-------|
| **DB Agent** | Run migration SQL, verify RPC functions, monitor query performance |
| **SEO Agent** | Validate sitemap, test hreflang with Google Search Console, monitor indexing |
| **QA Agent** | Test all 7 locale x blog routes, verify 404 behavior, test edge cases |
| **Automation Agent** | Build n8n workflow, test webhook callback, configure Telegram notifications |
| **Security Agent** | Audit API authentication, verify RLS policies, check for exposed keys |

---

## Appendix A: File Inventory

### Files to CREATE

| File | Purpose |
|------|---------|
| `app/[locale]/blog/page.jsx` | Unified blog list route |
| `app/[locale]/blog/[slug]/page.jsx` | Unified blog post route |
| `app/api/blog/create/route.js` | Automation API - create |
| `app/api/blog/translate/route.js` | Automation API - translate |
| `app/api/blog/status/route.js` | Automation API - health |
| `app/api/blog/revalidate/route.js` | ISR revalidation trigger |
| `src/components/seo/BlogJsonLd.jsx` | Server-rendered structured data |
| `src/components/BlogList.jsx` | Refactored blog list (receives SSR data) |
| `src/components/BlogPostView.jsx` | Refactored post viewer (receives SSR data) |
| `packages/shared/supabase/migrations/004_blog_enhancements.sql` | Schema migration |

### Files to DELETE

| File | Reason |
|------|--------|
| `app/ar/blog/page.jsx` | Replaced by `[locale]` route |
| `app/ar/blog/[id]/page.jsx` | Replaced by `[locale]` route |
| `app/de/blog/page.jsx` | Replaced by `[locale]` route |
| `app/de/blog/[id]/page.jsx` | Replaced by `[locale]` route |
| `app/es/blog/page.jsx` | Replaced by `[locale]` route |
| `app/es/blog/[id]/page.jsx` | Replaced by `[locale]` route |
| `app/fr/blog/page.jsx` | Replaced by `[locale]` route |
| `app/fr/blog/[id]/page.jsx` | Replaced by `[locale]` route |
| `app/he/blog/page.jsx` | Replaced by `[locale]` route |
| `app/he/blog/[id]/page.jsx` | Replaced by `[locale]` route |
| `app/ru/blog/page.jsx` | Replaced by `[locale]` route |
| `app/ru/blog/[id]/page.jsx` | Replaced by `[locale]` route |
| `public/robots.txt` | Stale, wrong domain |

### Files to MODIFY

| File | Changes |
|------|---------|
| `middleware.js` | Add blog route locale detection |
| `app/sitemap.js` | Multi-locale blog URLs with real translations |
| `app/blog/page.jsx` | Simplify to English-only or redirect to `/en/blog` |
| `app/blog/[id]/page.jsx` | Simplify to English-only or redirect |
| `src/components/Blog.jsx` → `BlogList.jsx` | Accept `initialPosts` prop, remove self-fetch |
| `src/components/BlogPost.jsx` → `BlogPostView.jsx` | Accept `post` prop, remove self-fetch |
| `app/api/translate-blog/route.js` | Add authentication |
| `packages/shared/services/blogServiceSupabase.js` | Minor updates for new fields |
| `packages/admin-app/src/components/BlogPostModal.jsx` | Fix slug generation (line 87) |
| `packages/admin-app/src/components/BlogManagement.jsx` | Fix dead code (line 199) |

---

## Appendix B: Environment Variables Required

| Variable | Where | Value |
|----------|-------|-------|
| `BLOG_API_KEY` | Vercel (customer-app) | `simnetiq-blog-{64-hex}` |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (customer-app) | Already exists |
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel (customer-app) | Already exists |
| `NEXT_PUBLIC_BASE_URL` | Vercel (customer-app) | `https://www.simnetiq.store` |

n8n credential:
| Variable | Where | Value |
|----------|-------|-------|
| `SIMNETIQ_BLOG_API_KEY` | n8n (VPS Germany #1) | Same as `BLOG_API_KEY` |
