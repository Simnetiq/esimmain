import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
  const languages = ['en', 'es', 'fr', 'de', 'ar', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'uk', 'zh', 'vi', 'id', 'sv', 'cs', 'el', 'ro', 'da', 'fi', 'nb'];
  const now = new Date().toISOString();

  // Helper: generate a single sitemap entry with hreflang alternates for all 18 languages.
  // This is the correct approach — one entry per path with hreflang pointing to all locale variants.
  function withAlternates(path, lastmod, changefreq, priority) {
    const alternates = {
      'x-default': `${baseUrl}${path}`,
    };
    languages.forEach(lang => {
      alternates[lang] = lang === 'en'
        ? `${baseUrl}${path}`
        : `${baseUrl}/${lang}${path}`;
    });

    return {
      url: `${baseUrl}${path}`,
      lastModified: lastmod || now,
      changeFrequency: changefreq,
      priority: priority,
      alternates: { languages: alternates },
    };
  }

  // --- Static pages (each with all 18 hreflang alternates) ---
  const staticPages = [
    withAlternates('', now, 'daily', 1.0),
    withAlternates('/esim-plans', now, 'daily', 0.9),
    withAlternates('/blog', now, 'daily', 0.9),
    withAlternates('/contact', now, 'monthly', 0.7),
    withAlternates('/about', now, 'monthly', 0.7),
    withAlternates('/affiliate-program', now, 'monthly', 0.8),
    withAlternates('/jobs', now, 'weekly', 0.6),
    withAlternates('/login', now, 'monthly', 0.4),
    withAlternates('/privacy-policy', now, 'yearly', 0.3),
    withAlternates('/terms-of-service', now, 'yearly', 0.3),
    withAlternates('/cookie-policy', now, 'yearly', 0.3),
    withAlternates('/return-policy', now, 'yearly', 0.3),
  ];

  // --- Dynamic pages from Supabase ---
  const dynamicPages = [];
  const supabase = getSupabase();

  if (supabase) {
    // --- Country eSIM pages ---
    try {
      const { data: countries } = await supabase
        .from('countries')
        .select('slug, name, updated_at')
        .eq('is_active', true)
        .gt('plan_count', 0)
        .order('name');

      if (countries) {
        for (const country of countries) {
          dynamicPages.push(withAlternates(`/esim/${country.slug}`, country.updated_at || now, 'weekly', 0.8));
        }
      }
    } catch (e) {
      console.error('Sitemap: failed to fetch countries', e);
    }

    // --- Blog posts with translation-aware hreflangs ---
    try {
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('base_slug, updated_at, published_at, blog_post_translations(language)')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (posts) {
        for (const post of posts) {
          const lastmod = post.updated_at || post.published_at || now;
          const slug = post.base_slug;
          const availableLangs = (post.blog_post_translations || []).map(t => t.language);

          const blogAlternates = {};
          availableLangs.forEach(lang => {
            blogAlternates[lang] = lang === 'en'
              ? `${baseUrl}/blog/${slug}`
              : `${baseUrl}/${lang}/blog/${slug}`;
          });

          dynamicPages.push({
            url: `${baseUrl}/blog/${slug}`,
            lastModified: lastmod,
            changeFrequency: 'weekly',
            priority: 0.7,
            alternates: { languages: blogAlternates },
          });
        }
      }
    } catch (e) {
      // blog_posts table may not exist
    }

    // --- Region pages ---
    try {
      const { data: regions } = await supabase
        .from('regions')
        .select('slug, updated_at')
        .eq('is_active', true);

      if (regions) {
        for (const region of regions) {
          dynamicPages.push(withAlternates(`/esim/${region.slug}`, region.updated_at || now, 'weekly', 0.75));
        }
      }
    } catch (e) {
      // regions table may not exist
    }
  }

  return [
    ...staticPages,
    ...dynamicPages,
  ];
}
