'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { getSupabase } from '@esim/shared/lib/supabase';
import { transformPlanToViewModel } from '@esim/shared/services/plansServiceSupabase';
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

/* ── Plan Card — matches FlexiblePlanCard from EsimPlans ───────────────── */
const PlanCard = ({ plan, t, isRTL, onClick, variant }) => {
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
      className={`bg-[var(--card-bg)] p-4 hover:border-[rgba(73,117,212,0.3)] border transition-all duration-500 cursor-pointer group h-full flex flex-col justify-between relative overflow-hidden ${variant === 'regional' ? 'border-[rgba(73,117,212,0.25)]' : 'border-[var(--card-border)]'}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Price watermark */}
      <span
        className="absolute top-3 end-3 text-[3rem] sm:text-[3.5rem] font-semibold leading-none text-text-muted select-none pointer-events-none"
        aria-hidden="true"
      >
        ${plan.price}
      </span>

      <div>
        {/* Operator */}
        {(plan.operatorLogo || plan.operatorName) && (
          <div className="flex items-center gap-2 mb-2 rtl-native-flex">
            {plan.operatorLogo && (
              <div className="relative w-5 h-5 flex-shrink-0">
                <Image
                  src={plan.operatorLogo}
                  alt={plan.operatorName || ''}
                  fill
                  className="rounded object-contain"
                  sizes="20px"
                />
              </div>
            )}
            {plan.operatorName && (
              <span className="text-xs text-text-muted truncate">{plan.operatorName}</span>
            )}
          </div>
        )}

        <h4 className="font-semibold text-lg text-text-primary text-start">
          {dataAmount}
        </h4>
        {validity && (
          <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mt-1 mb-3 text-start">
            {validity}
          </p>
        )}

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2 rtl-native-flex">
          {plan.isFeatured && (
            <span className="inline-flex items-center gap-0.5 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
              {t('plans.featured', 'Featured')}
            </span>
          )}
          {!plan.isFeatured && plan.isBestValue && (
            <span className="inline-flex items-center text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              {t('plans.bestValue', 'Best Value')}
            </span>
          )}
          {hasVoice && (
            <span className="inline-flex items-center gap-1 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              {voiceMinutes} {t('plans.mins', 'mins')}
            </span>
          )}
          {hasSms && (
            <span className="inline-flex items-center gap-1 text-purple-700 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(168, 85, 247, 0.1)' }}>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              {smsCount} SMS
            </span>
          )}
        </div>
      </div>

      {/* Bottom row — arrow */}
      <div className="flex items-center justify-between rtl-native-flex">
        <span />
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-eerie-black group-hover:text-white transition-colors duration-300 rtl:rotate-180" style={{ backgroundColor: 'var(--hover-bg)' }}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

/* ── Main Component ────────────────────────────────────────────────────── */
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

      const translations = {};
      if (countryData.country_translations) {
        countryData.country_translations.forEach(tr => {
          translations[tr.language_code] = tr.name;
        });
      }
      setCountryName(translations[currentLanguage] || countryData.name);

      const { data: plansData } = await supabase
        .from('dataplans')
        .select('*')
        .eq('country_iso', countryData.iso_code)
        .eq('status', 'active')
        .eq('is_enabled', true)
        .neq('package_type', 'topup')
        .order('price', { ascending: true });

      setPlans((plansData || []).map(transformPlanToViewModel));

      // Fetch regional/global plans that cover this country
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
          setRegionalPlans(regData.map(transformPlanToViewModel));
          // Use region_id from country or first plan's region_id for the section title
          setRegionName(countryData.region_id || regData[0].region_id || 'global');
        }
      } catch (err) {
        console.error('Error fetching regional plans:', err);
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
      <div className="bg-[var(--bg-primary)] min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-tufts-blue" />
      </div>
    );
  }

  if (!country) return null;

  const plansPageUrl = (currentLanguage === 'en' || !currentLanguage)
    ? '/esim-plans'
    : `/${currentLanguage}/esim-plans`;

  const localizedRegionName = t(`regions.${regionName}`, regionName.charAt(0).toUpperCase() + regionName.slice(1));

  return (
    <div className="bg-[var(--bg-primary)] min-h-screen" dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Header — matches EsimPlans page header ────────────────────── */}
      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8 sm:mt-12 lg:mt-20 pb-6 sm:pb-8">
        {/* Tagline */}
        <p className="font-mono text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted text-start">
          {t('countryPage.tagline', 'eSIM Data Plans')}
        </p>

        {/* Country name + flag */}
        <div className="flex items-center gap-4 sm:gap-5 my-3 sm:my-4 rtl-native-flex">
          {country.image_url && (
            <div className="relative w-16 h-12 sm:w-24 sm:h-16 overflow-hidden flex-shrink-0 border border-[var(--card-border)] shadow-sm">
              <Image
                src={country.image_url}
                alt={countryName}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 64px, 96px"
                priority
              />
            </div>
          )}
          <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black text-start">
            {t('countryPage.title', 'eSIM for {{country}}').replace('{{country}}', countryName)}
          </h1>
        </div>

        <p className="text-text-muted text-sm sm:text-base text-start max-w-2xl">
          {t('countryPage.subtitle', 'Stay connected with instant eSIM data plans')}
        </p>

        {/* Stat chips — inline pills like RegionTabs */}
        <div className="flex flex-wrap gap-2 mt-5 rtl-native-flex">
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm" style={{ backgroundColor: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)' }}>
            <span className="text-text-muted">{t('countryPage.plansAvailable', 'Plans available')}</span>
            <span className="font-semibold text-text-primary">{plans.length}</span>
          </div>
          {country.min_price && (
            <div className="inline-flex items-center gap-2 px-4 py-2 text-sm" style={{ backgroundColor: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)' }}>
              <span className="text-text-muted">{t('countryPage.startingFrom', 'Starting from')}</span>
              <span className="font-semibold text-text-primary">${country.min_price}</span>
            </div>
          )}
          <div className="inline-flex items-center gap-2 px-4 py-2 text-sm" style={{ backgroundColor: 'var(--subtle-bg)', border: '1px solid var(--subtle-border)' }}>
            <span className="text-text-muted">{t('countryPage.activation', 'Activation')}</span>
            <span className="font-semibold text-tufts-blue">{t('countryPage.instant', 'Instant')}</span>
          </div>
        </div>

        {/* Separator */}
        <div className="w-full h-px mt-6 sm:mt-8" style={{ backgroundColor: 'var(--divider)' }} />
      </div>

      {/* ── Plans Grid ────────────────────────────────────────────────── */}
      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12">
        <h2 className="text-lg sm:text-xl font-semibold text-eerie-black mb-6 text-start">
          {t('countryPage.dataPlans', '{{country}} eSIM Data Plans').replace('{{country}}', countryName)}
        </h2>

        {plans.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <p className="text-lg">
              {t('countryPage.noPlans', 'No plans available for {{country}} at the moment.').replace('{{country}}', countryName)}
            </p>
            <a href={plansPageUrl} className="text-tufts-blue hover:underline mt-3 inline-block font-medium">
              {t('countryPage.browseAll', 'Browse all destinations')}
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <h2 className="text-lg sm:text-xl font-semibold text-eerie-black mb-6 text-start">
              {t('countryPage.regionalPlans', '{{region}} Regional Plans').replace('{{region}}', localizedRegionName)}
              {' '}
              <span className="text-text-muted font-normal text-sm sm:text-base">
                ({t('countryPage.coversCountry', 'covers {{country}}').replace('{{country}}', countryName)})
              </span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regionalPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  t={t}
                  isRTL={isRTL}
                  variant="regional"
                  onClick={() => handlePlanClick(plan)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="w-full h-px" style={{ backgroundColor: 'var(--divider)' }} />

      {/* ── Info Section (SEO) ────────────────────────────────────────── */}
      <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="max-w-3xl">
          <h2 className="text-lg sm:text-xl font-semibold text-eerie-black mb-4 text-start">
            {t('countryPage.aboutTitle', 'About eSIM for {{country}}').replace('{{country}}', countryName)}
          </h2>
          <p className="text-text-muted leading-relaxed mb-8 text-start text-sm sm:text-base">
            {t(
              'countryPage.aboutDescription',
              'Get instant mobile data in {{country}} with a Simnetiq eSIM. No physical SIM card needed — just scan, activate, and connect. Our {{country}} eSIM plans work with all eSIM-compatible devices including iPhone, Samsung Galaxy, Google Pixel, and more.'
            ).replace(/\{\{country\}\}/g, countryName)}
          </p>

          <h3 className="text-base sm:text-lg font-semibold text-eerie-black mb-4 text-start">
            {t('countryPage.whyChooseTitle', 'Why choose Simnetiq for {{country}}?').replace('{{country}}', countryName)}
          </h3>
          <ul className="space-y-2.5 mb-10 text-text-muted text-sm sm:text-base">
            {[
              t('countryPage.benefit1', 'Instant activation — no waiting, no shipping'),
              t('countryPage.benefit2', 'Plans starting from ${{price}} USD').replace('{{price}}', country.min_price || plans[0]?.price || '5'),
              t('countryPage.benefit3', 'No roaming charges or surprise fees'),
              t('countryPage.benefit4', 'Keep your main number active while using data abroad'),
              t('countryPage.benefit5', '24/7 customer support'),
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2.5 rtl-native-flex">
                <svg className="w-4 h-4 text-tufts-blue flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-start">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs — same pill-with-circle design as homepage */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rtl-native-flex">
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
