'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { esimService } from '@esim/shared/services/esimService';

import {
  Smartphone,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Globe,
  MapPin,
  Flag,
  Phone,
  MessageSquare,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { usePathname } from 'next/navigation';

// Helper function to get flag emoji from country code
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  // Handle special cases like PT-MA, multi-region codes, etc.
  if (countryCode.includes('-') || countryCode.length > 2) {
    return '🌍';
  }

  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());

    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

// Helper function to categorize a plan
const categorizePlan = (plan) => {
  // Check if it's a global plan (e.g., "Discover Global")
  const name = (plan.name || plan.title || '').toLowerCase();
  const countryRegion = (plan.country_region || plan.country_title || '').toLowerCase();
  const countryCodes = plan.country_codes || plan.country_ids || [];
  const isRegionalFlag = plan.is_regional || false;
  const regionType = plan.region_type || '';

  // Global plans
  if (
    name.includes('global') ||
    name.includes('discover') ||
    countryRegion.includes('global') ||
    regionType === 'global' ||
    plan.type === 'global'
  ) {
    return 'global';
  }

  // Regional plans (multiple countries, not global)
  if (
    isRegionalFlag ||
    regionType === 'regional' ||
    countryCodes.length > 1 ||
    countryRegion.includes('europe') ||
    countryRegion.includes('asia') ||
    countryRegion.includes('africa') ||
    countryRegion.includes('americas') ||
    countryRegion.includes('oceania') ||
    countryRegion.includes('european union') ||
    countryRegion.includes('caribbean')
  ) {
    return 'regional';
  }

  // Single country plans
  return 'country';
};

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

