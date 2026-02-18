'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import BottomSheet from './BottomSheet';
import { useRouter, usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { formatPrice, parsePrice } from '@esim/shared/utils/priceUtils';
import Image from 'next/image';
import { getSupabase } from '@esim/shared/lib/supabase';
import { GLOBAL_PLAN_IMAGE_URL } from '@esim/shared';


// Inline SVG icons to avoid lucide-react bundle overhead
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h.01" />
    <path d="M2 8.82a15 15 0 0 1 20 0" />
    <path d="M5 12.859a10 10 0 0 1 14 0" />
    <path d="M8.5 16.429a5 5 0 0 1 7 0" />
  </svg>
);

const PhoneCallIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);  

// Helper to check if plan has SMS
const planHasSms = (plan) => {
  const sms = parseInt(plan.sms) || 0;
  return sms > 0;
};

// Helper to check if plan has Voice
const planHasVoice = (plan) => {
  const voice = parseInt(plan.voice) || parseInt(plan.calls) || 0;
  return voice > 0;
};

// Helper to check if plan is a global plan
const isGlobalPlan = (plan) => {
  if (!plan) return false;

  // Check plan_type or type
  if (plan.plan_type === 'global' || plan.type === 'global') return true;

  // Check region_id
  if (plan.region_id === 'global') return true;

  // Check name patterns
  const name = (plan.name || plan.country_name || '').toLowerCase();
  if (name.includes('discover global') || name.includes('worldwide') || name === 'global') return true;

  // Check if many covered countries (50+)
  const coveredCount = plan.coveredCountryCount || plan.covered_countries_count ||
    (plan.covered_countries?.length) || (plan.country_codes?.length) || 0;
  if (coveredCount >= 50) return true;

  return false;
};

// Helper function to format data amount correctly
const formatDataDisplay = (plan) => {
  // First priority: check for unlimited (strict boolean check from database)
  if (plan.isUnlimited === true || plan.is_unlimited === true) {
    return 'Unlimited';
  }

  // Second priority: calculate from dataAmountMb if available (most reliable)
  const mb = plan.dataAmountMb || plan.data_amount_mb;
  if (mb && mb > 0) {
    if (mb >= 1024) {
      const gb = mb / 1024;
      return Number.isInteger(gb) ? `${gb} GB` : `${gb.toFixed(1)} GB`;
    }
    return `${mb} MB`;
  }

  // Third priority: use data_display or data string
  const dataStr = plan.data_display || plan.data;
  if (dataStr && typeof dataStr === 'string') {
    // Only show "Unlimited" from string if is_unlimited boolean wasn't set
    // This handles legacy data where is_unlimited might not exist
    const lower = dataStr.toLowerCase();
    if (lower.includes('unlimited') || lower === '∞') {
      return 'Unlimited';
    }
    if (lower.includes('gb') || lower.includes('mb')) {
      return dataStr;
    }
  }

  return dataStr || 'Data';
};

