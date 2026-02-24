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
import { useIsMobile } from '../hooks/useIsMobile';


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

// Shared plan data extraction
const usePlanData = (plan, badge) => {
  const { t } = useI18n();
  const originalPrice = parsePrice(plan.price);
  const hasSms = planHasSms(plan);
  const hasVoice = planHasVoice(plan);
  const dataDisplay = formatDataDisplay(plan);
  const validityDays = plan.validity || plan.period || plan.duration || 0;
  const operatorName = plan.operatorName || plan.operator_name;
  const operatorLogo = plan.operatorLogo || plan.operator_logo || plan.operator_image_url;
  const fairUsagePolicy = plan.fair_usage_policy || plan.fairUsagePolicy;
  const coveredCountryCount = plan.coveredCountryCount || plan.covered_countries_count ||
    (plan.covered_countries?.length) || (plan.country_codes?.length) || 0;
  const isRegional = plan.isRegional || plan.is_regional;
  const isGlobal = isGlobalPlan(plan);
  const currency = plan.currency || 'USD';

  const badgeConfig = {
    cheapest: { bg: 'bg-green-50', text: 'text-green-700', label: t('deals.bestPrice', 'Best Price') },
    bestDeal: { bg: 'bg-amber-50', text: 'text-amber-700', label: t('deals.bestValue', 'Best Value') },
    unlimited: { bg: 'bg-purple-50', text: 'text-purple-700', label: t('deals.unlimitedData', 'Unlimited data') }
  };
  const currentBadge = badge ? badgeConfig[badge] : null;

  return { originalPrice, hasSms, hasVoice, dataDisplay, validityDays, operatorName, operatorLogo, fairUsagePolicy, coveredCountryCount, isRegional, isGlobal, currency, currentBadge, t };
};

