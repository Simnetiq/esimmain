'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { getProviderFromPlanData } from '@esim/shared/utils/providerUtils';
import toast from 'react-hot-toast';

/**
 * Custom hook to handle all package data fetching logic
 * Handles country plans, regional plans, and global tariffs
 */
export const usePackageData = () => {
  const params = useParams();
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const packageId = params.packageId;

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

    const countryCode = planData.country_code || planData.country_slug || '';
    const regionSlug = planData.region_slug || '';
    const type = planData.type || '';

    // Check various patterns for global plans
    const globalPatterns = ['global', 'discover-global', 'worldwide', 'world'];
    const codeOrSlugLower = (countryCode + ' ' + regionSlug).toLowerCase();

    return (
      type === 'global' ||
      globalPatterns.some(pattern => codeOrSlugLower.includes(pattern)) ||
      (planData.country_codes && planData.country_codes.length > 50) // Many countries = global
    );
  }, []);

  /**
   * Helper to extract image URL from Firebase document data
   * Checks multiple possible field locations
   */
  const extractImageUrl = (data) => {
    return data?.image?.url || data?.photo || data?.imageUrl?.url || null;
  };

  /**
   * Fetch image and translations for country/region/global plans
   * Following the same robust pattern as EsimCard.jsx
   */
  const fetchImageAndTranslations = useCallback(async (planData, urlCode, urlName) => {
    try {
      let imageUrl = null;
      let translations = {};

      // Handle global plans first
      if (isGlobalPlan(planData)) {
        const globalSlugs = ['discover-global', 'global', 'worldwide'];

        for (const slug of globalSlugs) {
          try {
            const globalSnap = await getDoc(doc(db, 'regions', slug));
            if (globalSnap.exists()) {
              const globalData = globalSnap.data();
              translations = globalData.translations || {};
              imageUrl = extractImageUrl(globalData);
              if (imageUrl) break;
            }
          } catch {
            // Continue to next slug
          }
        }

        setCountryTranslations(translations);
        setCountryImage(imageUrl ? { url: imageUrl } : null);
        return;
      }

      const isRegionalPlan = planData.type === 'regional' ||
        planData.region_slug ||
        (planData.country_codes && planData.country_codes.length > 1);

      const regionSlug = planData.region_slug || planData.country_slug;
      const countryCode = planData.country_code;
      const countryName = planData.country_name || urlName;

      // Step 1: Try by country name as slug (e.g., "Algeria" -> "algeria")
      if (countryName && typeof countryName === 'string') {
        const nameSlug = countryName.toLowerCase().replace(/\s+/g, '-');
        try {
          const countryDoc = await getDoc(doc(db, 'countries', nameSlug));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = extractImageUrl(data);
            translations = data.translations || {};
            if (imageUrl) {
              setCountryTranslations(translations);
              setCountryImage({ url: imageUrl });
              return;
            }
          }
        } catch {
          // Continue to next attempt
        }
      }

      // Step 2: Try by country code as slug (lowercase)
      if (countryCode) {
        const codeSlug = countryCode.toLowerCase().replace(/\s+/g, '-');
        try {
          const countryDoc = await getDoc(doc(db, 'countries', codeSlug));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = extractImageUrl(data);
            translations = data.translations || {};
            if (imageUrl) {
              setCountryTranslations(translations);
              setCountryImage({ url: imageUrl });
              return;
            }
          }
        } catch {
          // Continue to next attempt
        }
      }

      // Step 3: If regional, try region collection
      if (isRegionalPlan && regionSlug) {
        const regSlug = regionSlug.toLowerCase().replace(/\s+/g, '-');
        try {
          const regionDoc = await getDoc(doc(db, 'regions', regSlug));
          if (regionDoc.exists()) {
            const data = regionDoc.data();
            imageUrl = extractImageUrl(data);
            translations = data.translations || {};
            if (imageUrl) {
              setCountryTranslations(translations);
              setCountryImage({ url: imageUrl });
              return;
            }
          }
        } catch {
          // Continue to next attempt
        }
      }

      // Step 4: Try by country code uppercase (ISO format)
      if (countryCode) {
        try {
          const countryDoc = await getDoc(doc(db, 'countries', countryCode.toUpperCase()));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = extractImageUrl(data);
            translations = data.translations || {};
            if (imageUrl) {
              setCountryTranslations(translations);
              setCountryImage({ url: imageUrl });
              return;
            }
          }
        } catch {
          // Continue to next attempt
        }
      }

      // Step 5: Try URL param as country slug
      if (urlCode) {
        const urlSlug = urlCode.toLowerCase().replace(/\s+/g, '-');
        try {
          // Try countries first
          let docSnap = await getDoc(doc(db, 'countries', urlSlug));
          if (docSnap.exists()) {
            const data = docSnap.data();
            imageUrl = extractImageUrl(data);
            translations = data.translations || {};
            if (imageUrl) {
              setCountryTranslations(translations);
              setCountryImage({ url: imageUrl });
              return;
            }
          }
          // Try regions
          docSnap = await getDoc(doc(db, 'regions', urlSlug));
          if (docSnap.exists()) {
            const data = docSnap.data();
            imageUrl = extractImageUrl(data);
            translations = data.translations || {};
            if (imageUrl) {
              setCountryTranslations(translations);
              setCountryImage({ url: imageUrl });
              return;
            }
          }
        } catch {
          // Continue
        }
      }

      // No image found
      setCountryTranslations(translations);
      setCountryImage(null);
    } catch (error) {
      console.error('Error fetching image and translations:', error);
      setCountryTranslations({});
      setCountryImage(null);
    }
  }, [isGlobalPlan]);

  /**
   * Transform API plan data to consistent format
   */
  const transformPlanData = useCallback((apiPlan) => {
    return {
      id: apiPlan.slug || apiPlan.id,
      name: apiPlan.name,
      description: apiPlan.description,
      price: apiPlan.price,
      currency: apiPlan.currency || 'USD',
      data: apiPlan.capacity || apiPlan.data,
      dataUnit: apiPlan.data_unit || 'GB',
      period: apiPlan.period || apiPlan.validity,
      duration: apiPlan.period || apiPlan.validity,
      country_code: apiPlan.country_codes?.[0] || apiPlan.country_code,
      country_codes: apiPlan.country_codes,
      benefits: apiPlan.features || [],
      speed: apiPlan.speed,
      region_slug: apiPlan.region_slug,
      provider: apiPlan.provider || 'airalo',
      operator: apiPlan.operator || '',
      slug: apiPlan.slug,
      type: apiPlan.type
    };
  }, []);

  /**
   * Load package from Airalo API
   */
  const loadFromAiraloAPI = useCallback(async () => {
    try {
      const response = await fetch('/api/airalo/plans');
      const data = await response.json();

      if (data.success && data.plans) {
        const foundPlan = data.plans.find(pkg =>
          pkg.slug === packageId ||
          pkg.id === packageId ||
          pkg.name?.toLowerCase().includes(packageId.toLowerCase())
        );

        if (foundPlan) {
          const transformedData = transformPlanData(foundPlan);
          setPackageData(transformedData);
          setProviderInfo(getProviderFromPlanData(transformedData));
          await fetchImageAndTranslations(transformedData, urlCountryCode, urlCountryName);
          setTranslationsLoaded(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('Error loading from Airalo API:', error);
      return false;
    }
  }, [packageId, transformPlanData, fetchImageAndTranslations, urlCountryCode, urlCountryName]);

  /**
   * Main package data loading function
   */
  const loadPackageData = useCallback(async () => {
    try {
      setLoading(true);

      // Try Firebase dataplans collection first
      const packageRef = doc(db, 'dataplans', packageId);
      const packageSnap = await getDoc(packageRef);

      if (packageSnap.exists()) {
        const data = packageSnap.data();
        const fullData = {
          id: packageSnap.id,
          ...data
        };
        setPackageData(fullData);
        setProviderInfo(getProviderFromPlanData(fullData));
        await fetchImageAndTranslations(fullData, urlCountryCode, urlCountryName);
        setTranslationsLoaded(true);
        return;
      }

      // If not in Firebase, try Airalo API
      const foundInAPI = await loadFromAiraloAPI();

      // Fallback: try to find a package for the country from URL
      if (!foundInAPI && urlCountryCode) {
        try {
          const response = await fetch(`/api/airalo/plans?country=${urlCountryCode}`);
          const data = await response.json();

          if (data.success && data.plans && data.plans.length > 0) {
            const fallbackPlan = data.plans[0];
            const fallbackData = transformPlanData(fallbackPlan);
            setPackageData(fallbackData);
            setProviderInfo(getProviderFromPlanData(fallbackData));
            await fetchImageAndTranslations(fallbackData, urlCountryCode, urlCountryName);
            setTranslationsLoaded(true);
            return;
          }
        } catch {
          // Silent fail for fallback
        }
      }

      if (!foundInAPI) {
        setTranslationsLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load package information:', error);
      toast.error('Failed to load package information');
      setTranslationsLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [packageId, loadFromAiraloAPI, urlCountryCode, urlCountryName, transformPlanData, fetchImageAndTranslations]);

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
