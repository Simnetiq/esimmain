'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import supabase from '../../../lib/supabase';
import { esimService } from '@esim/shared/services/esimService';
import toast from 'react-hot-toast';
import { DATA_SOURCES, PAGINATION, categorizePlan, planHasSms, planHasVoice } from '../utils/helpers';

/**
 * Custom hook for managing plans data from multiple sources
 * Implements Supabase-first architecture with manual filter application
 */
export const usePlansData = (t) => {
  // Data source state
  const [dataSource, setDataSource] = useState(DATA_SOURCES.SUPABASE);

  // Supabase data state (PRIMARY)
  const [supabasePlans, setSupabasePlans] = useState([]);
  const [loadingSupabase, setLoadingSupabase] = useState(false);
  const [supabaseError, setSupabaseError] = useState(null);
  const [supabasePagination, setSupabasePagination] = useState({
    page: 1,
    limit: PAGINATION.DEFAULT_ROWS_PER_PAGE,
    total: 0,
    totalPages: 0
  });

  // Airalo data state
  const [airaloPlans, setAiraloPlans] = useState([]);
  const [airaloCountries, setAiraloCountries] = useState([]);
  const [loadingAiralo, setLoadingAiralo] = useState(false);

  // Loading state for mutations
  const [loading, setLoading] = useState(false);

  // Filtering state (UI state - not applied until "Apply" is clicked)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [hasSmsFilter, setHasSmsFilter] = useState(false);
  const [hasVoiceFilter, setHasVoiceFilter] = useState(false);

  // Applied filters (actual filters sent to API)
  const [appliedFilters, setAppliedFilters] = useState({
    search: '',
    country: '',
    category: 'all',
    hasSms: false,
    hasVoice: false
  });

  // Track if filters have changed from applied
  const [filtersChanged, setFiltersChanged] = useState(false);

  // Sorting state
  const [sortColumn, setSortColumn] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(PAGINATION.DEFAULT_ROWS_PER_PAGE);

  // Selection state (Supabase table)
  const [selectedRows, setSelectedRows] = useState([]);
  const [denseMode, setDenseMode] = useState(false);

  // Sync status
  const [syncStatus, setSyncStatus] = useState(null);
  const [supabaseStatus, setSupabaseStatus] = useState(null);

  // Countries list from Supabase
  const [supabaseCountries, setSupabaseCountries] = useState([]);

  // Price editing state
  const [editingPrices, setEditingPrices] = useState({});
  const [pendingPriceChanges, setPendingPriceChanges] = useState({});

  // Track if initial load has happened
  const initialLoadDone = useRef(false);
  const isLoadingRef = useRef(false);

  // ============================================
  // CHECK IF FILTERS CHANGED
  // ============================================

  useEffect(() => {
    const hasChanged =
      searchTerm !== appliedFilters.search ||
      selectedCountry !== appliedFilters.country ||
      selectedCategory !== appliedFilters.category ||
      hasSmsFilter !== appliedFilters.hasSms ||
      hasVoiceFilter !== appliedFilters.hasVoice;

    setFiltersChanged(hasChanged);
  }, [searchTerm, selectedCountry, selectedCategory, hasSmsFilter, hasVoiceFilter, appliedFilters]);

  // ============================================
  // SUPABASE DATA FETCHING (PRIMARY)
  // ============================================

  /**
   * Load plans from Supabase with server-side filtering
   * This is a stable function that reads from appliedFilters ref
   */
  const loadSupabasePlans = useCallback(async (options = {}) => {
    // Prevent concurrent requests
    if (isLoadingRef.current) {
      return { success: false, error: 'Request already in progress' };
    }

    const {
      page = currentPage,
      limit = rowsPerPage,
      search = appliedFilters.search,
      country = appliedFilters.country,
      category = appliedFilters.category,
      hasVoice = appliedFilters.hasVoice,
      hasSms = appliedFilters.hasSms,
      sortBy = sortColumn,
      sortDir = sortDirection,
      showToast = false
    } = options;

    try {
      isLoadingRef.current = true;
      setLoadingSupabase(true);
      setSupabaseError(null);

      // Build query params
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('limit', String(limit));
      params.append('sortBy', sortBy);
      params.append('sortDir', sortDir);
      params.append('status', 'active');

      if (search?.trim()) {
        params.append('search', search.trim());
      }
      if (country) {
        params.append('country', country);
      }
      if (category && category !== 'all') {
        params.append('category', category);
      }
      if (hasVoice) {
        params.append('hasVoice', 'true');
      }
      if (hasSms) {
        params.append('hasSms', 'true');
      }

      const response = await fetch(`/api/plans?${params.toString()}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch plans');
      }

      setSupabasePlans(result.data || []);
      setSupabasePagination(result.pagination);

      if (showToast) {
        toast.success(`Loaded ${result.data?.length || 0} of ${result.pagination?.total || 0} plans`);
      }

      return result;
    } catch (error) {
      console.error('Error loading Supabase plans:', error);
      setSupabaseError(error.message);
      toast.error('Failed to load plans from Supabase');
      return { success: false, error: error.message };
    } finally {
      setLoadingSupabase(false);
      isLoadingRef.current = false;
    }
  }, [currentPage, rowsPerPage, sortColumn, sortDirection, appliedFilters]);

  /**
   * Apply filters and fetch data
   */
  const applyFilters = useCallback(async () => {
    // Update applied filters
    const newFilters = {
      search: searchTerm,
      country: selectedCountry,
      category: selectedCategory,
      hasSms: hasSmsFilter,
      hasVoice: hasVoiceFilter
    };

    setAppliedFilters(newFilters);
    setCurrentPage(1); // Reset to first page
    setSelectedRows([]); // Clear selection

    // Fetch with new filters
    await loadSupabasePlans({
      page: 1,
      search: searchTerm,
      country: selectedCountry,
      category: selectedCategory,
      hasSms: hasSmsFilter,
      hasVoice: hasVoiceFilter,
      showToast: true
    });
  }, [searchTerm, selectedCountry, selectedCategory, hasSmsFilter, hasVoiceFilter, loadSupabasePlans]);

  /**
   * Clear all filters
   */
  const clearFilters = useCallback(async () => {
    setSearchTerm('');
    setSelectedCountry('');
    setSelectedCategory('all');
    setHasSmsFilter(false);
    setHasVoiceFilter(false);

    const newFilters = {
      search: '',
      country: '',
      category: 'all',
      hasSms: false,
      hasVoice: false
    };

    setAppliedFilters(newFilters);
    setCurrentPage(1);
    setSelectedRows([]);

    await loadSupabasePlans({
      page: 1,
      search: '',
      country: '',
      category: 'all',
      hasSms: false,
      hasVoice: false,
      showToast: true
    });
  }, [loadSupabasePlans]);

  /**
   * Load Supabase sync status and countries
   */
  const loadSupabaseStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/sync-to-supabase');
      const result = await response.json();

      if (result.success) {
        setSupabaseStatus(result.status);
      }
    } catch (error) {
      console.error('Failed to load Supabase status:', error);
    }
  }, []);

  /**
   * Load countries list from Supabase
   */
  const loadSupabaseCountries = useCallback(async () => {
    try {
      const response = await fetch('/api/plans/countries');
      const result = await response.json();

      if (result.success && result.data) {
        setSupabaseCountries(result.data);
      }
    } catch (error) {
      console.error('Failed to load Supabase countries:', error);
    }
  }, []);

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

  // ============================================
  // AIRALO DATA FETCHING
  // ============================================

  const loadAiraloData = useCallback(async () => {
    try {
      setLoadingAiralo(true);

      const result = await esimService.fetchPlans();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch Airalo data');
      }

      setAiraloPlans(result.plans || []);
      setAiraloCountries(result.countries || []);

      toast.success(`Loaded ${result.plans?.length || 0} Airalo plans from ${result.countries?.length || 0} countries`);
    } catch (error) {
      console.error('Error loading Airalo data:', error);
      toast.error('Failed to load Airalo data');
    } finally {
      setLoadingAiralo(false);
    }
  }, []);



  const updatePlanPrice = useCallback(async (planId, newPrice) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('dataplans')
        .update({ price: parseFloat(newPrice) })
        .eq('id', planId);
      if (error) throw error;

      toast.success(t?.('plansManagement.priceUpdated', 'Price updated to ${{price}}!', { price: newPrice }) || `Price updated to $${newPrice}!`);
      await loadSupabasePlans();
    } catch (error) {
      console.error('Error updating price:', error);
      toast.error(t?.('plansManagement.errorUpdatingPrice', 'Failed to update price') || 'Failed to update price');
    } finally {
      setLoading(false);
    }
  }, [loadSupabasePlans, t]);

  const deletePlan = useCallback(async (planId, planName) => {
    if (!window.confirm(t?.('plansManagement.confirmDelete', 'Are you sure you want to delete "{{planName}}"? This action cannot be undone.', { planName }) || `Are you sure you want to delete "${planName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('dataplans').delete().eq('id', planId);
      if (error) throw error;
      toast.success(t?.('plansManagement.planDeleted', 'Plan "{{planName}}" deleted successfully!', { planName }) || `Plan "${planName}" deleted!`);
      await loadSupabasePlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error(t?.('plansManagement.errorDeletingPlan', 'Failed to delete plan') || 'Failed to delete plan');
    } finally {
      setLoading(false);
    }
  }, [loadSupabasePlans, t]);

  // ============================================
  // FILTERING LOGIC (CLIENT-SIDE FOR NON-SUPABASE)
  // ============================================

  const getFilteredPlans = useCallback(() => {
    // For Supabase, data is already filtered server-side
    if (dataSource === DATA_SOURCES.SUPABASE) {
      return supabasePlans;
    }

    // Airalo tab uses client-side filtering
    let filtered = [...airaloPlans];

    // Use UI filters for non-Supabase (real-time filtering)
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(plan => categorizePlan(plan) === selectedCategory);
    }

    if (hasSmsFilter) {
      filtered = filtered.filter(plan => planHasSms(plan));
    }

    if (hasVoiceFilter) {
      filtered = filtered.filter(plan => planHasVoice(plan));
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(plan =>
        plan.name?.toLowerCase().includes(term) ||
        plan.operator?.toLowerCase().includes(term) ||
        plan.title?.toLowerCase().includes(term) ||
        (plan.country_codes || plan.country_ids || []).some(code =>
          code.toLowerCase().includes(term)
        )
      );
    }

    if (selectedCountry) {
      filtered = filtered.filter(plan =>
        (plan.country_codes || []).includes(selectedCountry) ||
        (plan.country_ids || []).includes(selectedCountry) ||
        plan.country_code === selectedCountry
      );
    }

    // Sort
    if (sortColumn) {
      filtered.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];

        if (aVal == null) aVal = '';
        if (bVal == null) bVal = '';

        if (['price', 'net_price', 'validity_days', 'data_amount_mb', 'voice_minutes', 'sms_count', 'covered_countries_count'].includes(sortColumn)) {
          aVal = parseFloat(aVal) || 0;
          bVal = parseFloat(bVal) || 0;
        }

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (sortDirection === 'asc') {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });
    }

    return filtered;
  }, [dataSource, supabasePlans, airaloPlans, selectedCategory, hasSmsFilter, hasVoiceFilter, searchTerm, selectedCountry, sortColumn, sortDirection]);

  // ============================================
  // PAGE CHANGE HANDLER (auto-fetch)
  // ============================================

  const handlePageChange = useCallback(async (newPage) => {
    if (dataSource !== DATA_SOURCES.SUPABASE) {
      setCurrentPage(newPage);
      return;
    }

    setCurrentPage(newPage);
    setSelectedRows([]);

    await loadSupabasePlans({
      page: newPage,
      search: appliedFilters.search,
      country: appliedFilters.country,
      category: appliedFilters.category,
      hasSms: appliedFilters.hasSms,
      hasVoice: appliedFilters.hasVoice
    });
  }, [dataSource, appliedFilters, loadSupabasePlans]);

  // ============================================
  // SORT CHANGE HANDLER (auto-fetch)
  // ============================================

  const handleSortChange = useCallback(async (column) => {
    const newDirection = sortColumn === column && sortDirection === 'asc' ? 'desc' : 'asc';

    setSortColumn(column);
    setSortDirection(newDirection);

    if (dataSource === DATA_SOURCES.SUPABASE) {
      setCurrentPage(1);
      await loadSupabasePlans({
        page: 1,
        sortBy: column,
        sortDir: newDirection,
        search: appliedFilters.search,
        country: appliedFilters.country,
        category: appliedFilters.category,
        hasSms: appliedFilters.hasSms,
        hasVoice: appliedFilters.hasVoice
      });
    }
  }, [dataSource, sortColumn, sortDirection, appliedFilters, loadSupabasePlans]);

  // ============================================
  // ROWS PER PAGE CHANGE (auto-fetch)
  // ============================================

  const handleRowsPerPageChange = useCallback(async (newRowsPerPage) => {
    setRowsPerPage(newRowsPerPage);
    setCurrentPage(1);

    if (dataSource === DATA_SOURCES.SUPABASE) {
      await loadSupabasePlans({
        page: 1,
        limit: newRowsPerPage,
        search: appliedFilters.search,
        country: appliedFilters.country,
        category: appliedFilters.category,
        hasSms: appliedFilters.hasSms,
        hasVoice: appliedFilters.hasVoice
      });
    }
  }, [dataSource, appliedFilters, loadSupabasePlans]);

  // ============================================
  // INITIAL LOAD (ONCE)
  // ============================================

  useEffect(() => {
    if (initialLoadDone.current) return;

    const initialize = async () => {
      initialLoadDone.current = true;

      // Load Supabase data (primary)
      await loadSupabasePlans({
        page: 1,
        limit: PAGINATION.DEFAULT_ROWS_PER_PAGE,
        search: '',
        country: '',
        category: 'all',
        hasSms: false,
        hasVoice: false
      });

      // Load status and countries in parallel
      await Promise.all([
        loadSupabaseStatus(),
        loadSyncStatus(),
        loadSupabaseCountries()
      ]);
    };

    initialize();
  }, []);

  // Clear selection when changing data source
  useEffect(() => {
    setSelectedRows([]);
  }, [dataSource]);

  // ============================================
  // RETURN
  // ============================================

  return {
    // Data source
    dataSource,
    setDataSource,

    // Supabase data (primary)
    supabasePlans,
    loadingSupabase,
    supabaseError,
    supabasePagination,
    loadSupabasePlans,
    supabaseStatus,
    loadSupabaseStatus,
    supabaseCountries,
    syncStatus,
    loadSyncStatus,

    // Airalo data
    airaloPlans,
    airaloCountries,
    loadingAiralo,
    loadAiraloData,

    // Loading state for mutations
    loading,

    // Filters (UI state)
    searchTerm,
    setSearchTerm,
    selectedCountry,
    setSelectedCountry,
    selectedCategory,
    setSelectedCategory,
    hasSmsFilter,
    setHasSmsFilter,
    hasVoiceFilter,
    setHasVoiceFilter,

    // Applied filters
    appliedFilters,
    filtersChanged,
    applyFilters,
    clearFilters,

    // Sorting
    sortColumn,
    sortDirection,
    handleSortChange,

    // Pagination
    currentPage,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,

    // Selection
    selectedRows,
    setSelectedRows,
    denseMode,
    setDenseMode,

    // Price editing
    editingPrices,
    setEditingPrices,
    pendingPriceChanges,
    setPendingPriceChanges,
    updatePlanPrice,

    // Mutations
    deletePlan,

    // Computed
    filteredPlans: getFilteredPlans()
  };
};

export default usePlansData;