const PlansManagement = () => {
  const { currentUser } = useAuth();
  const { t, locale } = useI18n();
  const pathname = usePathname();

  
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

  // State Management
  const [loading, setLoading] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  const [filteredPlans, setFilteredPlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [availableCountries, setAvailableCountries] = useState([]);
  
  // Airalo data state
  const [airaloPlans, setAiraloPlans] = useState([]);
  const [airaloCountries, setAiraloCountries] = useState([]);
  const [loadingAiralo, setLoadingAiralo] = useState(false);
  
  // Price editing state
  const [editingPrices, setEditingPrices] = useState({});
  const [pendingPriceChanges, setPendingPriceChanges] = useState({});
  
  // Data source toggle
  const [dataSource, setDataSource] = useState('firebase'); // 'firebase', 'airalo', or 'topups'

  // Topups state
  const [topups, setTopups] = useState([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  
  // Sync state
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [plansPerPage] = useState(15);

  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all', 'global', 'regional', 'country'

  // SMS/Voice filter state
  const [hasSmsFilter, setHasSmsFilter] = useState(false);
  const [hasVoiceFilter, setHasVoiceFilter] = useState(false);

  // Plans Management Functions
  const loadAllPlans = useCallback(async () => {
    try {
      setLoading(true);
      const plansSnapshot = await getDocs(collection(db, 'dataplans'));
      const plansData = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setAllPlans(plansData);

      // Extract unique countries from plans (excluding topups)
      const countries = new Set();
      plansData
        .filter(plan => plan.type !== 'topup' && plan.is_topup !== true)
        .forEach(plan => {
          (plan.country_codes || []).forEach(code => countries.add(code));
          (plan.country_ids || []).forEach(code => countries.add(code));
        });
      
      const sortedCountries = Array.from(countries).sort();
      setAvailableCountries(sortedCountries);
    } catch {
      toast.error(t('plansManagement.errorLoadingPlans', 'Failed to load plans'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  // Load topups from Firebase
  const loadTopups = useCallback(async () => {
    try {
      setLoadingTopups(true);
      const topupsSnapshot = await getDocs(collection(db, 'topups'));
      const topupsData = topupsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTopups(topupsData);
    } catch (error) {
      console.error('Error loading topups:', error);
      toast.error(t('plansManagement.errorLoadingTopups', 'Failed to load topups'));
    } finally {
      setLoadingTopups(false);
    }
  }, [t]);

  // Load plans on component mount
  useEffect(() => {
    if (currentUser) {
      loadAllPlans();
    }
  }, [currentUser, loadAllPlans]);

  // Load topups when switching to topups tab
  useEffect(() => {
    if (dataSource === 'topups' && topups.length === 0 && !loadingTopups) {
      loadTopups();
    }
  }, [dataSource, topups.length, loadingTopups, loadTopups]);

  // Filter plans based on search, country, category, and SMS/Voice
  useEffect(() => {
    // Select data source
    let plansToFilter;
    if (dataSource === 'topups') {
      plansToFilter = topups;
    } else if (dataSource === 'airalo') {
      plansToFilter = airaloPlans;
    } else {
      plansToFilter = allPlans;
    }
    let filtered = [...plansToFilter];

    // Filter out topups from non-topup views
    if (dataSource !== 'topups') {
      filtered = filtered.filter(plan =>
        plan.type !== 'topup' && plan.is_topup !== true
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(plan => categorizePlan(plan) === selectedCategory);
    }

    // Filter by SMS
    if (hasSmsFilter) {
      filtered = filtered.filter(plan => planHasSms(plan));
    }

    // Filter by Voice
    if (hasVoiceFilter) {
      filtered = filtered.filter(plan => planHasVoice(plan));
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(plan =>
        plan.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.operator?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        plan.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (plan.country_codes || plan.country_ids || []).some(code =>
          code.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filter by country
    if (selectedCountry) {
      filtered = filtered.filter(plan =>
        (plan.country_codes || []).includes(selectedCountry) ||
        (plan.country_ids || []).includes(selectedCountry) ||
        plan.country_code === selectedCountry
      );
    }

    setFilteredPlans(filtered);
    // Reset to page 1 when filters change
    setCurrentPage(1);
  }, [allPlans, airaloPlans, topups, searchTerm, selectedCountry, dataSource, selectedCategory, hasSmsFilter, hasVoiceFilter]);

  // Load Airalo plans and countries
  const loadAiraloData = async () => {
    try {
      setLoadingAiralo(true);
      
      const result = await esimService.fetchPlans();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Airalo data');
      }
      
      setAiraloPlans(result.plans || []);
      setAiraloCountries(result.countries || []);
      
      toast.success(`Loaded ${result.plans?.length || 0} Airalo plans from ${result.countries?.length || 0} countries`);
    } catch {
      toast.error('Failed to load Airalo data');
    } finally {
      setLoadingAiralo(false);
    }
  };

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync-airalo');
      const result = await response.json();
      
      if (result.success) {
        setSyncStatus(result.currentStatus);
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }, []);

  // Run sync with Airalo API
  const runSync = async (options = {}) => {
    const { dryRun = false, removeDeprecated = true } = options;
    
    try {
      setSyncing(true);
      setSyncResult(null);
      
      const params = new URLSearchParams();
      if (dryRun) params.append('dry_run', 'true');
      if (!removeDeprecated) params.append('remove_deprecated', 'false');
      
      const response = await fetch(`/api/sync-airalo?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      setSyncResult(result);
      
      if (result.success) {
        toast.success(result.message);
        if (!dryRun) {
          // Reload plans after successful sync
          await loadAllPlans();
          await loadSyncStatus();
        }
      } else {
        toast.error(result.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync with Airalo');
      setSyncResult({ success: false, error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  // Load sync status on mount
  useEffect(() => {
    if (currentUser) {
      loadSyncStatus();
    }
  }, [currentUser, loadSyncStatus]);

  const updatePlanPrice = async (planId, newPrice) => {
    try {
      setLoading(true);
      const planRef = doc(db, 'dataplans', planId);
      await updateDoc(planRef, {
        price: parseFloat(newPrice)
      });
      
      toast.success(t('plansManagement.priceUpdated', 'Price updated to ${{price}}!', { price: newPrice }));
      await loadAllPlans();
    } catch {
      toast.error(t('plansManagement.errorUpdatingPrice', 'Failed to update price'));
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (planId, newPrice) => {
    setPendingPriceChanges(prev => ({
      ...prev,
      [planId]: parseFloat(newPrice) || 0
    }));
  };

  const savePriceChange = async (planId) => {
    const newPrice = pendingPriceChanges[planId];
    if (newPrice !== undefined) {
      await updatePlanPrice(planId, newPrice);
      setEditingPrices(prev => ({ ...prev, [planId]: false }));
      setPendingPriceChanges(prev => ({ ...prev, [planId]: undefined }));
    }
  };

  const cancelPriceChange = (planId) => {
    setEditingPrices(prev => ({ ...prev, [planId]: false }));
    setPendingPriceChanges(prev => ({ ...prev, [planId]: undefined }));
  };

  const startEditingPrice = (planId) => {
    setEditingPrices(prev => ({ ...prev, [planId]: true }));
  };

  // Pagination calculations
  const indexOfLastPlan = currentPage * plansPerPage;
  const indexOfFirstPlan = indexOfLastPlan - plansPerPage;
  const currentPlans = filteredPlans.slice(indexOfFirstPlan, indexOfLastPlan);
  const totalPages = Math.ceil(filteredPlans.length / plansPerPage);

  // Pagination handlers
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const deletePlan = async (planId, planName) => {
    if (!window.confirm(t('plansManagement.confirmDelete', 'Are you sure you want to delete "{{planName}}"? This action cannot be undone.', { planName }))) {
      return;
    }

    try {
      setLoading(true);
      await deleteDoc(doc(db, 'dataplans', planId));
      toast.success(t('plansManagement.planDeleted', 'Plan "{{planName}}" deleted successfully!', { planName }));
      await loadAllPlans();
    } catch {
      toast.error(t('plansManagement.errorDeletingPlan', 'Failed to delete plan'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Plans Management</h2>
          <p className="text-gray-600 mt-1">View and manage all eSIM data plans</p>
        </div>
        <button
          onClick={() => setShowSyncModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Sync with Airalo
        </button>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">
                  {syncStatus.activePlans?.toLocaleString() || allPlans.length} Active Plans
                </span>
              </div>
              {syncStatus.lastSync && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  Last synced: {new Date(syncStatus.lastSync.timestamp).toLocaleString()}
                  {syncStatus.lastSync.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            <button
              onClick={loadSyncStatus}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh Status
            </button>
          </div>
        </div>
      )}

      {/* Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                Sync Plans with Airalo API
              </h3>
              <p className="text-gray-600 mt-1">
                Fetch the latest packages from Airalo and update your Firebase database
              </p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Current Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Current Status</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Plans in Firebase:</span>
                    <span className="ml-2 font-medium">{allPlans.length.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Active Plans:</span>
                    <span className="ml-2 font-medium">{syncStatus?.activePlans?.toLocaleString() || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Important Notice</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      Full sync will remove plans that are no longer available in the Airalo catalog. 
                      Run a dry run first to see what will be changed.
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Result */}
              {syncResult && (
                <div className={`rounded-lg p-4 ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <h4 className={`font-medium ${syncResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {syncResult.dryRun ? 'Dry Run Result' : 'Sync Result'}
                  </h4>
                  <p className={`text-sm mt-1 ${syncResult.success ? 'text-green-700' : 'text-red-700'}`}>
                    {syncResult.message || syncResult.error}
                  </p>
                  {syncResult.details && (
                    <div className="mt-3 text-sm space-y-1">
                      <p>• From Airalo API: <strong>{syncResult.details.from_airalo_api?.toLocaleString()}</strong> packages</p>
                      <p>• Currently in Firebase: <strong>{syncResult.details.existing_in_firebase?.toLocaleString()}</strong> packages</p>
                      <p>• New packages: <strong>{syncResult.details.packages?.added || 0}</strong></p>
                      <p>• Updated packages: <strong>{syncResult.details.packages?.updated || 0}</strong></p>
                      <p className="text-amber-700">• To be removed: <strong>{syncResult.details.total_deprecated || 0}</strong></p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => runSync({ dryRun: true })}
                  disabled={syncing}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      Dry Run (Preview)
                    </>
                  )}
                </button>
                <button
                  onClick={() => runSync({ dryRun: false, removeDeprecated: true })}
                  disabled={syncing}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {syncing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Full Sync (Update All)
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncResult(null);
                }}
                className="w-full px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Data Source Toggle and Controls */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex flex-col gap-4">
          {/* Data Source Toggle */}
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <span className="text-sm font-medium text-gray-700">Data Source:</span>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setDataSource('firebase')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    dataSource === 'firebase'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Firebase ({allPlans.length})
                </button>
                <button
                  onClick={() => setDataSource('airalo')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    dataSource === 'airalo'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Airalo ({airaloPlans.length})
                </button>
                <button
                  onClick={() => setDataSource('topups')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    dataSource === 'topups'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Topups ({topups.length})
                </button>
              </div>
            </div>
          </div>

          {/* Load Airalo Button */}
          {dataSource === 'airalo' && (
            <div className="flex justify-center">
              <button
                onClick={loadAiraloData}
                disabled={loadingAiralo}
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loadingAiralo ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading Airalo Data...
                  </>
                ) : (
                  'Load Airalo Data'
                )}
              </button>
            </div>
          )}

          {/* Load Topups Button */}
          {dataSource === 'topups' && (
            <div className="flex justify-center gap-4">
              <button
                onClick={loadTopups}
                disabled={loadingTopups}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {loadingTopups ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Loading Topups...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Refresh Topups
                  </>
                )}
              </button>
              <div className="text-sm text-gray-600 flex items-center">
                Topups are synced to a separate collection for future topup functionality
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col gap-4">
          {/* Plan Type Tabs */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Plan Type:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  selectedCategory === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                All Plans
              </button>
              <button
                onClick={() => setSelectedCategory('global')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  selectedCategory === 'global'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Globe className="w-4 h-4 text-blue-500" />
                Global
              </button>
              <button
                onClick={() => setSelectedCategory('regional')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  selectedCategory === 'regional'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <MapPin className="w-4 h-4 text-green-500" />
                Regional
              </button>
              <button
                onClick={() => setSelectedCategory('country')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center gap-2 ${
                  selectedCategory === 'country'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Flag className="w-4 h-4 text-orange-500" />
                Country
              </button>
            </div>
          </div>

          {/* SMS/Voice Filters */}
          <div className="flex items-center gap-4 border-t border-gray-100 pt-4">
            <span className="text-sm font-medium text-gray-700">Features:</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasSmsFilter}
                onChange={(e) => setHasSmsFilter(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <MessageSquare className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600">Has SMS</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasVoiceFilter}
                onChange={(e) => setHasVoiceFilter(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Phone className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-gray-600">Has Voice/Calls</span>
            </label>
            {(hasSmsFilter || hasVoiceFilter || selectedCategory !== 'all') && (
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setHasSmsFilter(false);
                  setHasVoiceFilter(false);
                }}
                className="ml-auto px-3 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>

          {/* Category Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500 border-t border-gray-100 pt-3">
            <span>
              📊 Showing: <strong className="text-gray-700">{filteredPlans.length}</strong> plans
            </span>
            {selectedCategory !== 'all' && (
              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full">
                {selectedCategory === 'global' && '🌍 Global Plans'}
                {selectedCategory === 'regional' && '🗺️ Regional Plans'}
                {selectedCategory === 'country' && '🏳️ Country Plans'}
              </span>
            )}
            {hasSmsFilter && (
              <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
                💬 With SMS
              </span>
            )}
            {hasVoiceFilter && (
              <span className="px-2 py-1 bg-teal-50 text-teal-700 rounded-full">
                📞 With Voice
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar and Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
          <div className="relative flex-1 max-w-md">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
            <input
              type="text"
              placeholder={t('plansManagement.searchPlans', 'Search plans...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900`}
              style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
            />
          </div>
          <div className={`flex gap-4 items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
            <span className={`text-sm text-gray-600 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('plansManagement.countries', 'Countries')}: {dataSource === 'airalo' ? airaloCountries.length : availableCountries.length}
            </span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
            >
              <option value="">{t('plansManagement.allCountries', 'All Countries')}</option>
              {(dataSource === 'airalo' ? airaloCountries : availableCountries).length > 0 ? (
                (dataSource === 'airalo' ? airaloCountries : availableCountries).map(country => (
                  <option key={dataSource === 'airalo' ? country.code : country} value={dataSource === 'airalo' ? country.code : country}>
                    {getFlagEmoji(dataSource === 'airalo' ? country.code : country)} {dataSource === 'airalo' ? country.name : country}
                  </option>
                ))
              ) : (
                <option value="" disabled>{t('plansManagement.noCountriesFound', 'No countries found')}</option>
              )}
            </select>
            {selectedCountry && (
              <button
                onClick={() => setSelectedCountry('')}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('plansManagement.clearFilter', 'Clear Filter')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Plans Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t('plansManagement.plan', 'Plan')}
                </th>
                <th className={`px-4 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  Type
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t('plansManagement.dataDuration', 'Data & Duration')}
                </th>
                <th className={`px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  SMS / Voice
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t('plansManagement.countries', 'Countries')}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {dataSource === 'airalo' ? 'Original / Discounted Price' : t('plansManagement.price', 'Price')}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t('plansManagement.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentPlans.length > 0 ? (
                currentPlans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Smartphone className="w-5 h-5 text-blue-600" />
                          </div>
                        </div>
                        <div className={`${isRTL ? 'mr-4' : 'ml-4'}`}>
                          <div className={`text-sm font-medium text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                            {plan.name || plan.title || t('plansManagement.unnamedPlan', 'Unnamed Plan')}
                          </div>
                          {(plan.operator || plan.brand) && (
                            <div className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                              {plan.operator || plan.brand}
                            </div>
                          )}
                          {dataSource === 'airalo' && (
                            <div className={`text-xs text-blue-600 ${isRTL ? 'text-right' : 'text-left'}`}>
                              Airalo Plan
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Plan Type/Category Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      {(() => {
                        const category = categorizePlan(plan);
                        if (category === 'global') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Globe className="w-3 h-3" />
                              Global
                            </span>
                          );
                        } else if (category === 'regional') {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <MapPin className="w-3 h-3" />
                              Regional
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              <Flag className="w-3 h-3" />
                              Country
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {/* Use the 'data' field which is already formatted correctly (e.g., "1 GB", "500 MB") */}
                        {plan.data ? (
                          plan.data === 'Unlimited' || plan.is_unlimited ? 
                            t('plansManagement.unlimited', 'Unlimited') : 
                            plan.data
                        ) : (
                          t('plansManagement.unlimited', 'Unlimited')
                        )}
                      </div>
                      <div className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {dataSource === 'airalo' ? (
                          plan.validity ? `${plan.validity} ${plan.validity_unit || 'days'}` : t('plansManagement.notAvailable', 'N/A')
                        ) : (
                          plan.period ? t('plansManagement.days', '{{days}} days', { days: plan.period }) : t('plansManagement.notAvailable', 'N/A')
                        )}
                      </div>
                    </td>
                    {/* SMS / Voice Column */}
                    <td className="px-4 py-4 whitespace-nowrap text-center">
                      <div className="flex flex-col items-center gap-1">
                        {planHasSms(plan) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            <MessageSquare className="w-3 h-3" />
                            {plan.sms || 0}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                        {planHasVoice(plan) ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                            <Phone className="w-3 h-3" />
                            {plan.voice || plan.calls || 0}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {dataSource === 'airalo' ? (
                          plan.country_code ? (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {getFlagEmoji(plan.country_code)} {plan.country_code}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              🌍 Global
                            </span>
                          )
                        ) : (
                          (plan.country_codes || plan.country_ids || []).length > 0 ? (
                            <>
                              {(plan.country_codes || plan.country_ids || []).slice(0, 3).map((code, index) => (
                                <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {getFlagEmoji(code)}
                                </span>
                              ))}
                              {(plan.country_codes || plan.country_ids || []).length > 3 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  +{(plan.country_codes || plan.country_ids || []).length - 3}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              🌍
                            </span>
                          )
                        )}
                      </div>
                    </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {dataSource === 'airalo' ? (
                                  // Airalo pricing - wholesale price from Airalo API
                                  <div className="text-sm font-medium text-gray-900">
                                    {formatPrice(plan.price || 0)}
                                    <span className="text-xs text-gray-500 ml-1">(wholesale)</span>
                                  </div>
                                ) : (
                                  // Firebase pricing (editable)
                                  <div className="flex items-center space-x-2">
                                    {editingPrices[plan.id] ? (
                                      <input
                                        type="number"
                                        value={pendingPriceChanges[plan.id] !== undefined ? pendingPriceChanges[plan.id] : (plan.price || 0)}
                                        onChange={(e) => handlePriceChange(plan.id, e.target.value)}
                                        className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        step="0.01"
                                        min="0"
                                        autoFocus
                                      />
                                    ) : (
                                      <div
                                        onClick={() => startEditingPrice(plan.id)}
                                        className="w-20 px-2 py-1 text-sm text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                                      >
                                        {formatPrice(plan.price || 0)}
                                      </div>
                                    )}
                                    {editingPrices[plan.id] && (
                                      <div className="flex space-x-1">
                                        <button
                                          onClick={() => savePriceChange(plan.id)}
                                          disabled={loading}
                                          className="px-2 py-1 bg-gray-900 text-white text-xs rounded hover:bg-gray-800 disabled:opacity-50 transition-colors"
                                        >
                                          {t('plansManagement.save', 'Save')}
                                        </button>
                                        <button
                                          onClick={() => cancelPriceChange(plan.id)}
                                          disabled={loading}
                                          className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700 disabled:opacity-50 transition-colors"
                                        >
                                          {t('plansManagement.cancel', 'Cancel')}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                {dataSource === 'firebase' ? (
                                  <button
                                    onClick={() => deletePlan(plan.id, plan.name || 'Unnamed Plan')}
                                    disabled={loading}
                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Delete plan"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                ) : (
                                  <div className="text-xs text-gray-400 italic">
                                    Read-only
                                  </div>
                                )}
                              </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Smartphone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium">{t('plansManagement.noPlansFound', 'No plans found')}</p>
                      <p className="text-sm">{t('plansManagement.tryAdjusting', 'Try adjusting your search or filters')}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredPlans.length > plansPerPage && (
        <div className="bg-white border border-gray-200 px-4 py-3 flex items-center justify-between sm:px-6 rounded-lg">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('plansManagement.previous', 'Previous')}
            </button>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('plansManagement.next', 'Next')}
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className={`text-sm text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('plansManagement.showing', 'Showing {{start}} to {{end}} of {{total}} results', {
                  start: indexOfFirstPlan + 1,
                  end: Math.min(indexOfLastPlan, filteredPlans.length),
                  total: filteredPlans.length
                })}
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Previous</span>
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => {
                  // Show first page, last page, current page, and pages around current page
                  const shouldShow = 
                    pageNumber === 1 || 
                    pageNumber === totalPages || 
                    Math.abs(pageNumber - currentPage) <= 1;
                  
                  if (!shouldShow) {
                    // Show ellipsis for gaps
                    if (pageNumber === 2 && currentPage > 3) {
                      return (
                        <span key={`ellipsis-${pageNumber}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                    if (pageNumber === totalPages - 1 && currentPage < totalPages - 2) {
                      return (
                        <span key={`ellipsis-${pageNumber}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                        pageNumber === currentPage
                                          ? 'z-10 bg-gray-900 border-gray-900 text-white'
                                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Next</span>
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PlansManagement;