// Mobile: compact card (sharp corners)
const PlanCard = ({ plan, badge, isSelected, onSelect }) => {
  const { originalPrice, hasSms, hasVoice, dataDisplay, validityDays, operatorName, operatorLogo, fairUsagePolicy, coveredCountryCount, isRegional, isGlobal, currency, currentBadge, t } = usePlanData(plan, badge);

  return (
    <button
      className={`w-full text-start p-4 border transition-all duration-150 ${
        isSelected
          ? 'border-tufts-blue bg-tufts-blue/5 border-s-4'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-3">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
          isSelected ? 'border-tufts-blue bg-tufts-blue' : 'border-gray-300'
        }`}>
          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-eerie-black">{dataDisplay}</span>
            {validityDays > 0 && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500">{validityDays} {t('planSelection.days', 'days')}</span>
              </>
            )}
            {currentBadge && (
              <span className={`${currentBadge.bg} ${currentBadge.text} text-xs font-semibold px-2 py-0.5 rounded-full`}>
                {currentBadge.label}
              </span>
            )}
          </div>
          {(hasSms || hasVoice) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {hasVoice && <span>{plan.voice || plan.calls} {t('plan.minutes', 'min')}</span>}
              {hasVoice && hasSms && <span> · </span>}
              {hasSms && <span>{plan.sms} SMS</span>}
            </p>
          )}
          {operatorName && (
            <div className="flex items-center gap-1 mt-0.5">
              {operatorLogo && (
                <div className="relative w-3.5 h-3.5 flex-shrink-0">
                  <Image src={operatorLogo} alt={operatorName} fill sizes="14px" className="object-contain" quality={75} loading="lazy" />
                </div>
              )}
              <span className="text-xs text-gray-400">{operatorName}</span>
              {(isRegional || isGlobal) && coveredCountryCount > 0 && (
                <>
                  <span className="text-gray-300 mx-0.5">·</span>
                  <span className="text-xs text-tufts-blue">{coveredCountryCount} {t('deals.countries', 'countries')}</span>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-shrink-0 text-end">
          <span className="text-lg font-bold text-eerie-black">{formatPrice(originalPrice)}</span>
          {currency !== 'USD' && <p className="text-xs text-gray-400">{currency}</p>}
        </div>
      </div>
    </button>
  );
};

// Desktop: table row
const PlanTableRow = ({ plan, badge, isSelected, onSelect, regionColor }) => {
  const { originalPrice, hasSms, hasVoice, dataDisplay, validityDays, operatorName, operatorLogo, fairUsagePolicy, coveredCountryCount, isRegional, isGlobal, currency, currentBadge, t } = usePlanData(plan, badge);

  return (
    <tr
      className={`cursor-pointer transition-all duration-150 ${
        isSelected
          ? 'bg-tufts-blue/[0.07] shadow-[inset_0_1px_0_0_rgba(73,117,212,0.15),inset_0_-1px_0_0_rgba(73,117,212,0.15)]'
          : 'hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      {/* Radio */}
      <td className={`ps-5 py-4 w-12 ${isSelected ? 'border-s-4 border-s-tufts-blue' : 'border-s-4 border-s-transparent'}`}>
        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
          isSelected ? 'border-tufts-blue bg-tufts-blue' : 'border-gray-300'
        }`}>
          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>
      </td>
      {/* Data */}
      <td className="py-4 pe-4">
        <span className={`text-base font-bold ${isSelected ? 'text-tufts-blue' : 'text-eerie-black'}`}>{dataDisplay}</span>
      </td>
      {/* Days */}
      <td className="py-4 pe-4">
        <span className={`text-sm ${isSelected ? 'text-gray-700 font-medium' : 'text-gray-600'}`}>{validityDays > 0 ? `${validityDays} days` : '—'}</span>
      </td>
      {/* Operator */}
      <td className="py-4 pe-4">
        <div
          className="inline-flex items-center gap-2 px-2.5 py-1.5"
          style={regionColor ? { background: `linear-gradient(135deg, ${regionColor}25, ${regionColor}08)` } : undefined}
        >
          {operatorLogo && (
            <div className="relative w-5 h-5 flex-shrink-0">
              <Image src={operatorLogo} alt={operatorName || ''} fill sizes="20px" className="object-contain" quality={75} loading="lazy" />
            </div>
          )}
          <span className="text-sm text-gray-600 truncate max-w-[140px]">{operatorName || '—'}</span>
          {(isRegional || isGlobal) && coveredCountryCount > 0 && (
            <span className="text-xs text-tufts-blue whitespace-nowrap ms-1">{coveredCountryCount} {t('deals.countries', 'countries')}</span>
          )}
        </div>
      </td>
      {/* Badge */}
      <td className="py-4 pe-4">
        {currentBadge && (
          <span className={`${currentBadge.bg} ${currentBadge.text} text-xs font-semibold px-2.5 py-1 rounded-full inline-block w-fit`}>
            {currentBadge.label}
          </span>
        )}
      </td>
      {/* Price */}
      <td className="py-4 pe-5 text-end">
        <span className={`text-lg font-bold ${isSelected ? 'text-tufts-blue' : 'text-eerie-black'}`}>{formatPrice(originalPrice)}</span>
        {currency !== 'USD' && <span className="text-xs text-gray-400 ms-1">{currency}</span>}
      </td>
    </tr>
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
  const isMobile = useIsMobile(768);

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
        // Query the actual regions table — countries table has no color/translations columns
        const { data: regions, error } = await supabase
          .from('regions')
          .select('id, slug, name, display_name, metadata')
          .eq('is_active', true);
        if (error) throw error;
        const colors = {};
        const names = {};
        (regions || []).forEach(row => {
          const key = row.slug || row.id;
          colors[key] = row.metadata?.color || '#6B7280';
          names[key] = row.display_name || row.name || key;
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

  // Helper to extract image URL from Supabase document data
  const extractImageUrl = (data) => {
    return data?.image_url || data?.image?.url || data?.photo || data?.imageUrl?.url || null;
  };

  // Fetch country image from Supabase when plans are available
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
          const { data } = await supabase.from('countries').select('image_url').eq('id', id).maybeSingle();
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

    // Use countryImage from state or fallback to plan/country image
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
          <div className="flex items-center gap-x-3 py-1">
            {/* Country/Global/Regional Image */}
            <div className="flex-shrink-0 w-12 aspect-[4/3] flex items-center justify-center border border-gray-200 overflow-hidden rounded bg-gray-50">
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
      variant={isMobile ? "bottom" : "center"}
    >
      <div className="p-4 lg:p-6" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Available Plans or Countries */}
        {loadingPlans ? (
          <div className="py-8">
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-50 p-4 animate-pulse">
                  <div className="h-5 bg-gray-200 w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 w-1/2 mb-3" />
                  <div className="h-6 bg-gray-200 w-1/3" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-gray-500 mt-4">{t('planSelection.loadingPlans', 'Loading available plans...')}</p>
          </div>
        ) : availablePlans && availablePlans.length > 0 ? (
          <div className="space-y-4">
            {/* Sort Control */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-gray-500 flex-shrink-0">
                {t('planSelection.selectPlan', 'Select a plan')}
              </p>
              {/* Mobile: pill segments */}
              <div className="md:hidden inline-flex bg-gray-100 p-0.5">
                {[
                  { value: 'price', label: t('planSort.price', 'Price ↑') },
                  { value: 'data', label: t('planSort.data', 'Data ↓') },
                  { value: 'days', label: t('planSort.days', 'Days ↓') },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`px-3 py-1 text-xs font-medium transition-all duration-150 ${
                      sortBy === opt.value
                        ? 'bg-white text-tufts-blue'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ===== MOBILE: Card list ===== */}
            <div className="md:hidden space-y-4">
              {dataOnlyPlans.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 mb-2">
                    <WifiIcon className="w-4 h-4 text-tufts-blue" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {t('planSelection.dataOnlyPlans', 'Data Only')}
                    </h4>
                  </div>
                  {dataOnlyPlans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} badge={plan.badge} isSelected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />
                  ))}
                </div>
              )}

              {plansWithFeatures.length > 0 && (
                <div className="space-y-1">
                  {dataOnlyPlans.length > 0 && <div className="w-full h-px bg-gray-200 my-3" />}
                  <div className="flex items-center gap-2 mb-2">
                    <PhoneCallIcon className="w-4 h-4 text-green-600" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {t('planSelection.plansWithCallsSms', 'With Calls & SMS')}
                    </h4>
                  </div>
                  {plansWithFeatures.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} badge={plan.badge} isSelected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} />
                  ))}
                </div>
              )}
            </div>

            {/* ===== DESKTOP: Table view ===== */}
            <div className="hidden md:block">
              {dataOnlyPlans.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <WifiIcon className="w-4 h-4 text-tufts-blue" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {t('planSelection.dataOnlyPlans', 'Data Only')}
                    </h4>
                    <span className="text-xs text-gray-400 ms-auto">{dataOnlyPlans.length} {t('planSelection.plans', 'plans')}</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="ps-5 py-3 w-12" />
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600" onClick={() => setSortBy('data')}>
                          {t('planSort.dataLabel', 'Data')} {sortBy === 'data' && '↓'}
                        </th>
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600" onClick={() => setSortBy('days')}>
                          {t('planSort.daysLabel', 'Days')} {sortBy === 'days' && '↓'}
                        </th>
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {t('planSort.operatorLabel', 'Operator')}
                        </th>
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider" />
                        <th className="py-3 pe-5 text-end text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-600" onClick={() => setSortBy('price')}>
                          {t('planSort.priceLabel', 'Price')} {sortBy === 'price' && '↑'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dataOnlyPlans.map((plan) => (
                        <PlanTableRow key={plan.id} plan={plan} badge={plan.badge} isSelected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} regionColor={regionColors[plan.region]} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {plansWithFeatures.length > 0 && (
                <div>
                  {dataOnlyPlans.length > 0 && <div className="w-full h-px bg-gray-200 my-4" />}
                  <div className="flex items-center gap-2 mb-3">
                    <PhoneCallIcon className="w-4 h-4 text-green-600" />
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      {t('planSelection.plansWithCallsSms', 'With Calls & SMS')}
                    </h4>
                    <span className="text-xs text-gray-400 ms-auto">{plansWithFeatures.length} {t('planSelection.plans', 'plans')}</span>
                  </div>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="ps-5 py-3 w-12" />
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('planSort.dataLabel', 'Data')}</th>
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('planSort.daysLabel', 'Days')}</th>
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('planSort.operatorLabel', 'Operator')}</th>
                        <th className="py-3 pe-4 text-start text-xs font-semibold text-gray-400 uppercase tracking-wider" />
                        <th className="py-3 pe-5 text-end text-xs font-semibold text-gray-400 uppercase tracking-wider">{t('planSort.priceLabel', 'Price')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {plansWithFeatures.map((plan) => (
                        <PlanTableRow key={plan.id} plan={plan} badge={plan.badge} isSelected={selectedPlanId === plan.id} onSelect={() => setSelectedPlanId(plan.id)} regionColor={regionColors[plan.region]} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Continue Button — sticky, sharp */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-white border-t border-gray-100 -mx-4 px-4 lg:-mx-6 lg:px-6 mt-6">
              <button
                onClick={() => selectedPlan && handlePlanSelect(selectedPlan)}
                disabled={!selectedPlan}
                className="relative w-full py-3.5 bg-eerie-black text-white text-sm font-semibold rounded-full hover:bg-gray-800 active:scale-[0.99] transition-all duration-150 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
              >
                {selectedPlan ? (
                  <>
                    <span className="block text-center">
                      {t('planSelection.continue', 'Continue')} · {formatPrice(parsePrice(selectedPlan.price))}
                    </span>
                    <span className="absolute end-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                      <svg className="w-3 h-3 text-eerie-black rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    </span>
                  </>
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
                            className="group w-full relative bg-gray-50 hover:bg-white rounded-lg transition-all duration-300 text-start overflow-hidden"
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
