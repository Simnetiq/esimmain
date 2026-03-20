import { getSupabaseServer } from './supabaseServer';
import { transformPlanToViewModel } from '@esim/shared/services/plansServiceSupabase';

const BASE = 'https://www.simnetiq.store';

/**
 * Fetch all data needed for a country eSIM page (server-side).
 * Returns country info, plans, regional plans, and related countries.
 *
 * @param {string} countrySlug - URL slug (e.g. 'turkey')
 * @param {string} locale - Language code (e.g. 'en', 'de')
 * @returns {Promise<{country, countryName, plans, regionalPlans, regionName, relatedCountries} | null>}
 */
export async function fetchCountryPageData(countrySlug, locale = 'en') {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  // 1. Fetch country with translations
  const { data: countryData } = await supabase
    .from('countries')
    .select(`
      *,
      country_translations (
        language_code,
        name,
        description
      )
    `)
    .eq('slug', countrySlug)
    .eq('is_active', true)
    .single();

  if (!countryData) return null;

  // Resolve translated name, then strip translations from the payload
  const translation = (countryData.country_translations || [])
    .find(t => t.language_code === locale);
  const countryName = translation?.name || countryData.name;

  // Remove translations array — already resolved, no need to send to client
  const { country_translations, ...countryClean } = countryData;

  // 2. Fetch local plans for this country
  const { data: plansData } = await supabase
    .from('dataplans')
    .select('*')
    .eq('country_iso', countryData.iso_code)
    .eq('status', 'active')
    .eq('is_enabled', true)
    .neq('package_type', 'topup')
    .order('price', { ascending: true });

  const plans = (plansData || []).map(transformPlanToViewModel);

  // 3. Fetch regional/global plans covering this country
  let regionalPlans = [];
  let regionName = '';
  try {
    const { data: regData } = await supabase
      .from('dataplans')
      .select('*')
      .contains('covered_countries', [countryData.iso_code])
      .eq('status', 'active')
      .eq('is_enabled', true)
      .neq('package_type', 'topup')
      .order('price', { ascending: true });

    if (regData && regData.length > 0) {
      regionalPlans = regData.map(transformPlanToViewModel);
      regionName = countryData.region_id || regData[0].region_id || 'global';
    }
  } catch (err) {
    console.error('Error fetching regional plans:', err);
  }

  // 4. Fetch related countries from the same region
  let relatedCountries = [];
  if (countryData.region_id) {
    try {
      const { data: related } = await supabase
        .from('countries')
        .select('name, slug, image_url, min_price, iso_code, country_translations(language_code, name)')
        .eq('region_id', countryData.region_id)
        .eq('is_active', true)
        .neq('slug', countrySlug)
        .order('plan_count', { ascending: false })
        .limit(6);

      relatedCountries = (related || []).map(c => {
        const tr = (c.country_translations || []).find(t => t.language_code === locale);
        return {
          name: tr?.name || c.name,
          slug: c.slug,
          imageUrl: c.image_url,
          minPrice: c.min_price,
          isoCode: c.iso_code,
        };
      });
    } catch (err) {
      console.error('Error fetching related countries:', err);
    }
  }

  return {
    country: countryClean,
    countryName,
    plans,
    regionalPlans,
    regionName,
    relatedCountries,
  };
}

/**
 * Generate Product + BreadcrumbList JSON-LD for a country page.
 * @param {Object} params
 * @param {string} params.countryName
 * @param {string} params.countrySlug
 * @param {Array} params.plans
 * @param {string} params.locale
 * @param {string} [params.imageUrl]
 * @returns {Array<Object>} Array of JSON-LD objects
 */
export function generateCountryJsonLd({ countryName, countrySlug, plans, locale, imageUrl }) {
  const canonicalPath = locale === 'en'
    ? `/esim/${countrySlug}`
    : `/${locale}/esim/${countrySlug}`;
  const url = `${BASE}${canonicalPath}`;

  const jsonLd = [];

  // BreadcrumbList
  const plansPath = locale === 'en' ? '/esim-plans' : `/${locale}/esim-plans`;
  jsonLd.push({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: BASE,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'eSIM Plans',
        item: `${BASE}${plansPath}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: countryName,
        item: url,
      },
    ],
  });

  // Product/Offer structured data from actual plan prices
  if (plans.length > 0) {
    const prices = plans.map(p => p.price).filter(Boolean).sort((a, b) => a - b);
    const lowPrice = prices[0];
    const highPrice = prices[prices.length - 1];

    jsonLd.push({
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: `eSIM for ${countryName}`,
      description: `Instant eSIM data plans for ${countryName}. ${plans.length} plans available.`,
      brand: {
        '@type': 'Brand',
        name: 'Simnetiq',
      },
      ...(imageUrl ? { image: imageUrl } : {}),
      url,
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'USD',
        lowPrice: String(lowPrice),
        highPrice: String(highPrice),
        offerCount: plans.length,
        availability: 'https://schema.org/InStock',
      },
    });
  }

  return jsonLd;
}

/**
 * Fetch all active country slugs for generateStaticParams.
 * @returns {Promise<Array<{country: string}>>}
 */
export async function fetchAllCountrySlugs() {
  const supabase = getSupabaseServer();
  if (!supabase) return [];

  const { data } = await supabase
    .from('countries')
    .select('slug')
    .eq('is_active', true);

  return (data || []).map(c => ({ country: c.slug }));
}
