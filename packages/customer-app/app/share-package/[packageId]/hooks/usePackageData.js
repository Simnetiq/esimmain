'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { getSupabase } from '@esim/shared/lib/supabase';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { getProviderFromPlanData } from '@esim/shared/utils/providerUtils';
import { fetchPlanById } from '@esim/shared/services/plansServiceSupabase';
import { isSupabaseAvailable } from '@esim/shared/lib/supabase';
import { GLOBAL_PLAN_IMAGE_URL } from '@esim/shared';
import toast from 'react-hot-toast';

/**
 * Custom hook to handle all package data fetching logic
 *
 * DATA FLOW:
 * - Plan data: Fetched from Supabase (single source of truth for display)
 * - Images/Translations: Fetched from Supabase (countries/regions tables)
 * - Payment validation: Server-side Supabase (handled by /api/create-payment-order)
 *
 * SECURITY NOTE:
 * All plan data fetched here is for DISPLAY ONLY.
 * The payment API re-validates price and plan data server-side from Supabase.
 */
export const usePackageData = () => {
  const params = useParams();
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();

  // Decode the packageId to handle URL-encoded special characters like '+' -> '%2B'
  // Plan IDs can contain '+' (e.g., 'discover+-15days-2gb') which gets URL-encoded
  const packageId = params.packageId ? decodeURIComponent(params.packageId) : null;

  // Language detection
  const currentLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);

  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // URL parameters (client-side only)
  const [urlCountryCode, setUrlCountryCode] = useState(null);
  const [urlCountryName, setUrlCountryName] = useState(null);

  // Package data state
  const [packageData, setPackageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [providerInfo, setProviderInfo] = useState(null);
  const [countryTranslations, setCountryTranslations] = useState({});
  const [countryImage, setCountryImage] = useState(null);
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  // Get URL params on client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      setUrlCountryCode(searchParams.get('country'));
      setUrlCountryName(searchParams.get('name'));
    }
  }, []);

  /**
   * Check if a plan is a global tariff
   */
  const isGlobalPlan = useCallback((planData) => {
    if (!planData) return false;

    const countryCode = planData.country_code || planData.country_slug || planData.countryId || '';
    const regionSlug = planData.region_slug || planData.region || '';
    const type = planData.type || planData.planType || '';

    // Check various patterns for global plans
    const globalPatterns = ['global', 'discover-global', 'worldwide', 'world'];
    const codeOrSlugLower = (countryCode + ' ' + regionSlug).toLowerCase();

    return (
      type === 'global' ||
      globalPatterns.some(pattern => codeOrSlugLower.includes(pattern)) ||
      (planData.country_codes && planData.country_codes.length > 50) ||
      (planData.countryCodes && planData.countryCodes.length > 50) ||
      (planData.coveredCountryCount && planData.coveredCountryCount > 50)
    );
  }, []);

  /**
   * Helper to extract image URL from document data
   */
  const extractImageUrl = (data) => {
    return data?.image?.url || data?.photo || data?.imageUrl?.url || data?.image_url || null;
  };

  /**
   * Fetch image and translations from Supabase (countries/regions tables)
   */
  const fetchImageAndTranslations = useCallback(async (planData, urlCode, urlName) => {
    try {
      let imageUrl = null;
      let translations = {};

      if (isGlobalPlan(planData)) {
        setCountryTranslations({});
        setCountryImage({ url: GLOBAL_PLAN_IMAGE_URL, isOperator: true });
        return;
      }

      const supabase = getSupabase();

      const isRegionalPlan = planData.type === 'regional' ||
        planData.isRegional === true ||
        planData.region_slug ||
        planData.region ||
        (planData.country_codes && planData.country_codes.length > 1) ||
        (planData.countryCodes && planData.countryCodes.length > 1);

      const regionSlug = planData.region_slug || planData.region || planData.country_slug || planData.countryId;
      const countryCode = planData.country_code || planData.countryId;
      const countryName = planData.country_name || planData.country_title || urlName;

      // Helper to try fetching a country/region by id
      const tryFetchCountry = async (table, id) => {
        if (!id) return null;
        const slug = id.toLowerCase().replace(/\s+/g, '-');
        const { data } = await supabase.from(table).select('*').eq('id', slug).single();
        return data;
      };

      // Step 1: Try by country name as slug
      if (countryName && typeof countryName === 'string') {
        const data = await tryFetchCountry('countries', countryName);
        if (data) {
          imageUrl = extractImageUrl(data);
          translations = data.translations || {};
          if (imageUrl) { setCountryTranslations(translations); setCountryImage({ url: imageUrl }); return; }
        }
      }

      // Step 2: Try by country code as slug (lowercase)
      if (countryCode) {
        const data = await tryFetchCountry('countries', countryCode);
        if (data) {
          imageUrl = extractImageUrl(data);
          translations = data.translations || {};
          if (imageUrl) { setCountryTranslations(translations); setCountryImage({ url: imageUrl }); return; }
        }
      }

      // Step 3: If regional, try region collection
      if (isRegionalPlan && regionSlug) {
        const data = await tryFetchCountry('regions', regionSlug);
        if (data) {
          imageUrl = extractImageUrl(data);
          translations = data.translations || {};
          if (imageUrl) { setCountryTranslations(translations); setCountryImage({ url: imageUrl }); return; }
        }
      }

      // Step 4: Try by country code uppercase
      if (countryCode) {
        const { data } = await supabase.from('countries').select('*').eq('id', countryCode.toUpperCase()).single();
        if (data) {
          imageUrl = extractImageUrl(data);
          translations = data.translations || {};
          if (imageUrl) { setCountryTranslations(translations); setCountryImage({ url: imageUrl }); return; }
        }
      }

      // Step 5: Try URL param as slug
      if (urlCode) {
        let data = await tryFetchCountry('countries', urlCode);
        if (data) {
          imageUrl = extractImageUrl(data);
          translations = data.translations || {};
          if (imageUrl) { setCountryTranslations(translations); setCountryImage({ url: imageUrl }); return; }
        }
        data = await tryFetchCountry('regions', urlCode);
        if (data) {
          imageUrl = extractImageUrl(data);
          translations = data.translations || {};
          if (imageUrl) { setCountryTranslations(translations); setCountryImage({ url: imageUrl }); return; }
        }
      }

      setCountryTranslations(translations);
      setCountryImage(null);
    } catch (error) {
      console.error('Error fetching image and translations:', error);
      setCountryTranslations({});
      setCountryImage(null);
    }
  }, [isGlobalPlan]);

  /**
   * Main package data loading function
   * Fetches from Supabase
   */
  const loadPackageData = useCallback(async () => {
    try {
      setLoading(true);

      // PRIMARY: Try Supabase first (single source of truth for client display)
      if (isSupabaseAvailable()) {
        try {
          const supabasePlan = await fetchPlanById(packageId);

          if (supabasePlan) {
            console.log('[usePackageData] Loaded from Supabase:', packageId);
            setPackageData(supabasePlan);
            setProviderInfo(getProviderFromPlanData(supabasePlan));
            await fetchImageAndTranslations(supabasePlan, urlCountryCode, urlCountryName);
            setTranslationsLoaded(true);
            return;
          }
        } catch (supabaseError) {
          console.warn('[usePackageData] Supabase fetch failed:', supabaseError);
        }
      }

      // FALLBACK: Try Supabase dataplans directly
      try {
        const supabase = getSupabase();
        const { data, error: sbError } = await supabase
          .from('dataplans')
          .select('*')
          .eq('id', packageId)
          .single();

        if (data && !sbError) {
          const fullData = {
            id: data.id,
            ...data,
            validity: data.validity_days || data.period || data.duration,
            period: data.validity_days || data.period || data.duration,
            duration: data.validity_days || data.period || data.duration,
            data: data.data_display || data.data,
            isUnlimited: data.is_unlimited === true,
            isRegional: data.is_regional === true,
            hasVoice: data.has_voice === true,
            hasSms: data.has_sms === true,
            operatorName: data.operator_name,
            operatorLogo: data.operator_logo || data.operator_image_url,
            operatorStyle: data.operator_style || 'light',
            operatorGradientStart: data.operator_gradient_start,
            operatorGradientEnd: data.operator_gradient_end,
            fairUsagePolicy: data.fair_usage_policy,
            activationPolicy: data.activation_policy || 'first-usage',
            coveredCountryCount: data.covered_countries_count || (data.covered_countries?.length || 0)
          };
          console.log('[usePackageData] Loaded from Supabase fallback:', packageId);
          setPackageData(fullData);
          setProviderInfo(getProviderFromPlanData(fullData));
          await fetchImageAndTranslations(fullData, urlCountryCode, urlCountryName);
          setTranslationsLoaded(true);
          return;
        }
      } catch (fallbackError) {
        console.warn('[usePackageData] Supabase fallback failed:', fallbackError);
      }

      // No plan found in either source
      console.warn('[usePackageData] Plan not found:', packageId);
      setTranslationsLoaded(true);
    } catch (error) {
      console.error('Failed to load package information:', error);
      toast.error('Failed to load package information');
      setTranslationsLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [packageId, urlCountryCode, urlCountryName, fetchImageAndTranslations]);

  // Load package data on mount
  useEffect(() => {
    if (packageId) {
      loadPackageData();
    }
  }, [packageId, loadPackageData]);

  return {
    packageId,
    packageData,
    loading,
    providerInfo,
    countryTranslations,
    countryImage,
    translationsLoaded,
    urlCountryCode,
    urlCountryName,
    currentLanguage,
    isRTL,
    isGlobalPlan,
    t
  };
};

export default usePackageData;
