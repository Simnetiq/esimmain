'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { esimService } from '@esim/shared/services/esimService';
import {  getReferralSettings, getRegularSettings } from '@esim/shared/services/settingsService';

import { 
  Smartphone,
  Trash2,
  Search,
  ChevronLeft,
  ChevronRight
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
  
  // Discount settings state
  const [discountSettings, setDiscountSettings] = useState({
    referral: { discountPercentage: 35, minimumPrice: 0.5, transactionCommissionPercentage: 15 },
    regular: { discountPercentage: 25, minimumPrice: 0.5 }
  });
  
  // Price editing state
  const [editingPrices, setEditingPrices] = useState({});
  const [pendingPriceChanges, setPendingPriceChanges] = useState({});
  
  // Data source toggle
  const [dataSource, setDataSource] = useState('firebase'); // 'firebase' or 'airalo'
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [plansPerPage] = useState(15);

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

      // Extract unique countries from plans
      const countries = new Set();
      plansData.forEach(plan => {
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

  // Load discount settings from Firebase
  const loadDiscountSettings = useCallback(async () => {
    try {
      const [referralSettings, regularSettings] = await Promise.all([
        getReferralSettings(),
        getRegularSettings()
      ]);
      
      setDiscountSettings({
        referral: referralSettings,
        regular: regularSettings
      });
      
    } catch {
      toast.error('Error loading discount settings');
    }
  }, []);

  // Load plans on component mount
  useEffect(() => {
    if (currentUser) {
      loadAllPlans();
      loadDiscountSettings();
    }
  }, [currentUser, loadAllPlans, loadDiscountSettings]);

  // Filter plans based on search and country
  useEffect(() => {
    const plansToFilter = dataSource === 'airalo' ? airaloPlans : allPlans;
    let filtered = [...plansToFilter];

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
  }, [allPlans, airaloPlans, searchTerm, selectedCountry, dataSource]);

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

  // Calculate discounted prices
  const calculateDiscountedPrice = (originalPrice, discountType = 'regular') => {
    if (!originalPrice || originalPrice <= 0) return originalPrice;
    
    const settings = discountSettings[discountType] || discountSettings.regular;
    const discountPercentage = settings.discountPercentage || 0;
    const minimumPrice = settings.minimumPrice || 0.5;
    
    const discountedPrice = Math.max(minimumPrice, originalPrice * (100 - discountPercentage) / 100);
    return discountedPrice;
  };

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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Plans Management</h2>
        <p className="text-gray-600 mt-1">View and manage all eSIM data plans</p>
      </div>

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
              </div>
            </div>
            
            {/* Discount Settings Display */}
            <div className={`flex items-center gap-4 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-blue-700 font-medium">Referral: {discountSettings.referral.discountPercentage}%</span>
              </div>
              <div className="bg-green-50 px-3 py-1 rounded-full">
                <span className="text-green-700 font-medium">Regular: {discountSettings.regular.discountPercentage}%</span>
              </div>
              <div className="bg-purple-50 px-3 py-1 rounded-full">
                <span className="text-purple-700 font-medium">Commission: {discountSettings.referral.transactionCommissionPercentage || 15}%</span>
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
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t('plansManagement.slug', 'Slug')}
                </th>
                <th className={`px-6 py-3 ${isRTL ? 'text-right' : 'text-left'} text-xs font-medium text-gray-500 uppercase tracking-wider`}>
                  {t('plansManagement.dataDuration', 'Data & Duration')}
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded ${isRTL ? 'text-right' : 'text-left'}`}>
                        {plan.slug || plan.id || t('plansManagement.noSlug', 'No slug')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {dataSource === 'airalo' ? (
                          plan.data === 'Unlimited' || plan.data === -1 ? 
                            t('plansManagement.unlimited', 'Unlimited') : 
                            `${plan.data} ${plan.data_unit || 'GB'}`
                        ) : (
                          (plan.capacity === -1 || plan.capacity === 0 || plan.capacity === 'Unlimited') ? 
                            t('plansManagement.unlimited', 'Unlimited') : 
                            `${plan.capacity} GB`
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
                                  // Airalo pricing with discounts
                                  <div className="space-y-1">
                                    <div className="text-sm font-medium text-gray-900">
                                      {formatPrice(plan.price || 0)} <span className="text-xs text-gray-500">(Original)</span>
                                    </div>
                                    <div className="text-xs space-y-1">
                                      <div className="text-green-600">
                                        Regular: {formatPrice(calculateDiscountedPrice(plan.price, 'regular'))} 
                                        <span className="text-gray-500 ml-1">(-{discountSettings.regular.discountPercentage}%)</span>
                                      </div>
                                      <div className="text-blue-600">
                                        Referral: {formatPrice(calculateDiscountedPrice(plan.price, 'referral'))} 
                                        <span className="text-gray-500 ml-1">(-{discountSettings.referral.discountPercentage}%)</span>
                                      </div>
                                    </div>
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
                  <td colSpan="6" className="px-6 py-12 text-center">
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
