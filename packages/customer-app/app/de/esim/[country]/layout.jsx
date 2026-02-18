import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function generateMetadata({ params }) {
  const { country: countrySlug } = await params;
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.simnetiq.store/esim/${country.slug}`,
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
      canonical: `https://www.simnetiq.store/esim/${country.slug}`,
      languages: {
        'en': `https://www.simnetiq.store/esim/${country.slug}`,
        'es': `https://www.simnetiq.store/es/esim/${country.slug}`,
        'fr': `https://www.simnetiq.store/fr/esim/${country.slug}`,
        'de': `https://www.simnetiq.store/de/esim/${country.slug}`,
        'ru': `https://www.simnetiq.store/ru/esim/${country.slug}`,
        'ar': `https://www.simnetiq.store/ar/esim/${country.slug}`,
        'he': `https://www.simnetiq.store/he/esim/${country.slug}`,
      },
    },
  };
}

export default function CountryLayout({ children }) {
  return children;
}
