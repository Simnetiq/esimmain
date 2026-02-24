'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { esimService } from '@esim/shared/services/esimService';
import { getReferralStats, createReferralCode } from '@esim/shared/services/referralService';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import {
  mapAiraloSimData,
  mapPackageCountryData,
  mapPlanDetails
} from '@esim/shared/utils/esimFieldMapper';
import { usePlansSupabase } from '@esim/shared/hooks/usePlanSupabase';
import toast from 'react-hot-toast';

// Dashboard Components
import AccessDeniedAlert from './dashboard/AccessDeniedAlert';
import DashboardHeader from './dashboard/DashboardHeader';
import RecentOrders from './dashboard/RecentOrders';

// Lazy load modals - not needed for initial render
const QRCodeModal = dynamic(() => import('./dashboard/QRCodeModal'), {
  ssr: false,
  loading: () => null
});
const ReferralBottomSheet = dynamic(() => import('./ReferralBottomSheet'), {
  ssr: false,
  loading: () => null
});

// Dashboard Skeleton Component - matches exact DashboardHeader + RecentOrders layout
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
    <div className="relative isolate flex-1 flex flex-col">
      {/* Horizontal Lines */}
      <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200/70" />
      <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200/70" />

      {/* Header Section Skeleton — matches DashboardHeader */}
      <div className="bg-white">
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              {/* Subtitle — matches text-sm/text-base tracking-widest uppercase */}
              <div className="h-4 sm:h-5 w-80 max-w-full bg-gray-200 rounded animate-pulse mb-4" />
              {/* Title — matches text-xl sm:text-2xl lg:text-3xl xl:text-4xl */}
              <div className="h-7 sm:h-8 lg:h-10 xl:h-12 w-96 max-w-full bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100" />
      </div>

      {/* Stats + Actions Skeleton — matches DashboardHeader grid */}
      <div className="bg-white">
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">

              {/* Stats Cards — 3-col grid matching real layout */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="relative bg-gray-50 overflow-hidden p-5">
                    <span className="absolute top-3 right-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-400/10 select-none pointer-events-none" aria-hidden="true">--</span>
                    <div className="relative">
                      <div className="w-11 h-11 rounded-lg bg-gray-200 animate-pulse mb-4" />
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-3">
                <div className="h-12 w-40 bg-gray-200 rounded-full animate-pulse" />
                <div className="h-12 w-44 bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders Section Skeleton — spinner only */}
      <div className="bg-white flex-1">
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              {/* Section title */}
              <div className="h-7 sm:h-8 w-44 bg-gray-200 rounded animate-pulse mb-6" />

              {/* Loading indicator */}
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const Dashboard = () => {
  const { currentUser, userProfile, loadUserProfile, loading: authLoading } = useAuth();
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [esimDetails, setEsimDetails] = useState(null);
  const [loadingEsimDetails, setLoadingEsimDetails] = useState(false);
  const [esimUsage, setEsimUsage] = useState(null);
  const [loadingEsimUsage, setLoadingEsimUsage] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReferralSheet, setShowReferralSheet] = useState(false);
  const [usageCache, setUsageCache] = useState({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loadingUsageMap, setLoadingUsageMap] = useState({});

  // Extract unique packageIds from orders for Supabase lookup
  const packageIds = useMemo(() => {
    if (!orders || orders.length === 0) return [];
    const ids = orders
      .map(order => order.packageSlug || order.package_id || order.plan_id)
      .filter(Boolean)
      .filter((id, index, self) => self.indexOf(id) === index); // unique
    return ids;
  }, [orders]);

  // Fetch plan metadata from Supabase (operator branding, coverage, etc.)
  const { plans: supabasePlans, isLoading: plansLoading } = usePlansSupabase(packageIds);

  // Create a map for easy lookup: packageId -> plan metadata
  const planMetadataMap = useMemo(() => {
    if (!supabasePlans || supabasePlans.length === 0) return {};
    const map = {};
    supabasePlans.forEach(plan => {
      if (plan?.id) {
        map[plan.id] = plan;
      }
    });
    return map;
  }, [supabasePlans]);

  // Affiliate data (used by setReferralStats, will be used in future referral UI)
  const [, setReferralStats] = useState({
    referralCode: null,
    usageCount: 0,
    totalEarnings: 0,
    isActive: false
  });

  // Helper: Check if an eSIM is likely expired based on stored order data
  // Returns { isExpired: boolean, reason: string, cachedUsage: object | null }
  const checkEsimExpiration = useCallback((order, cachedUsage) => {
    // 1. Check cached usage data first (from previous API calls)
    if (cachedUsage) {
      const expiredStatuses = ['EXPIRED', 'RECYCLED', 'FINISHED'];
      if (expiredStatuses.includes(cachedUsage.status?.toUpperCase())) {
        return { isExpired: true, reason: 'status', cachedUsage };
      }
      if (cachedUsage.expired_at && new Date(cachedUsage.expired_at) < new Date()) {
        return { isExpired: true, reason: 'expired_at', cachedUsage };
      }
    }

    // 2. Check order status
    if (order.status === 'expired' || order.status === 'finished' || order.status === 'recycled') {
      return { isExpired: true, reason: 'order_status', cachedUsage: null };
    }

    // 3. Calculate expiration from creation date + validity
    const validity = order.planDetails?.validity || order.airaloOrderData?.validity || 0;
    if (validity > 0 && order.createdAt) {
      const createdDate = new Date(order.createdAt || 0);
      const expirationDate = new Date(createdDate);
      expirationDate.setDate(expirationDate.getDate() + validity);

      if (new Date() > expirationDate) {
        return { isExpired: true, reason: 'validity_expired', cachedUsage: null };
      }
    }

    return { isExpired: false, reason: null, cachedUsage };
  }, []);

  // Helper: Create synthetic usage data for expired eSIMs from stored order data
  const createExpiredUsageData = useCallback((order) => {
    const planDetails = order.planDetails || {};
    const airaloOrderData = order.airaloOrderData || {};
    const simData = airaloOrderData.sims?.[0] || {};

    const totalData = planDetails.dataAmountMb || simData.data_amount_mb || airaloOrderData.data_amount_mb || 0;
    const totalVoice = planDetails.voice || simData.voice || airaloOrderData.voice || 0;
    const totalText = planDetails.sms || simData.text || airaloOrderData.text || 0;
    const isUnlimited = planDetails.isUnlimited || airaloOrderData.is_unlimited || false;
    const validity = planDetails.validity || airaloOrderData.validity || 0;

    // Calculate expiration date
    let expiredAt = null;
    if (order.createdAt && validity > 0) {
      const createdDate = new Date(order.createdAt || 0);
      const expirationDate = new Date(createdDate);
      expirationDate.setDate(expirationDate.getDate() + validity);
      expiredAt = expirationDate.toISOString();
    }

    return {
      status: 'EXPIRED',
      remaining: 0,
      total: totalData,
      remaining_voice: 0,
      total_voice: totalVoice,
      remaining_text: 0,
      total_text: totalText,
      is_unlimited: isUnlimited,
      expired_at: expiredAt,
      fromStoredData: true
    };
  }, []);


  const router = useRouter();
  const searchParams = useSearchParams();

  // Memoize language detection to avoid recreating on every render
  const currentLanguage = useMemo(() => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  }, [locale, pathname]);
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDropdown && !event.target.closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  // Load referral stats
  const loadReferralStats = useCallback(async () => {
    if (!currentUser) return;

    try {
      const stats = await getReferralStats(currentUser.id);

      if (stats.referralCode) {
        setReferralStats(stats);
      } else {
        // Create referral code if user doesn't have one
        const result = await createReferralCode(currentUser.id, currentUser.email);
        if (result.success) {
          // Reload stats after creating code
          const newStats = await getReferralStats(currentUser.id);
          setReferralStats(newStats);
        }
      }
    } catch (error) {
      // Silently fail - referral stats are not critical for dashboard functionality
      // Keep default stats state
    }
  }, [currentUser]);

  // Check for access denied error
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'access_denied') {
      // Show access denied message
    }
  }, [searchParams]);

  // Extract country/region information from order data directly
  // Memoized as useCallback since it's a pure function with no dependencies
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const extractLocationInfo = useCallback((data) => {
    // PRIORITY 0: Check for direct country_code and country_region fields (from server-side order creation)
    if (data.country_code && data.country_region) {
      return {
        code: data.country_code.toUpperCase(),
        name: data.country_region,
        isRegional: data.is_regional || false
      };
    }

    // Known regions mapping (handles variations like "Asialink" -> "Asia")
    const regionMapping = {
      'asia': 'Asia',
      'asialink': 'Asia',
      'europe': 'Europe',
      'eurolink': 'Europe',
      'africa': 'Africa',
      'global': 'Global',
      'americas': 'Americas',
      'oceania': 'Oceania',
      'middle east': 'Middle East',
      'caribbean': 'Caribbean',
      'latin america': 'Latin America'
    };

    const knownRegions = Object.values(regionMapping);

    // Helper to normalize region name
    const normalizeRegion = (name) => {
      if (!name) return null;
      const lower = name.toLowerCase().trim();
      // Direct match
      if (regionMapping[lower]) return regionMapping[lower];
      // Check if starts with known region
      for (const [key, value] of Object.entries(regionMapping)) {
        if (lower.startsWith(key)) return value;
      }
      return null;
    };

    // Helper to extract location from plan name like "Asia - 500 MB - 3 Days"
    const extractFromPlanName = (name) => {
      if (!name) return null;

      // Split by " - " (with spaces)
      const nameParts = name.split(' - ');
      if (nameParts.length >= 2) {
        const location = nameParts[0].trim();
        // Check if it's a clean region/country name (no data amounts)
        if (!location.match(/\d+\s*(MB|GB)/i)) {
          const normalized = normalizeRegion(location);
          return normalized || location;
        }
      }

      // If format is "Asialink-500 MB - 3 Days" (no space around first dash)
      // Try to extract the operator/region prefix
      const operatorMatch = name.match(/^([A-Za-z]+)[-\s]/);
      if (operatorMatch) {
        const normalized = normalizeRegion(operatorMatch[1]);
        if (normalized) return normalized;
      }

      return null;
    };

    // 1. PRIORITY: Use planName which usually has correct format "Asia - 500 MB - 3 Days"
    if (data.planName) {
      const location = extractFromPlanName(data.planName);
      if (location) {
        const isKnownRegion = knownRegions.includes(location);
        return {
          code: location.toUpperCase().replace(/\s+/g, ''),
          name: location,
          isRegional: isKnownRegion
        };
      }
    }

    // 2. Try customerName (often same as planName)
    if (data.customerName) {
      const location = extractFromPlanName(data.customerName);
      if (location) {
        const isKnownRegion = knownRegions.includes(location);
        return {
          code: location.toUpperCase().replace(/\s+/g, ''),
          name: location,
          isRegional: isKnownRegion
        };
      }
    }

    // 3. Try explicit country_region field (like PlanSelectionBottomSheet does)
    const regionName = data.country_region ||
      data.orderData?.country_region ||
      data.region_type ||
      data.orderData?.region_type;

    if (regionName) {
      const normalized = normalizeRegion(regionName) || regionName;
      return {
        code: normalized.toUpperCase().replace(/\s+/g, ''),
        name: normalized,
        isRegional: true
      };
    }

    // 4. Try country_code (e.g., "asia", "de", "us")
    const countryCode = data.countryCode ||
      data.country_code ||
      data.orderData?.country_code ||
      data.orderResult?.countryCode;

    if (countryCode) {
      const normalized = normalizeRegion(countryCode);
      if (normalized) {
        return {
          code: countryCode.toUpperCase(),
          name: normalized,
          isRegional: true
        };
      }
      // Not a known region, it's a country code
      return {
        code: countryCode.toUpperCase(),
        name: countryCode.toUpperCase(), // Will be replaced by country name if available
        isRegional: false
      };
    }

    // 5. Try country_name
    const countryName = data.countryName ||
      data.country_name ||
      data.orderData?.country_name ||
      data.orderResult?.countryName;

    if (countryName) {
      const normalized = normalizeRegion(countryName);
      return {
        code: (normalized || countryName).toUpperCase().replace(/\s+/g, ''),
        name: normalized || countryName,
        isRegional: !!normalized
      };
    }

    // 6. Last resort: try to extract from orderData.package
    if (data.orderData?.package) {
      const location = extractFromPlanName(data.orderData.package);
      if (location) {
        const isKnownRegion = knownRegions.includes(location);
        return {
          code: location.toUpperCase().replace(/\s+/g, ''),
          name: location,
          isRegional: isKnownRegion
        };
      }
    }

    return null;
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        return;
      }

      try {
        // Load referral stats
        await loadReferralStats();

        // Fetch orders from Supabase orders table
        const supabase = getSupabase();
        const { data: esimsData, error: esimsError } = await supabase
          .from('orders')
          .select('*')
          .eq('user_id', currentUser.id)
          .not('status', 'in', '("deleted","payment_mismatch","blocked","failed")');

        if (esimsError) throw esimsError;

        const ordersData = await Promise.all((esimsData || [])
          .filter(data => {
            // Filter out soft-deleted orders
            if (data.deleted_at !== null && data.deleted_at !== undefined) return false;
            return true;
          })
          .map(async (data) => {
            try {
              const docId = data.id;

              // Extract QR code data from order_data.sims[0] structure (Airalo format)
              const simData = data.order_data?.sims?.[0];

              // Use the shared utility to map SIM data consistently
              const mappedQrData = simData ? mapAiraloSimData(simData) : null;

              // Determine the correct status - prioritize completed status for orders with eSIM data
              let orderStatus = data.status || 'pending';
              const hasQrData = mappedQrData || data.qr_code;
              if (hasQrData && (data.payment_status === 'paid' || data.payment_status === 'succeeded' || data.payment_status === 'completed')) {
                orderStatus = 'active'; // Mark as active if we have eSIM data and payment is complete
              }

              // Extract country/region information using shared utility
              const countryData = mapPackageCountryData(data);
              let countryCodeFromData = countryData?.countryCode || null;
              let countryNameFromData = countryData?.countryName || null;
              let isRegionalPlan = countryData?.isRegional || false;

              // Fallback: Use extractLocationInfo if direct fields not available
              if (!countryCodeFromData || !countryNameFromData) {
                const locationInfo = extractLocationInfo(data);
                countryCodeFromData = locationInfo?.code || 'GLOBAL';
                countryNameFromData = locationInfo?.name || 'Global';
                isRegionalPlan = locationInfo?.isRegional || false;
              }

              // Extract plan details using shared utility
              const planData = data.order_data || {};
              const mappedPlanDetails = mapPlanDetails(planData);

              // Merge with direct fields from data if available
              const planDetails = {
                ...mappedPlanDetails,
                data: mappedPlanDetails.data || data.data,
                dataAmountMb: mappedPlanDetails.dataAmountMb || data.data_amount_mb || data.capacity,
                validity: mappedPlanDetails.validity || data.validity,
                sms: mappedPlanDetails.sms || data.sms || 0,
                voice: mappedPlanDetails.voice || data.voice_minutes || 0,
                operator: mappedPlanDetails.operator || data.operator,
                isUnlimited: mappedPlanDetails.isUnlimited || data.is_unlimited || false
              };

              // Installation instructions from orderData
              const installationGuides = planData.installation_guides || {};
              const manualInstallation = planData.manual_installation || '';
              const qrcodeInstallation = planData.qrcode_installation || '';
              const apnInfo = simData?.apn || planData.apn || {};

              // Extract plan title
              const packageSlug = data.order_data?.package_id ||
                data.order_data?.package ||
                data.package_id ||
                data.plan_id ||
                docId;
              let displayPlanName = data.plan_name || planData.package || packageSlug || 'Unknown Plan';

              // Build QR code object with all formats for complete compatibility
              const qrCodeObject = mappedQrData ? {
                ...mappedQrData,
                isReal: true
              } : {
                // Fallback for orders with direct qr_code fields (snake_case from orders table)
                qr_code: data.qr_code || data.lpa,
                qr_code_url: data.qr_code_url,
                direct_apple_installation_url: data.direct_apple_installation_url || data.qr_code_url,
                iccid: data.iccid,
                matching_id: data.matching_id,
                activation_code: data.activation_code,
                // camelCase aliases for component compatibility
                qrCode: data.qr_code || data.lpa,
                qrCodeUrl: data.qr_code_url,
                directAppleInstallationUrl: data.direct_apple_installation_url || data.qr_code_url,
                lpa: data.lpa || data.qr_code,
                matchingId: data.matching_id,
                activationCode: data.activation_code,
                isReal: !!(data.qr_code || data.lpa)
              };

              return {
                id: docId,
                ...data,
                // Normalized fields for components
                orderId: data.airalo_order_id || docId,
                airaloOrderId: data.airalo_order_id,
                planName: displayPlanName,
                amount: data.amount || data.price || 0,
                status: orderStatus,
                paymentStatus: data.payment_status || 'unknown',
                customerEmail: data.customer_email || currentUser.email,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
                // Map country/region information (both formats)
                countryCode: countryCodeFromData,
                countryName: countryNameFromData,
                isRegional: isRegionalPlan,
                country_code: countryCodeFromData?.toLowerCase(),
                country_region: countryNameFromData,
                is_regional: isRegionalPlan,
                packageSlug: packageSlug,
                // Plan details for display
                planDetails: planDetails,
                // Installation instructions
                installation: {
                  guides: installationGuides,
                  manual: manualInstallation,
                  qrcode: qrcodeInstallation,
                  apn: apnInfo
                },
                // QR code data (with all formats for compatibility)
                qrCode: qrCodeObject,
                // Include the raw order_data for reference
                airaloOrderData: data.order_data
              };
            } catch {
              return null;
            }
          })); // Use Promise.all for async map

        const filteredOrders = ordersData.filter(Boolean); // Remove null entries

        // CRITICAL: Sort orders by creation date (newest first)
        const sortedOrders = filteredOrders.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // Newest first
        });


        const visibleOrders = sortedOrders.filter(o => {
          const paid = (o.paymentStatus === 'paid' || o.paymentStatus === 'succeeded' || o.paymentStatus === 'completed');
          const completed = (o.status === 'completed' || o.status === 'active');
          return paid || completed;
        });

        setOrders(visibleOrders);
      } catch {
        // Set empty orders array on error
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    const ensureUserProfile = async () => {
      if (!currentUser) return;

      // If we already have the profile from AuthContext, we don't need to check/create it
      // This prevents redundant fetches and potential errors
      if (userProfile) {
        return;
      }

      try {
        const supabase = getSupabase();
        // Check if user profile exists
        const { data: userDoc, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (error || !userDoc) {
          // Create user profile if it doesn't exist
          await supabase.from('users').upsert({
            id: currentUser.id,
            email: currentUser.email,
            display_name: currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || '',
            created_at: new Date().toISOString(),
            role: 'customer'
          });
          await loadUserProfile();
        } else {
          await loadUserProfile();
        }
      } catch (error) {
        toast.error('Failed to fetch user data');
      }
    };

    ensureUserProfile();
    fetchData();
  }, [currentUser, loadUserProfile, loadReferralStats]);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!authLoading && !currentUser) {
      // Get the appropriate login URL for the current language
      const loginUrl = currentLanguage === 'en' ? '/login' : `/${currentLanguage}/login`;
      router.push(loginUrl);
    }
  }, [authLoading, currentUser, router, currentLanguage]);

  // Preload usage data for visible eSIMs (for card previews)
  // OPTIMIZED: First checks stored data to determine if eSIM is expired
  // - Expired eSIMs: Use synthetic data (no API call needed)
  // - Active eSIMs: Fetch real-time usage from Airalo API
  useEffect(() => {
    if (orders.length === 0) return;

    let isCancelled = false;

    const preloadUsageData = async () => {
      // Get orders with ICCIDs
      const ordersWithIccid = orders
        .filter(o => o.status === 'active' || o.status === 'completed')
        .map(o => ({
          iccid: o.qrCode?.iccid || o.iccid || o.airaloOrderData?.sims?.[0]?.iccid,
          order: o
        }))
        .filter(item => item.iccid && !usageCache[item.iccid]);

      if (ordersWithIccid.length === 0) return;

      // STEP 1: Categorize eSIMs as expired vs active based on stored data
      const expiredOrders = [];
      const activeOrders = [];

      for (const item of ordersWithIccid) {
        const expirationCheck = checkEsimExpiration(item.order, usageCache[item.iccid]);
        if (expirationCheck.isExpired) {
          expiredOrders.push({ ...item, expirationCheck });
        } else {
          activeOrders.push(item);
        }
      }

      // STEP 2: For expired eSIMs - use synthetic data (instant, no API call)
      if (expiredOrders.length > 0 && !isCancelled) {
        const expiredUsageUpdates = {};
        for (const { iccid, order, expirationCheck } of expiredOrders) {
          // Use cached data if available, otherwise create synthetic expired data
          const usageData = expirationCheck.cachedUsage || createExpiredUsageData(order);
          expiredUsageUpdates[iccid] = usageData;
        }
        setUsageCache(prev => ({ ...prev, ...expiredUsageUpdates }));
      }

      // STEP 3: For active eSIMs - fetch real-time usage from API
      const ordersToFetch = activeOrders.slice(0, 5); // Limit API calls

      if (ordersToFetch.length === 0) return;

      // Mark active eSIMs as loading
      const iccidsToLoad = ordersToFetch.map(item => item.iccid);
      setLoadingUsageMap(prev => {
        const newMap = { ...prev };
        iccidsToLoad.forEach(iccid => { newMap[iccid] = true; });
        return newMap;
      });

      // Load sequentially with delay to avoid auth rate limiting
      for (const { iccid, order } of ordersToFetch) {
        if (isCancelled) break;

        try {
          const result = await esimService.getEsimUsageByIccid(iccid);
          if (result.success && !isCancelled) {
            // Combine usage data with package details from the order
            const planDetails = order.planDetails || {};
            const airaloOrderData = order.airaloOrderData || {};
            const simData = airaloOrderData.sims?.[0] || {};

            const totalVoice = planDetails.voice || simData.voice || airaloOrderData.voice || 0;
            const totalText = planDetails.sms || simData.text || airaloOrderData.text || 0;
            const isUnlimited = planDetails.isUnlimited || airaloOrderData.is_unlimited || result.data?.is_unlimited || false;
            const totalData = result.data?.total || planDetails.dataAmountMb || simData.data_amount_mb || 0;

            const combinedUsageData = {
              ...result.data,
              total: result.data?.total || totalData,
              total_voice: result.data?.total_voice || totalVoice,
              total_text: result.data?.total_text || totalText,
              is_unlimited: isUnlimited,
            };

            setUsageCache(prev => ({ ...prev, [iccid]: combinedUsageData }));
          } else if (result.statusCode === 429) {
            // Rate limited - stop preloading
            break;
          }
        } catch (error) {
          // If rate limited, stop trying
          if (error.message?.includes('429') || error.message?.includes('Too Many')) {
            break;
          }
        } finally {
          if (!isCancelled) {
            setLoadingUsageMap(prev => ({ ...prev, [iccid]: false }));
          }
        }

        // Wait 3 seconds between requests to avoid auth rate limiting
        if (!isCancelled) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    };

    // Delay preload to not block initial render
    const timer = setTimeout(preloadUsageData, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [orders, checkEsimExpiration, createExpiredUsageData]); // Include helper functions in deps

  // Show skeleton while auth is loading or data is loading
  if (authLoading || loading) {
    return <DashboardSkeleton />;
  }

  // Show skeleton while redirecting (prevents empty flash)
  if (!currentUser) {
    return <DashboardSkeleton />;
  }

  // Active orders count (used for future stats display)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const activeOrdersCount = orders.filter(order => {
    if (!order) return false;
    return order.status === 'active' ||
      order.status === 'completed' ||
      (order.qrCode?.isReal && (order.paymentStatus === 'completed' || order.paymentStatus === 'paid'));
  }).length;


  const handleViewQRCode = async (order) => {
    try {
      setSelectedOrder(order);
      setShowQRModal(true);

      // Check if we already have QR code data in the order (multiple formats for compatibility)
      const hasQrCode = order.qrCode && (
        (typeof order.qrCode === 'string' && order.qrCode.length > 0) ||
        (typeof order.qrCode === 'object' && (order.qrCode.qrCode || order.qrCode.qrCodeUrl || order.qrCode.directAppleInstallationUrl))
      );

      const hasOtherQrData = order.directAppleInstallationUrl || order.qrCodeUrl || order.iccid;

      if (hasQrCode || hasOtherQrData) {
        let qrCodeData;

        if (typeof order.qrCode === 'object') {
          qrCodeData = order.qrCode;
        } else {
          qrCodeData = {
            qrCode: order.qrCode || order.directAppleInstallationUrl,
            qrCodeUrl: order.qrCodeUrl,
            directAppleInstallationUrl: order.directAppleInstallationUrl,
            iccid: order.iccid,
            lpa: order.lpa,
            matchingId: order.matchingId,
            activationCode: order.activationCode,
            isReal: true
          };
        }

        setSelectedOrder(prev => ({ ...prev, qrCode: qrCodeData }));
      } else {
        // Retrieve QR code from API (this will now allow multiple retrievals)
        const qrResult = await generateQRCode(order.orderId || order.id, order.planName);
        setSelectedOrder(prev => ({ ...prev, qrCode: qrResult }));
      }
    } catch {
      toast.error('Failed to open QR modal');
    }
  };

  const generateQRCode = async (orderId, planName, retryCount = 0) => {
    try {
      // Try to get real QR code from Airalo API

      const qrCodeResult = await esimService.getEsimQrCode(orderId);

      if (qrCodeResult.success && qrCodeResult.qrCode) {
        return {
          qrCode: qrCodeResult.qrCode,
          qrCodeUrl: qrCodeResult.qrCodeUrl,
          directAppleInstallationUrl: qrCodeResult.directAppleInstallationUrl,
          iccid: qrCodeResult.iccid,
          lpa: qrCodeResult.lpa,
          matchingId: qrCodeResult.matchingId,
          activationCode: qrCodeResult.activationCode,
          smdpAddress: qrCodeResult.smdpAddress,
          orderDetails: qrCodeResult.orderDetails,
          simDetails: qrCodeResult.simDetails,
          fromCache: qrCodeResult.fromCache || false,
          canRetrieveMultipleTimes: qrCodeResult.canRetrieveMultipleTimes || false,
          isReal: true
        };
      } else {
        throw new Error('No QR code data received');
      }
    } catch (error) {

      // If this is a "not ready yet" error and we haven't retried too many times, retry
      if ((error.message || '').includes('not available yet') && retryCount < 3) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        return generateQRCode(orderId, planName, retryCount + 1);
      }

      // Fallback to simple data string
      const qrData = `eSIM:${orderId || 'unknown'}|Plan:${planName || 'unknown'}|Status:Active`;
      return {
        qrCode: qrData,
        isReal: false,
        fallbackReason: error.message,
        canRetry: true
      };
    }
  };

  // Update order with correct country information from Airalo API response
  const updateOrderCountryInfo = async (order, esimDetails) => {
    try {
      if (!esimDetails) return;

      // Extract country info from Airalo API response
      const countryCode = esimDetails.package?.country_code || esimDetails.country_code;
      const countryName = esimDetails.package?.country?.name || esimDetails.country_name;

      if (!countryCode) {
        return;
      }

      // Check if country info needs updating
      const currentCountryCode = order.countryCode;
      const currentCountryName = order.countryName;

      if (currentCountryCode === countryCode && currentCountryName === countryName) {
        return;
      }

      // Update the order in Supabase (via API to respect RLS — service_role required)
      await fetch('/api/orders/update-country', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          country_code: countryCode.toLowerCase(),
          country_region: countryName
        })
      });

      // Update local state
      setOrders(prevOrders =>
        prevOrders.map(o =>
          o.id === order.id ? { ...o, countryCode: countryCode.toUpperCase(), countryName: countryName } : o
        )
      );

      toast.success(t('dashboard.countryInfoUpdated', 'Country info updated: {{name}} ({{code}})', { name: countryName, code: countryCode }), {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });

    } catch (error) {
      toast.error(t('dashboard.failedToUpdateCountryInfo', 'Failed to update country info: {{error}}', { error: error.message }), {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
    }
  };


  const handleCheckEsimDetails = async () => {
    if (!selectedOrder || loadingEsimDetails) return;

    try {
      setLoadingEsimDetails(true);

      // Get ICCID from the order
      const iccid = selectedOrder.qrCode?.iccid || selectedOrder.iccid;

      if (!iccid) {
        toast.error(t('dashboard.noIccidFound', 'No ICCID found in this order. Cannot check eSIM details.'));
        return;
      }

      const result = await esimService.getEsimDetailsByIccid(iccid);

      if (result.success) {
        setEsimDetails(result.data);

        // Update country info if needed
        await updateOrderCountryInfo(selectedOrder, result.data);
      } else {
        toast.error(t('dashboard.failedToGetDetails', 'Failed to get eSIM details. Please try again later.'));
      }
    } catch (error) {
      console.error('[Dashboard] Error getting eSIM details:', error);

      // Handle specific error types
      if (error.message?.includes('Authentication') || error.message?.includes('Unauthorized')) {
        toast.error(t('dashboard.detailsAuthError', 'Unable to connect to eSIM provider. Please try again later.'), {
          duration: 5000,
        });
      } else if (error.message?.includes('not found') || error.message?.includes('404')) {
        toast.error(t('dashboard.esimNotFound', 'eSIM not found. It may have expired or been deactivated.'));
      } else {
        toast.error(t('dashboard.failedToCheckDetails', 'Failed to check eSIM details. Please try again.'));
      }
    } finally {
      setLoadingEsimDetails(false);
    }
  };

  const handleDeleteOrder = async (order) => {
    if (!currentUser || !order) return;

    // Confirmation dialog
    const confirmed = window.confirm(
      t('dashboard.confirmDelete', 'Are you sure you want to delete this eSIM? This action cannot be undone.')
    );

    if (!confirmed) return;

    try {
      // Soft delete via API route (service_role required — RLS blocks direct client updates)
      const deleteResponse = await fetch('/api/orders/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete order');
      }

      // Update local state - remove from orders list
      setOrders(prevOrders => prevOrders.filter(o => o.id !== order.id));

      toast.success(t('dashboard.orderDeleted', 'eSIM deleted successfully'), {
        duration: 3000,
        style: {
          background: '#10B981',
          color: '#fff',
        },
      });

    } catch (error) {
      toast.error(t('dashboard.deleteOrderError', 'Failed to delete eSIM: {{error}}', { error: error.message }), {
        duration: 4000,
        style: {
          background: '#EF4444',
          color: '#fff',
        },
      });
    }
  };

  const handleCheckEsimUsage = async () => {
    if (!selectedOrder || loadingEsimUsage) return;

    try {
      setLoadingEsimUsage(true);

      // Get ICCID from the order
      const iccid = selectedOrder.qrCode?.iccid || selectedOrder.iccid;

      if (!iccid) {
        toast.error(t('dashboard.noIccidFoundUsage', 'No ICCID found in this order. Cannot check eSIM usage.'));
        return;
      }

      // Serve cached usage if available
      if (usageCache[iccid]) {
        setEsimUsage(usageCache[iccid]);
        return;
      }

      // OPTIMIZATION: Check if eSIM is expired before making API call
      const expirationCheck = checkEsimExpiration(selectedOrder, null);
      if (expirationCheck.isExpired) {
        // Use synthetic data for expired eSIMs
        const expiredUsageData = createExpiredUsageData(selectedOrder);
        setEsimUsage(expiredUsageData);
        setUsageCache(prev => ({ ...prev, [iccid]: expiredUsageData }));
        toast.success(t('dashboard.esimExpiredData', 'This eSIM has expired. Showing stored data.'));
        return;
      }

      const result = await esimService.getEsimUsageByIccid(iccid);

      if (result.success) {
        // Combine usage data from Airalo API with package details from the order
        // The usage API returns: remaining, total, remaining_voice, remaining_text, status, expired_at
        // But it doesn't return: total_voice, total_text, is_unlimited (these come from the package)
        const planDetails = selectedOrder.planDetails || {};
        const airaloOrderData = selectedOrder.airaloOrderData || {};
        const simData = airaloOrderData.sims?.[0] || {};

        // Get total voice/text from stored order data
        const totalVoice = planDetails.voice || simData.voice || airaloOrderData.voice || 0;
        const totalText = planDetails.sms || simData.text || airaloOrderData.text || 0;
        const isUnlimited = planDetails.isUnlimited || airaloOrderData.is_unlimited || result.data?.is_unlimited || false;

        // Get total data from order if API didn't return it
        const totalData = result.data?.total || planDetails.dataAmountMb || simData.data_amount_mb || 0;

        const combinedUsageData = {
          ...result.data,
          // Ensure total is set even if API didn't return it
          total: result.data?.total || totalData,
          // Add total_voice and total_text from package data (not returned by usage API)
          total_voice: result.data?.total_voice || totalVoice,
          total_text: result.data?.total_text || totalText,
          is_unlimited: isUnlimited,
        };

        setEsimUsage(combinedUsageData);
        setUsageCache(prev => ({ ...prev, [iccid]: combinedUsageData }));

      } else {
        // Handle specific error cases
        if (result.isUnsupported) {
          toast.error(t('dashboard.usageNotSupported', 'Usage tracking is not available for this eSIM package.'), {
            duration: 5000,
          });
        } else if (result.statusCode === 429) {
          toast.error(t('dashboard.rateLimited', 'Please wait before checking again. Usage data can only be checked once every 15 minutes.'), {
            duration: 5000,
          });
        } else if (result.statusCode === 401 || result.statusCode === 403) {
          toast.error(t('dashboard.usageAuthFailed', 'Usage temporarily unavailable. Please try again later.'));
        } else {
          toast.error(t('dashboard.failedToGetEsimUsage', 'Failed to get eSIM usage: {{error}}', { error: result.error }));
        }
      }
    } catch (error) {
      console.error('[Dashboard] Usage fetch error:', error);
      toast.error(t('dashboard.failedToCheckUsage', 'Failed to check eSIM usage. Please try again.'));
    } finally {
      setLoadingEsimUsage(false);
    }
  };




  return (
    <div className="min-h-screen bg-white flex flex-col transition-opacity duration-150 opacity-100" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Access Denied Alert */}
      <AccessDeniedAlert show={searchParams.get('error') === 'access_denied'} />

      <div className="relative isolate flex-1 flex flex-col">
        {/* Horizontal Lines */}
        <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200/70"></div>
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200/70"></div>

        {/* Header Section */}
        <DashboardHeader
          currentUser={currentUser}
          orders={orders}
        />

        {/* Recent Orders */}
        <RecentOrders
          orders={orders}
          loading={loading}
          onViewQRCode={handleViewQRCode}
          usageCache={usageCache}
          loadingUsageMap={loadingUsageMap}
          planMetadataMap={planMetadataMap}
          plansLoading={plansLoading}
        />
      </div>

      {/* QR Code Modal - Now unified with details and usage */}
      <QRCodeModal
        show={showQRModal}
        selectedOrder={selectedOrder}
        onClose={() => {
          setShowQRModal(false);
          setEsimUsage(null);
          setEsimDetails(null);
        }}
        onCheckEsimDetails={handleCheckEsimDetails}
        onCheckEsimUsage={handleCheckEsimUsage}
        loadingEsimDetails={loadingEsimDetails}
        loadingEsimUsage={loadingEsimUsage}
        onDeleteOrder={handleDeleteOrder}
        esimUsage={esimUsage}
        esimDetails={esimDetails}
        planMetadata={selectedOrder ? planMetadataMap[selectedOrder.packageSlug || selectedOrder.package_id || selectedOrder.plan_id] : null}
      />

      {/* Referral Bottom Sheet */}
      <ReferralBottomSheet
        isOpen={showReferralSheet}
        onClose={() => setShowReferralSheet(false)}
      />
    </div>
  );
};

export default Dashboard;