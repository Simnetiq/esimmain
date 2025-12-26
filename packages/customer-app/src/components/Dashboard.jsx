'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { collection, query, getDocs, doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { esimService } from '@esim/shared/services/esimService';
import { getReferralStats, createReferralCode } from '@esim/shared/services/referralService';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import {
  mapAiraloSimData,
  mapPackageCountryData,
  mapPlanDetails
} from '@esim/shared/utils/esimFieldMapper';
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

// Grid pattern style for skeleton
const gridPatternStyle = {
  backgroundSize: '10px 10px',
  backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
};

// Dashboard Skeleton Component - matches exact DashboardHeader + RecentOrders dimensions
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-white flex flex-col relative overflow-hidden">
    {/* Grid Pattern */}
    <div className="hidden xl:block absolute left-0 top-0 bottom-0 w-32 pointer-events-none" style={gridPatternStyle} />
    <div className="hidden xl:block absolute right-0 top-0 bottom-0 w-32 pointer-events-none" style={gridPatternStyle} />

    <div className="relative isolate flex-1 flex flex-col">
      {/* Horizontal Lines */}
      <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200/70" />
      <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200/70" />

      {/* Header Section Skeleton - exact match to DashboardHeader */}
      <div className="bg-white">
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full lg:mt-20 mt-10">
            <div className="px-4 pt-6 lg:pt-0 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              {/* Subtitle skeleton */}
              <div className="h-4 w-80 max-w-full bg-gray-200 rounded animate-pulse" />

              {/* Title skeleton */}
              <div className="h-8 sm:h-9 lg:h-10 w-72 max-w-full bg-gray-200 rounded animate-pulse my-4" />

              {/* Divider */}
              <div className="w-full h-px bg-gray-200 my-4" />

              {/* Stats Line skeleton */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                {/* Stat 1 - Total Orders */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-4 w-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-200 hidden sm:block" />

                {/* Stat 2 - Active eSIMs */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-4 w-6 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>

                <div className="w-px h-8 bg-gray-200 hidden sm:block" />

                {/* Stat 3 - Total Spent */}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
                  <div>
                    <div className="h-3 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Quick Actions skeleton */}
              <div className="mt-6">
                <div className="flex flex-wrap gap-3">
                  <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-10 w-36 bg-gray-100 rounded-lg animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Full width gray line */}
        <div className="w-full h-px bg-gray-100 mt-6" />
      </div>

      {/* Recent Orders Section Skeleton - exact match to RecentOrders */}
      <div className="bg-white flex-1">
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              {/* Section title skeleton */}
              <div className="h-7 w-36 bg-gray-200 rounded animate-pulse mb-6" />

              {/* Empty state / Loading indicator */}
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


  // Affiliate data (used by setReferralStats, will be used in future referral UI)
  const [, setReferralStats] = useState({
    referralCode: null,
    usageCount: 0,
    totalEarnings: 0,
    isActive: false
  });


  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current language for RTL detection
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
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
      const stats = await getReferralStats(currentUser.uid);

      if (stats.referralCode) {
        setReferralStats(stats);
      } else {
        // Create referral code if user doesn't have one
        const result = await createReferralCode(currentUser.uid, currentUser.email);
        if (result.success) {
          // Reload stats after creating code
          const newStats = await getReferralStats(currentUser.uid);
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
  const extractLocationInfo = (data) => {
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
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) {
        return;
      }

      try {
        // Load referral stats
        await loadReferralStats();

        // Fetch eSIMs from mobile app collection structure (users/{userId}/esims)
        // Note: We can't use where('deleted', '!=', true) because it excludes documents without the field
        // Instead, we fetch all and filter in memory
        const esimsQuery = query(
          collection(db, 'users', currentUser.uid, 'esims')
        );

        const esimsSnapshot = await getDocs(esimsQuery);

        const ordersData = await Promise.all(esimsSnapshot.docs
          .filter(doc => {
            // Filter out deleted orders (only if explicitly marked as deleted)
            const data = doc.data();
            if (data.deleted === true) return false;

            // Filter out test/sandbox orders to prevent 404 errors in production
            // Test orders don't exist in production Airalo API
            if (data.isTestMode === true || data.mode === 'sandbox' || data.test === true) {
              return false;
            }

            return true;
          })
          .map(async doc => {
            try {
              const data = doc.data();

              // Extract QR code data from orderData.sims[0] structure (Airalo format)
              // Use both direct fields and nested structure for compatibility
              const simData = data.orderData?.sims?.[0] || data.simData;

              // Use the shared utility to map SIM data consistently
              const mappedQrData = simData ? mapAiraloSimData(simData) : null;

              // Determine the correct status - prioritize completed status for orders with eSIM data
              let orderStatus = data.status || 'pending';
              const hasQrData = mappedQrData || data.qrCode || data.qr_code;
              if (hasQrData && (data.paymentStatus === 'completed' || data.paymentStatus === 'paid')) {
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
              const planData = data.orderData || data.planDetails || {};
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
              const packageSlug = data.orderData?.package_id ||
                data.orderData?.package ||
                data.packageId ||
                data.planId ||
                doc.id;
              let displayPlanName = data.planName || planData.package || data.customerName || packageSlug || 'Unknown Plan';

              // Build QR code object with all formats for complete compatibility
              const qrCodeObject = mappedQrData ? {
                ...mappedQrData,
                isReal: true
              } : {
                // Fallback for orders with direct fields (both formats)
                qr_code: data.qr_code || data.qrCode || data.lpa,
                qr_code_url: data.qr_code_url || data.qrCodeUrl,
                direct_apple_installation_url: data.direct_apple_installation_url || data.directAppleInstallationUrl || data.qr_code_url || data.qrCodeUrl,
                iccid: data.iccid,
                matching_id: data.matching_id || data.matchingId,
                activation_code: data.activation_code || data.activationCode,
                // camelCase aliases
                qrCode: data.qrCode || data.qr_code || data.lpa,
                qrCodeUrl: data.qrCodeUrl || data.qr_code_url,
                directAppleInstallationUrl: data.directAppleInstallationUrl || data.direct_apple_installation_url || data.qrCodeUrl || data.qr_code_url,
                lpa: data.lpa || data.qrCode || data.qr_code,
                matchingId: data.matchingId || data.matching_id,
                activationCode: data.activationCode || data.activation_code,
                isReal: !!(data.qrCode || data.qr_code || data.lpa)
              };

              return {
                id: doc.id,
                ...data,
                // Map mobile app fields to web app expected fields
                orderId: data.orderResult?.orderId || data.order_id || data.orderId || doc.id,
                airaloOrderId: data.airaloOrderId || planData.id,
                planName: displayPlanName,
                amount: data.amount || data.price || data.orderResult?.price || planData.price || 0,
                status: orderStatus,
                paymentStatus: data.paymentStatus || data.orderResult?.paymentStatus || 'unknown',
                customerEmail: data.customerEmail || data.userEmail || currentUser.email,
                createdAt: data.createdAt || data.created_at,
                updatedAt: data.updatedAt || data.updated_at,
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
                // Include the raw orderData for reference
                airaloOrderData: data.orderData
              };
            } catch {
              return null;
            }
          })); // Use Promise.all for async map

        const filteredOrders = ordersData.filter(Boolean); // Remove null entries

        // CRITICAL: Sort orders by creation date (newest first)
        const sortedOrders = filteredOrders.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || a.createdAt || new Date(0);
          const dateB = b.createdAt?.toDate?.() || b.createdAt || new Date(0);
          return dateB - dateA; // Newest first
        });


        const visibleOrders = sortedOrders.filter(o => {
          const paid = (o.paymentStatus === 'completed' || o.paymentStatus === 'paid');
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

      if (!db) {
        return;
      }

      try {
        // Check if user profile exists
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // Create user profile if it doesn't exist
          await setDoc(userDocRef, {
            email: currentUser.email,
            displayName: currentUser.displayName || 'Unknown User',
            createdAt: new Date(),
            role: 'customer'
          });
          // Reload user profile after creating it
          await loadUserProfile();
        } else {
          // Force reload profile in case it wasn't loaded
          await loadUserProfile();
        }
      } catch (error) {
        // Only show toast if it's not a permission error or if we really need to know
        if (error.code !== 'permission-denied') {
          toast.error('Failed to fetch user data');
        }
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
  // Loads usage data sequentially with delays to avoid Airalo API rate limiting
  // The Airalo API has a rate limit of 100 requests/minute per ICCID with 20-minute cache
  // But authentication has a separate stricter limit, so we space out requests more
  useEffect(() => {
    if (orders.length === 0) return;

    let isCancelled = false;

    const preloadUsageData = async () => {
      // Get orders with ICCIDs that need usage data
      const ordersToLoad = orders
        .filter(o => o.status === 'active' || o.status === 'completed')
        .map(o => ({
          iccid: o.qrCode?.iccid || o.iccid || o.airaloOrderData?.sims?.[0]?.iccid,
          order: o
        }))
        .filter(item => item.iccid && !usageCache[item.iccid])
        .slice(0, 5); // Limit to 5 eSIMs to reduce auth rate limit hits

      if (ordersToLoad.length === 0) return;


      // Mark ALL eSIMs as loading at once for better UX (skeleton shows on all cards together)
      const iccidsToLoad = ordersToLoad.map(item => item.iccid);
      setLoadingUsageMap(prev => {
        const newMap = { ...prev };
        iccidsToLoad.forEach(iccid => { newMap[iccid] = true; });
        return newMap;
      });

      // Load sequentially with longer delay to avoid auth rate limiting
      for (const { iccid, order } of ordersToLoad) {
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
            // Rate limited - stop preloading and wait longer
            break;
          }
        } catch (error) {
          // If we hit a rate limit error, stop trying
          if (error.message?.includes('429') || error.message?.includes('Too Many')) {
            break;
          }
        } finally {
          if (!isCancelled) {
            setLoadingUsageMap(prev => ({ ...prev, [iccid]: false }));
          }
        }

        // Wait 3 seconds between requests to avoid auth rate limiting
        // Each request needs a fresh auth token, and auth has stricter limits
        if (!isCancelled) {
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    };

    // Delay preload more to not block initial render and give auth time to recover
    const timer = setTimeout(preloadUsageData, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [orders]); // Only depend on orders, not usageCache to avoid infinite loop

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

  // Update Firebase order with correct country information from Airalo API response
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

      // Update the order in Firebase
      const orderRef = doc(db, 'users', currentUser.uid, 'esims', order.id);
      await updateDoc(orderRef, {
        countryCode: countryCode.toUpperCase(),
        countryName: countryName,
        updatedAt: serverTimestamp(),
        countryUpdatedAt: serverTimestamp(),
        countryUpdateReason: 'Updated from Airalo API eSIM details'
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
      // Soft delete from user's esims subcollection
      const userOrderRef = doc(db, 'users', currentUser.uid, 'esims', order.id);
      await updateDoc(userOrderRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        status: 'deleted'
      });

      // Also soft delete from global orders collection (if it exists)
      try {
        const globalOrderRef = doc(db, 'orders', order.id);
        await updateDoc(globalOrderRef, {
          deleted: true,
          deletedAt: serverTimestamp(),
          deletedByUser: currentUser.uid,
          status: 'deleted'
        });
      } catch (globalError) {
        // Global order might not exist or already deleted - this is OK
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
        toast.success(t('dashboard.usageDataLoaded', 'Usage data loaded successfully'));
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
    <div className="min-h-screen bg-white flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Access Denied Alert */}
      <AccessDeniedAlert show={searchParams.get('error') === 'access_denied'} />

      <div className="relative isolate flex-1 flex flex-col">
        {/* Horizontal Lines */}
        <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200/70"></div>
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200/70"></div>

        {/* Grid Pattern - Left Side */}
        <div
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32 "
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

        {/* Grid Pattern - Right Side */}
        <div
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32 "
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

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