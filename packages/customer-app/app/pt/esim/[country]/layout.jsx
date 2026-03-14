import { createClient } from '@supabase/supabase-js';

const LOCALE = 'pt';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function generateMetadata({ params }) {
  const { country: countrySlug } = params;
  const supabase = getSupabase();

  if (!supabase) {
    return { title: 'eSIM Plans | Simnetiq' };
  }

  const { data: country } = await supabase
    .from('countries')
    .select('name, slug, min_price, plan_count, image_url')
    .eq('slug', countrySlug)
    .eq('is_active', true)
    .single();

  if (!country) {
    return { title: 'eSIM Plans | Simnetiq' };
  }

  const title = `eSIM for ${country.name} — From $${country.min_price || '5'} | Simnetiq`;
  const description = `Buy eSIM data plans for ${country.name}. ${country.plan_count || 'Multiple'} plans available from $${country.min_price || '5'}. Instant activation, no roaming charges. Stay connected with Simnetiq.`;
  const base = 'https://www.simnetiq.store';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${base}/${LOCALE}/esim/${country.slug}`,
      siteName: 'Simnetiq',
      images: country.image_url ? [{ url: country.image_url, width: 600, height: 400 }] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `${base}/${LOCALE}/esim/${country.slug}`,
      languages: {
        'x-default': `${base}/esim/${country.slug}`,
        'en': `${base}/esim/${country.slug}`,
        'ar': `${base}/ar/esim/${country.slug}`,
        'de': `${base}/de/esim/${country.slug}`,
        'es': `${base}/es/esim/${country.slug}`,
        'fr': `${base}/fr/esim/${country.slug}`,
        'he': `${base}/he/esim/${country.slug}`,
        'hi': `${base}/hi/esim/${country.slug}`,
        'ja': `${base}/ja/esim/${country.slug}`,
        'pl': `${base}/pl/esim/${country.slug}`,
        'pt': `${base}/pt/esim/${country.slug}`,
        'ru': `${base}/ru/esim/${country.slug}`,
        'uk': `${base}/uk/esim/${country.slug}`,
        'zh': `${base}/zh/esim/${country.slug}`,
      },
    },
  };
}

export default function CountryLayout({ children }) {
  return children;
}