const PlanCard = ({ plan, badge, isSelected, onSelect }) => {
  const { t } = useI18n();

  const originalPrice = parsePrice(plan.price);
  const hasSms = planHasSms(plan);
  const hasVoice = planHasVoice(plan);

  // Format data display properly
  const dataDisplay = formatDataDisplay(plan);

  // Get validity days with fallback
  const validityDays = plan.validity || plan.period || plan.duration || 0;

  // Get additional plan metadata
  const operatorName = plan.operatorName || plan.operator_name;
  const operatorLogo = plan.operatorLogo || plan.operator_logo || plan.operator_image_url;
  const fairUsagePolicy = plan.fair_usage_policy || plan.fairUsagePolicy;
  const coveredCountryCount = plan.coveredCountryCount || plan.covered_countries_count ||
    (plan.covered_countries?.length) || (plan.country_codes?.length) || 0;
  const isRegional = plan.isRegional || plan.is_regional;
  const isGlobal = isGlobalPlan(plan);
  const currency = plan.currency || 'USD';

  // Badge configurations - simple text badges
  const badgeConfig = {
    cheapest: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: t('deals.bestPrice', 'Best Price')
    },
    bestDeal: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      label: t('deals.bestValue', 'Best Value')
    },
    unlimited: {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      label: t('deals.unlimitedData', 'Unlimited data')
    }
  };

  const currentBadge = badge ? badgeConfig[badge] : null;

  return (
    <button
      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
        isSelected
          ? 'border-tufts-blue bg-blue-50/50'
          : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Radio indicator */}
        <div className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected
            ? 'border-tufts-blue bg-tufts-blue'
            : 'border-gray-300'
        }`}>
          {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
        </div>

        {/* Center: Plan details */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Data + Validity + Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-semibold text-gray-900">
              {dataDisplay}
            </span>
            {validityDays > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500">
                  {validityDays} {t('planSelection.days', 'days')}
                </span>
              </>
            )}
            {/* Badges */}
            {currentBadge && (
              <span className={`${currentBadge.bg} ${currentBadge.text} text-xs font-medium px-2 py-0.5 rounded`}>
                {currentBadge.label}
              </span>
            )}
          </div>

          {/* Row 2: SMS & Voice */}
          {(hasSms || hasVoice) && (
            <p className="text-xs text-gray-500 mt-1">
              {hasVoice && <span>{plan.voice || plan.calls} {t('plan.minutes', 'min')}</span>}
              {hasVoice && hasSms && <span> · </span>}
              {hasSms && <span>{plan.sms} SMS</span>}
            </p>
          )}

          {/* Row 3: Operator + Country Coverage */}
          {(operatorName || ((isRegional || isGlobal) && coveredCountryCount > 0)) && (
            <div className="flex items-center gap-2 flex-wrap mt-1">
              {operatorName && (
                <div className="flex items-center gap-1">
                  {operatorLogo && (
                    <div className="relative w-4 h-4 flex-shrink-0">
                      <Image
                        src={operatorLogo}
                        alt={operatorName}
                        fill
                        sizes="16px"
                        className="rounded object-contain"
                        quality={75}
                        loading="lazy"
                      />
                    </div>
                  )}
                  <span className="text-xs text-gray-400">{operatorName}</span>
                </div>
              )}
              {(isRegional || isGlobal) && coveredCountryCount > 0 && (
                <>
                  {operatorName && <span className="text-gray-300">·</span>}
                  <span className="inline-flex items-center gap-1 text-xs text-tufts-blue">
                    <GlobeIcon className="w-3 h-3" />
                    {coveredCountryCount} {coveredCountryCount === 1 ? t('deals.country', 'country') : t('deals.countries', 'countries')}
                  </span>
                </>
              )}
            </div>
          )}

          {/* Row 4: Fair Usage Policy (for unlimited plans) */}
          {fairUsagePolicy && (
            <p className="text-xs text-amber-600 mt-1">
              {t('plan.fairUsage', 'Fair usage')}: {fairUsagePolicy}
            </p>
          )}
        </div>

        {/* Right: Price */}
        <div className="flex-shrink-0 text-right">
          <span className="text-lg font-bold text-gray-900">
            {formatPrice(originalPrice)}
          </span>
          {currency !== 'USD' && (
            <p className="text-xs text-gray-400">{currency}</p>
          )}
        </div>
      </div>
    </button>
  );
};

const PlanSelectionBottomSheet = ({
  isOpen,
  onClose,
  availablePlans,
  loadingPlans,
  filteredCountries,
  context, // 'country' | 'regional' - determines how to display the sheet
  regionName // e.g., 'europe', 'asia', 'global' - used for regional context title
}) => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const [regionColors, setRegionColors] = useState({});
  const [regionNames, setRegionNames] = useState({});
  const [sortBy, setSortBy] = useState('price'); // price, data, days
  const [countryImage, setCountryImage] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);

  // Get current language for RTL detection
  const currentLanguage = React.useMemo(() => {
    try {
      if (i18nLoading) {
        // While loading, use localStorage or pathname detection
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      // Once loaded, use locale from I18nContext
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Helper function to generate localized URLs
  const getLocalizedUrl = (path) => {
    if (currentLanguage === 'en') {
      return path;
    }
    return `/${currentLanguage}${path}`;
  };

  // Fetch region colors and names from Supabase
  useEffect(() => {
    const fetchRegionData = async () => {
      try {
        const supabase = getSupabase();
        const { data: regions, error } = await supabase.from('countries').select('id, color, translations, name').not('color', 'is', null);
        if (error) throw error;
        const colors = {};
        const names = {};
        (regions || []).forEach(row => {
          colors[row.id] = row.color || '#6B7280';
          names[row.id] = row.translations?.[currentLanguage] || row.name || row.id;
        });
        setRegionColors(colors);
        setRegionNames(names);
      } catch (error) {
        console.error('Error fetching region data:', error);
      }
    };

    if (isOpen) {
      fetchRegionData();
    }
  }, [isOpen, currentLanguage]);

  // Helper to extract image URL from Firebase document data
  const extractImageUrl = (data) => {
    return data?.image?.url || data?.photo || data?.imageUrl?.url || null;
  };

  // Fetch country image from Firebase when plans are available
  // Following the same robust pattern as EsimCard.jsx
  useEffect(() => {
    const fetchCountryImage = async () => {
      if (!availablePlans || availablePlans.length === 0) {
        setCountryImage(null);
        return;
      }

      const firstPlan = availablePlans[0];

      // Handle global plans - use hardcoded global image
      if (isGlobalPlan(firstPlan)) {
        setCountryImage({ url: GLOBAL_PLAN_IMAGE_URL, isOperator: true });
        return;
      }

      const countryCode = firstPlan.country_codes?.[0] || firstPlan.country_code;
      const countryName = firstPlan.country_name || firstPlan.name;
      const isRegional = firstPlan.type === 'regional' || firstPlan.region_slug ||
        (firstPlan.country_codes && firstPlan.country_codes.length > 1);

      // Check if we already have the image from filteredCountries
      const matchingCountry = filteredCountries?.find(c =>
        c.code?.toLowerCase() === countryCode?.toLowerCase()
      );

      if (matchingCountry?.image?.url) {
        setCountryImage(matchingCountry.image);
        return;
      }

      // Fetch from Supabase using multiple strategies
      try {
        const supabase = getSupabase();
        let imageUrl = null;

        const tryFetch = async (id) => {
          const { data } = await supabase.from('countries').select('image, photo').eq('id', id).single();
          return data ? extractImageUrl(data) : null;
        };

        // Step 1: Try by country name as slug
        if (countryName && typeof countryName === 'string') {
          imageUrl = await tryFetch(countryName.toLowerCase().replace(/\s+/g, '-'));
          if (imageUrl) { setCountryImage({ url: imageUrl }); return; }
        }

        // Step 2: Try by country code as slug (lowercase)
        if (countryCode) {
          imageUrl = await tryFetch(countryCode.toLowerCase().replace(/\s+/g, '-'));
          if (imageUrl) { setCountryImage({ url: imageUrl }); return; }
        }

        // Step 3: If regional, try region slug
        if (isRegional && countryName) {
          imageUrl = await tryFetch(countryName.toLowerCase().replace(/\s+/g, '-'));
          if (imageUrl) { setCountryImage({ url: imageUrl }); return; }
        }

        // Step 4: Try by country code uppercase (ISO format)
        if (countryCode) {
          imageUrl = await tryFetch(countryCode.toUpperCase());
          if (imageUrl) { setCountryImage({ url: imageUrl }); return; }
        }

        setCountryImage(null);
      } catch (error) {
        console.error('Error fetching country image:', error);
        setCountryImage(null);
      }
    };

    if (isOpen) {
      fetchCountryImage();
    }
  }, [isOpen, availablePlans, filteredCountries]);

  // Group countries by specific days (30, 7, 10, 15 days)
  const groupCountriesByDays = (countriesList) => {
    const targetDays = [30, 7, 10, 15];
    const groups = {};

    // Initialize groups for target days
    targetDays.forEach(day => {
      groups[day] = [];
    });

    // Add countries to appropriate day groups with recalculated min prices for specific days
    countriesList.forEach(country => {
      if (country.plans && country.plans.length > 0) {
        country.plans.forEach(plan => {
          const days = plan.period || plan.duration;
          if (targetDays.includes(days)) {
            // Calculate the actual minimum price for this specific day duration
            const dayPlans = country.plans.filter(p => (p.period || p.duration) === days);
            const dayMinPrice = dayPlans.length > 0
              ? Math.min(...dayPlans.map(p => parseFloat(p.price) || 999))
              : 999;

            // Check if country already exists in this day group
            const existingCountry = groups[days].find(c => c.id === country.id);
            if (existingCountry) {
              // Update with the better (lower) price if this plan is cheaper
              if (dayMinPrice < existingCountry.dayMinPrice) {
                existingCountry.dayMinPrice = dayMinPrice;
              }
            } else {
              // Add country with the specific day's minimum price
              groups[days].push({
                ...country,
                dayMinPrice: dayMinPrice
              });
            }
          }
        });
      }
    });

    // Sort each group by the specific day's minimum price (cheapest first)
    Object.keys(groups).forEach(day => {
      groups[day].sort((a, b) => (a.dayMinPrice || a.minPrice) - (b.dayMinPrice || b.minPrice));
    });

    return groups;
  };


  // Helper to get data value in MB
  const getDataValueInMB = (plan) => {
    const dataStr = plan.data || '0';

    // Check for unlimited
    if (dataStr.toLowerCase().includes('unlimited') || dataStr.toLowerCase().includes('∞')) {
      return Infinity;
    }

    const match = dataStr.match(/(\d+\.?\d*)\s*(GB|MB)/i);
    if (!match) return 0;
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    return unit === 'GB' ? value * 1024 : value;
  };

  // Determine badges for plans
  const plansWithBadges = useMemo(() => {
    if (!availablePlans || availablePlans.length === 0) return [];

    // Find cheapest plan
    const cheapestPlan = [...availablePlans].reduce((min, plan) =>
      (parseFloat(plan.price) < parseFloat(min.price) ? plan : min)
    );

    // Find unlimited plans (strict boolean check from database)
    const unlimitedPlans = availablePlans.filter(plan =>
      plan.isUnlimited === true || plan.is_unlimited === true
    );

    // Find best deal - prioritize 10GB, 7GB, or 5GB plans
    const bestDealPlan = (() => {
      const preferredSizes = [10, 7, 5]; // Priority order

      for (const size of preferredSizes) {
        const sizeInMB = size * 1024;
        const matchingPlans = availablePlans.filter(plan => {
          const dataInMB = getDataValueInMB(plan);
          return dataInMB >= sizeInMB - 100 && dataInMB <= sizeInMB + 100; // Small tolerance
        });

        if (matchingPlans.length > 0) {
          // Return the cheapest among matching size
          return matchingPlans.reduce((min, plan) =>
            (parseFloat(plan.price) < parseFloat(min.price) ? plan : min)
          );
        }
      }

      return null;
    })();

    // Assign badges
    return availablePlans.map(plan => ({
      ...plan,
      badge: plan.id === cheapestPlan.id ? 'cheapest' :
        unlimitedPlans.find(p => p.id === plan.id) ? 'unlimited' :
          bestDealPlan && plan.id === bestDealPlan.id ? 'bestDeal' :
            null
    }));
  }, [availablePlans]);

  // Sort function for plans
  const sortPlansList = useCallback((plans) => {
    return [...plans].sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return (parseFloat(a.price) || 999) - (parseFloat(b.price) || 999);
        case 'data':
          return getDataValueInMB(b) - getDataValueInMB(a);
        case 'days':
          const daysA = parseInt(a.period || a.duration) || 0;
          const daysB = parseInt(b.period || b.duration) || 0;
          return daysB - daysA;
        default:
          return 0;
      }
    });
  }, [sortBy]);

  // Separate plans into Data Only and Plans with Calls/SMS
  const { dataOnlyPlans, plansWithFeatures } = useMemo(() => {
    if (!plansWithBadges || plansWithBadges.length === 0) {
      return { dataOnlyPlans: [], plansWithFeatures: [] };
    }

    const withFeatures = plansWithBadges.filter(plan => planHasSms(plan) || planHasVoice(plan));
    const dataOnly = plansWithBadges.filter(plan => !planHasSms(plan) && !planHasVoice(plan));

    // If both are empty (edge case), put all plans in dataOnly as fallback
    if (withFeatures.length === 0 && dataOnly.length === 0) {
      return {
        dataOnlyPlans: sortPlansList(plansWithBadges),
        plansWithFeatures: []
      };
    }

    return {
      dataOnlyPlans: sortPlansList(dataOnly),
      plansWithFeatures: sortPlansList(withFeatures)
    };
  }, [plansWithBadges, sortPlansList]);

  // Auto-select the first plan (cheapest) when plans are loaded
  useEffect(() => {
    // Only auto-select if no plan is currently selected
    if (selectedPlanId) return;

    // Prefer data-only plans first, then plans with features
    if (dataOnlyPlans.length > 0) {
      setSelectedPlanId(dataOnlyPlans[0].id);
    } else if (plansWithFeatures.length > 0) {
      setSelectedPlanId(plansWithFeatures[0].id);
    }
  }, [dataOnlyPlans, plansWithFeatures, selectedPlanId]);

  // Reset selection when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedPlanId(null);
    }
  }, [isOpen]);

  // Get the selected plan object
  const selectedPlan = useMemo(() => {
    if (!selectedPlanId) return null;
    return [...dataOnlyPlans, ...plansWithFeatures].find(p => p.id === selectedPlanId);
  }, [selectedPlanId, dataOnlyPlans, plansWithFeatures]);

  // Helper to format region name for display
  const formatRegionName = (region) => {
    if (!region) return '';
    // Capitalize first letter of each word
    return region.split(/[-_\s]/).map(word =>
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Get country/region info from first plan or filteredCountries
  const countryInfo = useMemo(() => {
    if (!availablePlans || availablePlans.length === 0) return null;

    const firstPlan = availablePlans[0];

    // Handle regional context - show region name instead of country
    if (context === 'regional' && regionName) {
      const isGlobal = regionName === 'global';
      return {
        code: regionName,
        name: isGlobal
          ? t('planSelection.globalPlans', 'Global Plans')
          : t('planSelection.regionalPlansFor', '{region} Plans', { region: formatRegionName(regionName) }).replace('{region}', formatRegionName(regionName)),
        region: regionName,
        imageUrl: isGlobal ? GLOBAL_PLAN_IMAGE_URL : null,
        isGlobal: isGlobal,
        isRegional: true
      };
    }

    // Handle global plans - use hardcoded global image
    if (isGlobalPlan(firstPlan)) {
      return {
        code: 'global',
        name: firstPlan.country_name || t('planSelection.globalPlans', 'Global'),
        region: 'global',
        imageUrl: GLOBAL_PLAN_IMAGE_URL,
        isGlobal: true
      };
    }

    const countryCode = firstPlan.country_codes?.[0] || firstPlan.country_code;
    const region = firstPlan.region;

    // Try to get TRANSLATED country name from filteredCountries (which has translations)
    // filteredCountries comes from useCountriesSupabase hook which includes country_translations
    const matchingCountry = filteredCountries?.find(c =>
      c.code?.toLowerCase() === countryCode?.toLowerCase() ||
      c.id?.toLowerCase() === countryCode?.toLowerCase()
    );

    // Use translated displayName if available, otherwise fallback to plan's country_name
    const countryName = matchingCountry?.displayName || matchingCountry?.name ||
      firstPlan.country_name || firstPlan.country_title || countryCode;

    // Use countryImage from state (fetched from Firebase) or fallback to plan/country image
    const imageUrl = countryImage?.url || matchingCountry?.imageUrl || matchingCountry?.image?.url || firstPlan.image?.url;

    return {
      code: countryCode,
      name: countryName,
      region: region,
      imageUrl: imageUrl,
      isGlobal: false
    };
  }, [availablePlans, countryImage, t, context, regionName, filteredCountries]);

  const handlePlanSelect = (plan) => {
    // Track plan selection with Facebook Pixel including value
    const planPrice = parseFloat(plan.price) || 0;

    trackCustomFacebookEvent('PlanSelected', {
      content_name: plan.name,
      content_type: 'esim_plan',
      content_ids: [plan.id],
      value: planPrice,
      currency: plan.currency || 'USD',
      data_amount: plan.data,
      data_unit: plan.dataUnit,
      validity_days: plan.period || plan.duration,
      country_codes: plan.country_codes?.join(',') || plan.country_code || '',
      source: 'plan_selection_sheet',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });

    // Get country code for the plan - use 'global' for global plans
    const planCountryCode = isGlobalPlan(plan)
      ? 'global'
      : (plan.country_codes?.[0] || plan.country_code);

    // Navigate to the share package page with country info
    const params = new URLSearchParams({
      country: planCountryCode || ''
    });

    const sharePackageUrl = getLocalizedUrl(`/share-package/${plan.id}?${params.toString()}`);
    router.push(sharePackageUrl);
  };


  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        countryInfo ? (
          <div className="flex items-center gap-x-2 my-4">
            {/* Country/Global/Regional Image */}
            <div className="flex-shrink-0 w-10 aspect-[4/3] flex items-center justify-center border border-gray-200 overflow-hidden rounded bg-gray-50">
              {countryInfo.imageUrl ? (
                <div className="relative w-full h-full">
                  <Image
                    src={countryInfo.imageUrl}
                    alt={`${countryInfo.name}`}
                    fill
                    sizes="40px"
                    className={countryInfo.isGlobal ? "object-contain p-1" : "object-cover"}
                    quality={75}
                    loading="lazy"
                  />
                </div>
              ) : (countryInfo.isGlobal || countryInfo.isRegional) ? (
                <GlobeIcon className="w-5 h-5 text-tufts-blue" />
              ) : null}
            </div>
            {/* Country/Region Name */}
            <span className="font-light text-2xl text-gray-900">{countryInfo.name}</span>

          </div>
        ) : (
          t('planSelection.chooseYourPlan', 'Choose Your Plan')
        )
      }
      maxHeight="85vh"
      variant="center"
    >
      <div className="p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Available Plans or Countries */}
        {loadingPlans ? (
          <div className="py-8">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
                  <div className="h-6 bg-gray-200 rounded w-1/3" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">{t('planSelection.loadingPlans', 'Loading available plans...')}</p>
          </div>
        ) : availablePlans && availablePlans.length > 0 ? (
          <div className="space-y-4">
            {/* Sort Control */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">
                {t('planSelection.selectPlan', 'Select a plan')}
              </p>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs sm:text-sm border-0 bg-gray-100 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-tufts-blue/20"
              >
                <option value="price">{t('planSort.price', 'Price ↑')}</option>
                <option value="data">{t('planSort.data', 'Data ↓')}</option>
                <option value="days">{t('planSort.days', 'Days ↓')}</option>
              </select>
            </div>

            {/* Data Only Plans Section */}
            {dataOnlyPlans.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <WifiIcon className="w-4 h-4 text-tufts-blue" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700">
                    {t('planSelection.dataOnlyPlans', 'Data Only')}
                  </h4>
                </div>
                <div className="flex flex-col gap-2">
                  {dataOnlyPlans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      badge={plan.badge}
                      isSelected={selectedPlanId === plan.id}
                      onSelect={() => setSelectedPlanId(plan.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Plans with Calls & SMS Section */}
            {plansWithFeatures.length > 0 && (
              <div className="space-y-3">
                {dataOnlyPlans.length > 0 && (
                  <div className="w-full h-px bg-gray-200 my-4" />
                )}
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                    <PhoneCallIcon className="w-4 h-4 text-green-600" />
                  </div>
                  <h4 className="text-sm font-semibold text-gray-700">
                    {t('planSelection.plansWithCallsSms', 'With Calls & SMS')}
                  </h4>
                </div>
                <div className="flex flex-col gap-2">
                  {plansWithFeatures.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      badge={plan.badge}
                      isSelected={selectedPlanId === plan.id}
                      onSelect={() => setSelectedPlanId(plan.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Continue Button - Fixed at bottom */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-gray-100 -mx-4 px-4 lg:-mx-6 lg:px-6 mt-6">
              <button
                onClick={() => selectedPlan && handlePlanSelect(selectedPlan)}
                disabled={!selectedPlan}
                className="w-full py-3.5 bg-tufts-blue text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {selectedPlan ? (
                  <span className="flex items-center justify-center gap-2">
                    {t('planSelection.continue', 'Continue')} · {formatPrice(parsePrice(selectedPlan.price))}
                  </span>
                ) : (
                  t('planSelection.selectPlanToContinue', 'Select a plan to continue')
                )}
              </button>
            </div>
          </div>
        ) : filteredCountries && filteredCountries.length > 0 ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-tufts-blue/10 flex items-center justify-center">
                  <GlobeIcon className="w-4 h-4 text-tufts-blue" />
                </div>
                <h4 className="font-semibold text-eerie-black text-sm sm:text-base">
                  {t('planSelection.availablePlans', 'Available Plans')}
                </h4>
              </div>
              <span className="text-xs text-gray-400">{t('planSelection.sortedByCheapest', 'Cheapest first')}</span>
            </div>

            {/* Auto-grouped Display by Days */}
            {(() => {
              const grouped = groupCountriesByDays(filteredCountries);
              const orderedDays = [30, 7, 10, 15]; // Display order

              return orderedDays.map((days, groupIndex) => {
                const countries = grouped[days] || [];
                if (countries.length === 0) return null;

                return (
                  <div key={days} className="space-y-4">
                    {/* Divider and Header */}
                    {groupIndex > 0 && (
                      <div className="w-full h-px bg-gray-100 my-4" />
                    )}

                    <div className="flex items-center justify-between">
                      <h5 className="text-sm font-semibold text-eerie-black">
                        {t('planSelection.dayPlans', '{{days}} Day{{plural}} Plans', { days, plural: days !== 1 ? 's' : '' })}
                      </h5>
                      <span className="text-xs text-gray-400">
                        {countries.length} {countries.length === 1 ? 'option' : 'options'}
                      </span>
                    </div>

                    {/* Countries Grid - 2 per row on mobile, 3 on desktop */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {countries.map((country) => {
                        // Get the cheapest plan for this duration
                        const dayPlans = country.plans?.filter(p => (p.period || p.duration) === days) || [];
                        const cheapestPlan = dayPlans.length > 0
                          ? dayPlans.reduce((min, p) => (parseFloat(p.price) < parseFloat(min.price) ? p : min))
                          : null;

                        if (!cheapestPlan) return null;

                        const countryName = country.displayName || country.name;
                        const region = country.region;
                        const regionColor = regionColors[region] || '#6B7280';

                        return (
                          <button
                            key={`${days}-${country.id}`}
                            className="group w-full relative bg-gray-50 hover:bg-white rounded-lg transition-all duration-300 text-left overflow-hidden"
                            onClick={() => {
                              // Navigate to plan or country
                            }}
                          >
                            <div className="p-4 space-y-3">
                              {/* Row 1: Image + Country Name */}
                              <div className="flex items-center gap-2">
                                <div className="flex-shrink-0 w-8 h-6 overflow-hidden rounded bg-white">
                                  {country.image?.url && (
                                    <div className="relative w-full h-full">
                                      <Image
                                        src={country.image.url}
                                        alt={countryName}
                                        fill
                                        sizes="32px"
                                        className="object-cover"
                                        quality={75}
                                        loading="lazy"
                                      />
                                    </div>
                                  )}
                                </div>
                                <h3 className="text-sm font-semibold text-eerie-black truncate flex-1">
                                  {countryName}
                                </h3>
                              </div>

                              {/* Row 2: Data + Price */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-base font-bold text-eerie-black">
                                  {cheapestPlan.data}
                                </div>
                                <div className="text-base font-bold text-tufts-blue">
                                  {formatPrice(cheapestPlan.price)}
                                </div>
                              </div>

                              {/* Row 3: Duration + Region */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-400">
                                  {days} {t('planSelection.days', 'days')}
                                </span>
                                {region && (
                                  <span
                                    className="px-2 py-0.5 text-white text-xs font-medium rounded-full"
                                    style={{ backgroundColor: regionColor }}
                                  >
                                    {regionNames[region] || region}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Border ring */}
                            <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5 group-hover:ring-tufts-blue/30 transition-all duration-300" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <GlobeIcon className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-eerie-black mb-2">{t('planSelection.noPlansAvailable', 'No Plans Available')}</h3>
            <p className="text-sm text-gray-500 mb-2">
              {t('planSelection.couldNotFind', 'We couldn\'t find any plans for your current selection')}
            </p>
            <p className="text-xs text-gray-400">
              {t('planSelection.tryAdjusting', 'Try adjusting your filters or selecting a different country')}
            </p>
          </div>
        )}

        {/* Bottom Spacing */}
        <div className="h-4" />
      </div>
    </BottomSheet>
  );
};

export default PlanSelectionBottomSheet;
