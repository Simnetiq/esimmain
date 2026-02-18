import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
  const languages = ['en', 'es', 'fr', 'de', 'ar', 'he', 'ru'];
  const now = new Date().toISOString();

  // Helper: generate hreflang alternates for a path
  function withAlternates(path, lastmod, changefreq, priority) {
    const alternates = {};
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

  // --- Static pages ---
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

  // --- Localized static pages (non-English) ---
  const localizedPages = [];
  const mainPaths = ['', '/esim-plans', '/blog', '/contact', '/about', '/affiliate-program', '/jobs'];
  const legalPaths = ['/privacy-policy', '/terms-of-service', '/cookie-policy', '/return-policy'];

  languages.forEach(lang => {
    if (lang === 'en') return;
    mainPaths.forEach(path => {
      const priority = path === '' ? 0.9 : path === '/esim-plans' ? 0.85 : path === '/blog' ? 0.8 : 0.6;
      const freq = ['', '/esim-plans', '/blog'].includes(path) ? 'daily' : 'weekly';
      localizedPages.push({
        url: `${baseUrl}/${lang}${path}`,
        lastModified: now,
        changeFrequency: freq,
        priority,
      });
    });
    legalPaths.forEach(path => {
      localizedPages.push({
        url: `${baseUrl}/${lang}${path}`,
        lastModified: now,
        changeFrequency: 'yearly',
        priority: 0.3,
      });
    });
    localizedPages.push({
      url: `${baseUrl}/${lang}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    });
  });

  // --- Country eSIM pages from Supabase ---
  const countryPages = [];
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data: countries } = await supabase
        .from('countries')
        .select('slug, name, updated_at')
        .eq('is_active', true)
        .gt('plan_count', 0)
        .order('name');

      if (countries) {
        for (const country of countries) {
          const lastmod = country.updated_at || now;
          // English: /esim/germany, other langs: /fr/esim/germany
          countryPages.push(withAlternates(`/esim/${country.slug}`, lastmod, 'weekly', 0.8));

          // Also add localized versions
          languages.forEach(lang => {
            if (lang === 'en') return;
            countryPages.push({
              url: `${baseUrl}/${lang}/esim/${country.slug}`,
              lastModified: lastmod,
              changeFrequency: 'weekly',
              priority: 0.75,
            });
          });
        }
      }
    } catch (e) {
      console.error('Sitemap: failed to fetch countries', e);
    }

    // --- Blog posts from Supabase (if migrated) or skip ---
    // Check if blog_posts table exists in this Supabase
    try {
      const { data: posts } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (posts) {
        for (const post of posts) {
          const lastmod = post.updated_at || post.published_at || now;
          countryPages.push({
            url: `${baseUrl}/blog/${post.slug}`,
            lastModified: lastmod,
            changeFrequency: 'weekly',
            priority: 0.7,
          });
        }
      }
    } catch (e) {
      // blog_posts table may not exist in this Supabase - that's OK
    }
  }

  // --- Regions pages ---
  if (supabase) {
    try {
      const { data: regions } = await supabase
        .from('regions')
        .select('slug, updated_at')
        .eq('is_active', true);

      if (regions) {
        for (const region of regions) {
          countryPages.push(withAlternates(`/esim/${region.slug}`, region.updated_at || now, 'weekly', 0.75));
        }
      }
    } catch (e) {
      // regions table may not exist
    }
  }

  return [
    ...staticPages,
    ...localizedPages,
    ...countryPages,
  ];
}
