'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { collection, query, getDocs, doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { esimService } from '@esim/shared/services/esimService';
import { getReferralStats, createReferralCode } from '@esim/shared/services/referralService';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import toast from 'react-hot-toast';

// Dashboard Components
import AccessDeniedAlert from './dashboard/AccessDeniedAlert';
import DashboardHeader from './dashboard/DashboardHeader';
import RecentOrders from './dashboard/RecentOrders';
import AccountSettings from './dashboard/AccountSettings';
import QRCodeModal from './dashboard/QRCodeModal';
import EsimDetailsModal from './dashboard/EsimDetailsModal';
import EsimUsageModal from './dashboard/EsimUsageModal';
import ReferralBottomSheet from './ReferralBottomSheet';

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
  
  // Affiliate data
  const [referralStats, setReferralStats] = useState({
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
      console.error('Error loading referral stats:', error);
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
            return data.deleted !== true;
          })
          .map(async doc => {
          try {
            const data = doc.data();
            
            
            // Extract QR code data from orderData.sims[0] structure (Airalo format)
            const simData = data.orderData?.sims?.[0];
            const fullLpaString = simData?.qrcode || simData?.lpa;
            
            // Determine the correct status - prioritize completed status for orders with eSIM data
            let orderStatus = data.status || 'pending';
            if (simData && (data.paymentStatus === 'completed' || data.paymentStatus === 'paid')) {
              orderStatus = 'active'; // Mark as active if we have eSIM data and payment is complete
            }
            
            // Extract country/region information from orderData directly
            const packageSlug = data.orderData?.package_id || 
                               data.orderData?.package || 
                               data.packageId || 
                               data.planId || 
                               doc.id;
            
            // PRIORITY: Use direct country fields if available (from server-side order creation)
            // These are set by create-payment-order and coinbase/create-charge routes
            let countryCodeFromData = data.country_code?.toUpperCase() || null;
            let countryNameFromData = data.country_region || null;
            let isRegionalPlan = data.is_regional || false;
            
            // Debug logging
            console.log('📍 Order country data:', { 
              id: doc.id,
              country_code: data.country_code, 
              country_region: data.country_region,
              is_regional: data.is_regional,
              countryCodeFromData,
              countryNameFromData
            });
            
            // Fallback: Use extractLocationInfo if direct fields not available
            if (!countryCodeFromData || !countryNameFromData) {
              const locationInfo = extractLocationInfo(data);
              countryCodeFromData = locationInfo?.code || 'GLOBAL';
              countryNameFromData = locationInfo?.name || 'Global';
              isRegionalPlan = locationInfo?.isRegional || false;
              console.log('📍 Used fallback location info:', locationInfo);
            }
            
            // Extract plan details from orderData
            const planData = data.orderData || {};
            const simData0 = planData.sims?.[0] || {};
            
            // Data info
            const dataAmount = planData.data || data.data || simData?.data;
            const dataAmountMb = planData.data_amount_mb || data.data_amount_mb || data.capacity;
            const dataUnit = planData.data_unit || 'MB';
            const validity = planData.validity || simData0.validity || planData.period || planData.day || data.validity;
            const validityUnit = planData.validity_unit || 'days';
            
            // SMS and Voice info
            const smsCount = planData.sms || simData0.text || data.sms || 0;
            const voiceMinutes = planData.voice || planData.voice_minutes || simData0.voice || data.voice_minutes || 0;
            
            // Operator info
            const operator = planData.operator || planData.networks || data.operator || 'Airalo Partner Network';
            const esimType = planData.esim_type || data.esim_type || 'Prepaid';
            
            // Installation instructions from orderData
            const installationGuides = planData.installation_guides || {};
            const manualInstallation = planData.manual_installation || '';
            const qrcodeInstallation = planData.qrcode_installation || '';
            
            // APN info
            const apnInfo = simData0.apn || {};
            
            // Extract plan title
            let displayPlanName = data.planName || planData.package || data.customerName || packageSlug || 'Unknown Plan';
            
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
                // Map country/region information
                countryCode: countryCodeFromData,
                countryName: countryNameFromData,
                isRegional: isRegionalPlan,
                packageSlug: packageSlug,
                // Plan details for display
                planDetails: {
                  data: dataAmount,
                  dataAmountMb: dataAmountMb,
                  dataUnit: dataUnit,
                  validity: validity,
                  validityUnit: validityUnit,
                  operator: operator,
                  esimType: esimType,
                  sms: smsCount,
                  voice: voiceMinutes,
                  isUnlimited: planData.is_unlimited || data.is_unlimited || false
                },
                // Installation instructions
                installation: {
                  guides: installationGuides,
                  manual: manualInstallation,
                  qrcode: qrcodeInstallation,
                  apn: apnInfo
                },
                // Map QR code data from orderData.sims[0] (Airalo structure)
                qrCode: simData ? {
                  qrCode: fullLpaString,
                  qrCodeUrl: simData.qrcode_url,
                  directAppleInstallationUrl: simData.direct_apple_installation_url || simData.qrcode_url,
                  iccid: simData.iccid,
                  lpa: fullLpaString,
                  matchingId: simData.matching_id,
                  activationCode: simData.activation_code || simData.matching_id,
                  smdpAddress: simData.lpa,
                  isReal: true
                } : {
                  // Fallback for orders without orderData.sims structure
                  qrCode: data.qrCode || data.orderResult?.qrCode,
                  qrCodeUrl: data.qrCodeUrl || data.orderResult?.qrCodeUrl,
                  directAppleInstallationUrl: data.directAppleInstallationUrl || data.orderResult?.directAppleInstallationUrl,
                  iccid: data.iccid || data.orderResult?.iccid,
                  lpa: data.lpa || data.orderResult?.lpa,
                  matchingId: data.matchingId || data.orderResult?.matchingId
                },
                // Include the raw orderData for reference
                airaloOrderData: data.orderData
              };
          } catch (error) {
            return null;
          }
        })); // Use Promise.all for async map
        
        const filteredOrders = ordersData.filter(Boolean); // Remove null entries
        
        setOrders(filteredOrders);
      } catch {
        // Set empty orders array on error
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    const ensureUserProfile = async () => {
      if (!currentUser) return;

      try {
        // Check if user profile exists
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (!userDoc.exists()) {
          // Create user profile if it doesn't exist
          await setDoc(doc(db, 'users', currentUser.uid), {
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
      } catch {
        toast.error('Failed to fetch data');
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

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue mx-auto mb-4"></div>
          <p className="text-gray-600">{t('dashboard.loadingDashboard', 'Loading dashboard...')}</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!currentUser) {
    return null;
  }

  const activeOrders = orders.filter(order => {
    if (!order) return false;
    // Consider an order active if it has 'active' status OR if it has completed payment and eSIM data
    return order.status === 'active' || 
           order.status === 'completed' || 
           (order.qrCode?.isReal && (order.paymentStatus === 'completed' || order.paymentStatus === 'paid'));
  });


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
    } catch {
      
      // If this is a "not ready yet" error and we haven't retried too many times, retry
      if ('not available yet'.includes('not available yet') && retryCount < 3) {
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
        alert(t('dashboard.noIccidFound', 'No ICCID found in this order. Cannot check eSIM details.'));
        return;
      }
      
      const result = await esimService.getEsimDetailsByIccid(iccid);
      
      if (result.success) {
        setEsimDetails(result.data);
        
        // Update country info if needed
        await updateOrderCountryInfo(selectedOrder, result.data);
      } else {
        toast.error('Failed to get eSIM details');
      }
    } catch {
      toast.error('Failed to check eSIM details');
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
      // Delete from user's esims subcollection
      const userOrderRef = doc(db, 'users', currentUser.uid, 'esims', order.id);
      await updateDoc(userOrderRef, {
        deleted: true,
        deletedAt: serverTimestamp(),
        status: 'deleted'
      });
      
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
      console.error('Error deleting order:', error);
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
      
      console.log('[Dashboard] Fetching usage for ICCID:', iccid);
      const result = await esimService.getEsimUsageByIccid(iccid);
      console.log('[Dashboard] Usage API result:', result);
      
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
        
        console.log('[Dashboard] Combined usage data:', combinedUsageData);
        setEsimUsage(combinedUsageData);
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
        />

        {/* Account Settings */}
        <AccountSettings 
          currentUser={currentUser}
          userProfile={userProfile}
          onLoadUserProfile={loadUserProfile}
        />
      </div>

      {/* QR Code Modal */}
      <QRCodeModal 
        show={showQRModal}
        selectedOrder={selectedOrder}
        onClose={() => setShowQRModal(false)}
        onCheckEsimDetails={handleCheckEsimDetails}
        onCheckEsimUsage={handleCheckEsimUsage}
        loadingEsimDetails={loadingEsimDetails}
        loadingEsimUsage={loadingEsimUsage}
        onDeleteOrder={handleDeleteOrder}
      />

      {/* eSIM Details Modal */}
      <EsimDetailsModal 
        esimDetails={esimDetails}
        onClose={() => setEsimDetails(null)}
      />

      {/* eSIM Usage Modal */}
      <EsimUsageModal 
        esimUsage={esimUsage}
        onClose={() => setEsimUsage(null)}
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
