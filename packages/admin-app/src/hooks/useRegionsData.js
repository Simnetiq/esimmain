import { useState, useCallback, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  fetchRegions,
  fetchRegionById,
  fetchRegionTariffs,
  createRegion,
  updateRegion,
  deleteRegion,
  toggleRegionActive,
  toggleTariffFeatured
} from '../services/regionService';

const DEFAULT_FILTERS = {
  search: '',
  type: '',
  isActive: null,
  sortBy: 'display_order',
  sortDir: 'asc',
  page: 1,
  limit: 25,
  includeStats: true
};

/**
 * Hook for managing regions data with Supabase
 * @param {Object} options - Hook options
 * @param {Object} options.initialFilters - Initial filter values
 * @param {boolean} options.autoLoad - Whether to auto-load on mount
 * @returns {Object} Regions data and actions
 */
export function useRegionsData(options = {}) {
  const { initialFilters = {}, autoLoad = true } = options;

  // Data state
  const [regions, setRegions] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [regionTariffs, setRegionTariffs] = useState([]);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [loadingTariffs, setLoadingTariffs] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // UI filter state (not yet applied)
  const [searchTerm, setSearchTerm] = useState(initialFilters.search || '');
  const [selectedType, setSelectedType] = useState(initialFilters.type || '');
  const [showInactive, setShowInactive] = useState(false);

  // Applied filters (what's actually being used)
  const [appliedFilters, setAppliedFilters] = useState({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  // Sorting
  const [sortColumn, setSortColumn] = useState(initialFilters.sortBy || 'display_order');
  const [sortDirection, setSortDirection] = useState(initialFilters.sortDir || 'asc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Check if filters have changed from applied
  const filtersChanged =
    searchTerm !== (appliedFilters.search || '') ||
    selectedType !== (appliedFilters.type || '') ||
    showInactive !== (appliedFilters.isActive === null ? false : !appliedFilters.isActive);

  // Load regions
  const loadRegions = useCallback(async (opts = {}) => {
    try {
      setLoading(true);
      const response = await fetchRegions({
        ...appliedFilters,
        page: currentPage,
        limit: rowsPerPage,
        sortBy: sortColumn,
        sortDir: sortDirection
      });

      setRegions(response.data);
      setPagination(response.pagination);

      if (opts.showToast) {
        toast.success(`Loaded ${response.pagination.total} regions`);
      }
    } catch (error) {
      console.error('Error loading regions:', error);
      toast.error('Failed to load regions');
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage, rowsPerPage, sortColumn, sortDirection]);

  // Load single region details
  const loadRegionDetails = useCallback(async (regionId) => {
    try {
      setLoading(true);
      const region = await fetchRegionById(regionId);
      setSelectedRegion(region);
    } catch (error) {
      console.error('Error loading region details:', error);
      toast.error('Failed to load region details');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load region tariffs
  const loadRegionTariffs = useCallback(async (regionId, limit) => {
    try {
      setLoadingTariffs(true);
      const { data } = await fetchRegionTariffs(regionId, {
        sortBy: 'price',
        sortDir: 'asc',
        limit,
        status: 'active'
      });
      setRegionTariffs(data);
    } catch (error) {
      console.error('Error loading region tariffs:', error);
      toast.error('Failed to load region tariffs');
    } finally {
      setLoadingTariffs(false);
    }
  }, []);

  // Apply filters
  const applyFilters = useCallback(() => {
    setAppliedFilters({
      search: searchTerm,
      type: selectedType,
      isActive: showInactive ? null : true,
      sortBy: sortColumn,
      sortDir: sortDirection,
      page: 1,
      limit: rowsPerPage,
      includeStats: true
    });
    setCurrentPage(1);
  }, [searchTerm, selectedType, showInactive, sortColumn, sortDirection, rowsPerPage]);

  // Clear filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setSelectedType('');
    setShowInactive(false);
    setSortColumn('display_order');
    setSortDirection('asc');
    setCurrentPage(1);
    setAppliedFilters({
      ...DEFAULT_FILTERS,
      includeStats: true
    });
  }, []);

  // Handle sort change
  const handleSortChange = useCallback((column) => {
    setSortDirection(prev =>
      sortColumn === column
        ? prev === 'asc' ? 'desc' : 'asc'
        : 'asc'
    );
    setSortColumn(column);
  }, [sortColumn]);

  // Handle page change
  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Handle rows per page change
  const handleRowsPerPageChange = useCallback((rows) => {
    setRowsPerPage(rows);
    setCurrentPage(1);
  }, []);

  // Create new region
  const createNewRegion = useCallback(async (data) => {
    try {
      setSaving(true);
      const region = await createRegion(data);
      toast.success('Region created successfully');
      await loadRegions();
      return region;
    } catch (error) {
      console.error('Error creating region:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create region');
      return null;
    } finally {
      setSaving(false);
    }
  }, [loadRegions]);

  // Update existing region
  const updateExistingRegion = useCallback(async (data) => {
    try {
      setSaving(true);
      const region = await updateRegion(data);
      toast.success('Region updated successfully');
      await loadRegions();
      return region;
    } catch (error) {
      console.error('Error updating region:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update region');
      return null;
    } finally {
      setSaving(false);
    }
  }, [loadRegions]);

  // Delete region
  const deleteExistingRegion = useCallback(async (id) => {
    try {
      setSaving(true);
      await deleteRegion(id);
      toast.success('Region deleted successfully');
      await loadRegions();
      return true;
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete region');
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadRegions]);

  // Toggle region visibility
  const toggleRegionVisibility = useCallback(async (id, isActive) => {
    try {
      setSaving(true);
      await toggleRegionActive(id, isActive);
      toast.success(`Region ${isActive ? 'activated' : 'deactivated'} successfully`);
      await loadRegions();
      return true;
    } catch (error) {
      console.error('Error toggling region visibility:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update region');
      return false;
    } finally {
      setSaving(false);
    }
  }, [loadRegions]);

  // Toggle tariff featured status
  const toggleFeaturedTariff = useCallback(async (planId, isFeatured) => {
    try {
      await toggleTariffFeatured(planId, isFeatured);
      toast.success(isFeatured ? 'Plan marked as featured' : 'Plan removed from featured');
      // Update local state to reflect the change immediately
      setRegionTariffs(prev => prev.map(t =>
        t.id === planId ? { ...t, is_featured: isFeatured } : t
      ));
      return true;
    } catch (error) {
      console.error('Error toggling featured status:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update featured status');
      return false;
    }
  }, []);

  // Auto-load on mount and when filters change
  useEffect(() => {
    if (autoLoad) {
      loadRegions();
    }
  }, [autoLoad, appliedFilters, currentPage, rowsPerPage, sortColumn, sortDirection]);

  // Compute stats
  const totalRegions = pagination.total;
  const activeRegions = regions.filter(r => r.is_active).length;

  return {
    // Data
    regions,
    selectedRegion,
    regionTariffs,

    // Loading states
    loading,
    loadingTariffs,
    saving,

    // Pagination
    pagination,

    // Filters (UI state)
    searchTerm,
    setSearchTerm,
    selectedType,
    setSelectedType,
    showInactive,
    setShowInactive,

    // Applied filters
    appliedFilters,
    filtersChanged,
    applyFilters,
    clearFilters,

    // Sorting
    sortColumn,
    sortDirection,
    handleSortChange,

    // Pagination handlers
    currentPage,
    handlePageChange,
    rowsPerPage,
    handleRowsPerPageChange,

    // Actions
    loadRegions,
    loadRegionDetails,
    loadRegionTariffs,
    createNewRegion,
    updateExistingRegion,
    deleteExistingRegion,
    toggleRegionVisibility,
    toggleFeaturedTariff,
    setSelectedRegion,

    // Stats
    totalRegions,
    activeRegions
  };
}

export default useRegionsData;
