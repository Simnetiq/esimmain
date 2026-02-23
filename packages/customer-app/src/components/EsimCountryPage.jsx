'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { getSupabase } from '@esim/shared/lib/supabase';
import { transformPlanToViewModel, fetchRegionalPlans } from '@esim/shared/services/plansServiceSupabase';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import ExploreStoreCTA from './cta/ExploreStoreCTA';
import PlatformDownloadCTA from './cta/PlatformDownloadCTA';

const formatDataAmount = (mb) => {
  if (!mb || mb <= 0) return null;
  if (mb >= 1024) {
    const gb = mb / 1024;
    return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }
  return `${mb} MB`;
};

const PlanCard = ({ plan, t, isRTL, onClick }) => {
  const dataAmount = plan.isUnlimited
    ? t('plans.unlimited', 'Unlimited')
    : (plan.dataAmountMb ? formatDataAmount(plan.dataAmountMb) : plan.data) || t('plans.data', 'Data');

  const validity = plan.validity
    ? `${plan.validity} ${t('plans.days', 'Days')}`
    : '';

  const voiceMinutes = parseInt(plan.voice || plan.calls || '0', 10);
  const hasVoice = plan.hasVoice && voiceMinutes > 0;
  const smsCount = parseInt(plan.sms || '0', 10);
  const hasSms = plan.hasSms && smsCount > 0;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group h-full flex flex-col justify-between relative overflow-hidden"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className={`absolute top-0 w-16 h-16 bg-tufts-blue/5 transition-transform group-hover:scale-110 ${isRTL ? 'left-0 rounded-br-full -ml-8 -mt-8' : 'right-0 rounded-bl-full -mr-8 -mt-8'}`} />

      <div>
        {/* Operator info */}
        {(plan.operatorLogo || plan.operatorName) && (
          <div className="flex items-center gap-2 mb-2">
            {plan.operatorLogo && (
              <div className="relative w-6 h-6 flex-shrink-0">
                <Image
                  src={plan.operatorLogo}
                  alt={plan.operatorName || ''}
                  fill
                  className="rounded object-contain"
                  sizes="24px"
                />
              </div>
            )}
            {plan.operatorName && (
              <span className="text-xs text-gray-500 truncate">{plan.operatorName}</span>
            )}
          </div>
        )}

        <h3 className="font-bold text-lg text-eerie-black mb-2 text-left">
          {validity ? (isRTL ? `${validity} - ${dataAmount}` : `${dataAmount} - ${validity}`) : dataAmount}
        </h3>

        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          {plan.isFeatured && (
            <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {t('plans.featured', 'Featured')}
            </span>
          )}
          {!plan.isFeatured && plan.isBestValue && (
            <span className="inline-flex items-center bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {t('plans.bestValue', 'Best Value')}
            </span>
          )}
          {hasVoice && (
            <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              {voiceMinutes} {t('plans.mins', 'mins')}
            </span>
          )}
          {hasSms && (
            <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {smsCount} SMS
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-bold text-eerie-black text-lg">
          ${plan.price}
        </span>
        <div className={`w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-tufts-blue group-hover:text-white transition-colors ${isRTL ? 'rotate-180' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default function EsimCountryPage() {
  const params = useParams();
  const router = useRouter();
  const { t, locale } = useI18n();
  const countrySlug = params.country;

  const currentLanguage = locale || 'en';
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  const [country, setCountry] = useState(null);
  const [countryName, setCountryName] = useState('');
  const [plans, setPlans] = useState([]);
  const [regionalPlans, setRegionalPlans] = useState([]);
  const [regionName, setRegionName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadCountry() {
      const supabase = getSupabase();
      if (!supabase) return;

      // Fetch country with translations
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

      if (!countryData) {
        const plansUrl = (currentLanguage === 'en' || !currentLanguage)
          ? '/esim-plans'
          : `/${currentLanguage}/esim-plans`;
        router.push(plansUrl);
        return;
      }

      setCountry(countryData);

      // Get localized country name from translations
      const translations = {};
      if (countryData.country_translations) {
        countryData.country_translations.forEach(tr => {
          translations[tr.language_code] = tr.name;
        });
      }
      setCountryName(translations[currentLanguage] || countryData.name);

      // Fetch plans for this country
      const { data: plansData } = await supabase
        .from('dataplans')
        .select('*')
        .eq('country_iso', countryData.iso_code)
        .eq('status', 'active')
        .eq('is_enabled', true)
        .order('price', { ascending: true });

      setPlans((plansData || []).map(transformPlanToViewModel));

      // Fetch regional plans if country belongs to a region
      if (countryData.region_id) {
        setRegionName(countryData.region_id);
        try {
          const regPlans = await fetchRegionalPlans(countryData.region_id);
          setRegionalPlans(regPlans);
        } catch (err) {
          console.error('Error fetching regional plans:', err);
        }
      }

      setLoading(false);
    }
    loadCountry();
  }, [countrySlug, router, currentLanguage]);

  const handlePlanClick = (plan) => {
    if (typeof trackCustomFacebookEvent === 'function') {
      trackCustomFacebookEvent('ViewContent', {
        content_name: plan.planName || plan.package,
        content_ids: [plan.id],
        content_type: 'product',
        value: plan.price,
        currency: 'USD'
      });
    }

    const planUrl = (currentLanguage === 'en' || !currentLanguage)
      ? `/share-package/${plan.id}?country=${countrySlug}`
      : `/${currentLanguage}/share-package/${plan.id}?country=${countrySlug}`;

    router.push(planUrl);
  };

  if (loading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-tufts-blue" />
      </div>
    );
  }

  if (!country) return null;

  const plansPageUrl = (currentLanguage === 'en' || !currentLanguage)
    ? '/esim-plans'
    : `/${currentLanguage}/esim-plans`;

  return (
    <div className="bg-white min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 lg:mt-20 pb-8 sm:pb-12">
        <div className="flex items-center gap-4 mb-4">
          {country.image_url && (
            <div className="relative w-16 h-12 rounded-lg overflow-hidden shadow-md flex-shrink-0">
              <Image
                src={country.image_url}
                alt={countryName}
                fill
                className="object-cover"
                sizes="64px"
              />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl tracking-tight font-semibold text-eerie-black">
              {t('countryPage.title', 'eSIM for {{country}}').replace('{{country}}', countryName)}
            </h1>
            <p className="text-gray-500 mt-1">
              {t('countryPage.subtitle', 'Stay connected with instant eSIM data plans')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 text-sm">
          <div className="border border-gray-100 rounded-lg px-4 py-2.5 bg-gray-50/50">
            <span className="text-gray-500 text-xs uppercase tracking-wider font-medium block">
              {t('countryPage.plansAvailable', 'Plans available')}
            </span>
            <span className="block font-semibold text-lg text-eerie-black">{plans.length}</span>
          </div>
          {country.min_price && (
            <div className="border border-gray-100 rounded-lg px-4 py-2.5 bg-gray-50/50">
              <span className="text-gray-500 text-xs uppercase tracking-wider font-medium block">
                {t('countryPage.startingFrom', 'Starting from')}
              </span>
              <span className="block font-semibold text-lg text-eerie-black">${country.min_price} USD</span>
            </div>
          )}
          <div className="border border-gray-100 rounded-lg px-4 py-2.5 bg-gray-50/50">
            <span className="text-gray-500 text-xs uppercase tracking-wider font-medium block">
              {t('countryPage.activation', 'Activation')}
            </span>
            <span className="block font-semibold text-lg text-eerie-black">
              {t('countryPage.instant', 'Instant')}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full h-px bg-gray-100" />

      {/* Plans Section */}
      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h2 className="text-xl sm:text-2xl font-bold text-eerie-black mb-6">
          {t('countryPage.dataPlans', '{{country}} eSIM Data Plans').replace('{{country}}', countryName)}
        </h2>

        {plans.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">
              {t('countryPage.noPlans', 'No plans available for {{country}} at the moment.').replace('{{country}}', countryName)}
            </p>
            <a href={plansPageUrl} className="text-tufts-blue hover:underline mt-2 inline-block">
              {t('countryPage.browseAll', 'Browse all destinations')} &rarr;
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                t={t}
                isRTL={isRTL}
                onClick={() => handlePlanClick(plan)}
              />
            ))}
          </div>
        )}

        {/* Regional Plans */}
        {regionalPlans.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl sm:text-2xl font-bold text-eerie-black mb-6">
              {t('countryPage.regionalPlans', '{{region}} Regional Plans').replace(
                '{{region}}',
                t(`regions.${regionName}`, regionName.charAt(0).toUpperCase() + regionName.slice(1))
              )}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {regionalPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  t={t}
                  isRTL={isRTL}
                  onClick={() => handlePlanClick(plan)}
                />
              ))}
            </div>
          </div>
        )}

        {/* SEO content */}
        <div className="mt-12 prose prose-gray max-w-none">
          <h2>
            {t('countryPage.aboutTitle', 'About eSIM for {{country}}').replace('{{country}}', countryName)}
          </h2>
          <p>
            {t(
              'countryPage.aboutDescription',
              'Get instant mobile data in {{country}} with a Simnetiq eSIM. No physical SIM card needed — just scan, activate, and connect. Our {{country}} eSIM plans work with all eSIM-compatible devices including iPhone, Samsung Galaxy, Google Pixel, and more.'
            ).replace(/\{\{country\}\}/g, countryName)}
          </p>
          <h3>
            {t('countryPage.whyChooseTitle', 'Why choose Simnetiq for {{country}}?').replace('{{country}}', countryName)}
          </h3>
          <ul>
            <li>{t('countryPage.benefit1', 'Instant activation — no waiting, no shipping')}</li>
            <li>
              {t('countryPage.benefit2', 'Plans starting from ${{price}} USD').replace('{{price}}', country.min_price || plans[0]?.price || '5')}
            </li>
            <li>{t('countryPage.benefit3', 'No roaming charges or surprise fees')}</li>
            <li>{t('countryPage.benefit4', 'Keep your main number active while using data abroad')}</li>
            <li>{t('countryPage.benefit5', '24/7 customer support')}</li>
          </ul>
        </div>

        {/* CTAs */}
        <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <ExploreStoreCTA
            variant="primary"
            size="md"
            source="country_page_cta"
          />
          <PlatformDownloadCTA
            variant="secondary"
            size="md"
            source="country_page_download"
          />
        </div>
      </div>
    </div>
  );
}
