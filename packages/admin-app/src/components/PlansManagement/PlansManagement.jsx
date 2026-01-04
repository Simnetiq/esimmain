'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

// Components
import PlansHeader from './components/PlansHeader';
import PlansStatusBanner from './components/PlansStatusBanner';
import DataSourceTabs from './components/DataSourceTabs';
import PlansFilters from './components/PlansFilters';
import PlansSearch from './components/PlansSearch';
import SupabaseTable from './components/SupabaseTable';
import StandardTable from './components/StandardTable';
import PlansPagination from './components/PlansPagination';
import { FirebaseSyncModal, SupabaseSyncModal } from './components/SyncModals';

// Hooks and utilities
import usePlansData from './hooks/usePlansData';
import { DATA_SOURCES, PAGINATION } from './utils/helpers';

/**
 * Plans Management - Main Component
 *
 * Architecture:
 * - Supabase is the PRIMARY data source with server-side filtering
 * - Firebase is maintained as a SECONDARY/LEGACY data source
 * - Airalo API is for recovery/sync operations only
 */
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

  // Modal states
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);

  // Sync states
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncingSupabase, setSyncingSupabase] = useState(false);
  const [supabaseSyncResult, setSupabaseSyncResult] = useState(null);

  // Use the plans data hook
  const {
    // Data source
    dataSource,
    setDataSource,

    // Supabase data (primary)
    supabasePlans,
    loadingSupabase,
    supabasePagination,
    loadSupabasePlans,
    supabaseStatus,
    loadSupabaseStatus,
    supabaseCountries,

    // Firebase data (legacy)
    allPlans,
    loading,
    availableCountries,
    loadAllPlans,
    syncStatus,
    loadSyncStatus,

    // Airalo data
    airaloPlans,
    airaloCountries,
    loadingAiralo,
    loadAiraloData,

    // Topups data
    topups,
    loadingTopups,
    loadTopups,

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

    // Price editing (Firebase)
    editingPrices,
    setEditingPrices,
    pendingPriceChanges,
    setPendingPriceChanges,
    updatePlanPrice,

    // Mutations
    deletePlan,

    // Computed
    filteredPlans
  } = usePlansData(t);

  // ============================================
  // SYNC FUNCTIONS
  // ============================================

  const runSync = useCallback(async (options = {}) => {
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
  }, [loadAllPlans, loadSyncStatus]);

  const runSupabaseSync = useCallback(async (options = {}) => {
    const { dryRun = false } = options;

    try {
      setSyncingSupabase(true);
      setSupabaseSyncResult(null);

      const params = new URLSearchParams();
      if (dryRun) params.append('dry_run', 'true');

      const response = await fetch(`/api/sync-to-supabase?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      setSupabaseSyncResult(result);

      if (result.success) {
        toast.success(result.message);
        if (!dryRun) {
          await loadSupabaseStatus();
          await loadSupabasePlans({ showToast: true });
        }
      } else {
        toast.error(result.error || 'Supabase sync failed');
      }
    } catch (error) {
      toast.error('Failed to sync to Supabase');
      setSupabaseSyncResult({ success: false, error: error.message });
    } finally {
      setSyncingSupabase(false);
    }
  }, [loadSupabaseStatus, loadSupabasePlans]);

  // ============================================
  // TABLE HANDLERS
  // ============================================

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const currentPlans = getCurrentPagePlans();
      const newSelected = currentPlans.map((plan) => plan.id);
      setSelectedRows(newSelected);
      return;
    }
    setSelectedRows([]);
  };

  const handleRowClick = (event, id, clearAll = false) => {
    if (clearAll) {
      setSelectedRows([]);
      return;
    }

    const selectedIndex = selectedRows.indexOf(id);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selectedRows, id];
    } else if (selectedIndex === 0) {
      newSelected = selectedRows.slice(1);
    } else if (selectedIndex === selectedRows.length - 1) {
      newSelected = selectedRows.slice(0, -1);
    } else if (selectedIndex > 0) {
      newSelected = [
        ...selectedRows.slice(0, selectedIndex),
        ...selectedRows.slice(selectedIndex + 1),
      ];
    }
    setSelectedRows(newSelected);
  };

  // ============================================
  // PRICE EDITING HANDLERS (Firebase)
  // ============================================

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

  // ============================================
  // PAGINATION CALCULATIONS
  // ============================================

  const effectiveRowsPerPage = dataSource === DATA_SOURCES.SUPABASE ? rowsPerPage : PAGINATION.DEFAULT_ROWS_PER_PAGE;

  const getCurrentPagePlans = () => {
    if (dataSource === DATA_SOURCES.SUPABASE) {
      return supabasePlans;
    }
    const indexOfLastPlan = currentPage * effectiveRowsPerPage;
    const indexOfFirstPlan = indexOfLastPlan - effectiveRowsPerPage;
    return filteredPlans.slice(indexOfFirstPlan, indexOfLastPlan);
  };

  const getTotalPages = () => {
    if (dataSource === DATA_SOURCES.SUPABASE) {
      return supabasePagination.totalPages;
    }
    return Math.ceil(filteredPlans.length / effectiveRowsPerPage);
  };

  const getTotalItems = () => {
    if (dataSource === DATA_SOURCES.SUPABASE) {
      return supabasePagination.total;
    }
    return filteredPlans.length;
  };

  const currentPlans = getCurrentPagePlans();
  const totalPages = getTotalPages();
  const totalItems = getTotalItems();

  const emptyRows = currentPage > 1
    ? Math.max(0, currentPage * effectiveRowsPerPage - totalItems)
    : 0;

  // ============================================
  // STATUS REFRESH
  // ============================================

  const handleRefreshStatus = () => {
    if (dataSource === DATA_SOURCES.SUPABASE) {
      loadSupabaseStatus();
    } else {
      loadSyncStatus();
    }
  };

  // ============================================
  // RENDER
  // ============================================

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <PlansHeader
        onOpenFirebaseSync={() => setShowSyncModal(true)}
        onOpenSupabaseSync={() => setShowSupabaseModal(true)}
      />

      {/* Status Banner */}
      <PlansStatusBanner
        syncStatus={syncStatus}
        supabaseStatus={supabaseStatus}
        allPlansCount={allPlans.length}
        onRefreshStatus={handleRefreshStatus}
        dataSource={dataSource}
      />

      {/* Firebase Sync Modal */}
      <FirebaseSyncModal
        isOpen={showSyncModal}
        onClose={() => {
          setShowSyncModal(false);
          setSyncResult(null);
        }}
        allPlansCount={allPlans.length}
        syncStatus={syncStatus}
        syncing={syncing}
        syncResult={syncResult}
        onDryRun={() => runSync({ dryRun: true })}
        onFullSync={() => runSync({ dryRun: false, removeDeprecated: true })}
      />

      {/* Supabase Sync Modal */}
      <SupabaseSyncModal
        isOpen={showSupabaseModal}
        onClose={() => {
          setShowSupabaseModal(false);
          setSupabaseSyncResult(null);
        }}
        supabaseStatus={supabaseStatus}
        syncingSupabase={syncingSupabase}
        supabaseSyncResult={supabaseSyncResult}
        onDryRun={() => runSupabaseSync({ dryRun: true })}
        onFullSync={() => runSupabaseSync({ dryRun: false })}
      />

      {/* Data Source Tabs */}
      <DataSourceTabs
        dataSource={dataSource}
        onDataSourceChange={setDataSource}
        allPlansCount={allPlans.length}
        airaloPlansCount={airaloPlans.length}
        topupsCount={topups.length}
        supabasePlansCount={supabasePagination.total || supabasePlans.length}
        loadingAiralo={loadingAiralo}
        loadingTopups={loadingTopups}
        loadingSupabase={loadingSupabase}
        onLoadAiralo={loadAiraloData}
        onLoadTopups={loadTopups}
        onLoadSupabase={() => loadSupabasePlans({ showToast: true })}
        isRTL={isRTL}
      />

      {/* Search and Filters (Combined for Supabase) */}
      <PlansSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        hasSmsFilter={hasSmsFilter}
        onSmsFilterChange={setHasSmsFilter}
        hasVoiceFilter={hasVoiceFilter}
        onVoiceFilterChange={setHasVoiceFilter}
        // Countries lists
        availableCountries={availableCountries}
        airaloCountries={airaloCountries}
        supabaseCountries={supabaseCountries}
        // Filter state
        filtersChanged={filtersChanged}
        appliedFilters={appliedFilters}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        // Loading
        loading={loadingSupabase}
        // Context
        dataSource={dataSource}
        isRTL={isRTL}
        t={t}
      />

      {/* Category Filters (for non-Supabase views) */}
      <PlansFilters
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        hasSmsFilter={hasSmsFilter}
        onSmsFilterChange={setHasSmsFilter}
        hasVoiceFilter={hasVoiceFilter}
        onVoiceFilterChange={setHasVoiceFilter}
        filteredCount={totalItems}
        dataSource={dataSource}
      />

      {/* Plans Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {dataSource === DATA_SOURCES.SUPABASE ? (
          <SupabaseTable
            plans={currentPlans}
            selectedRows={selectedRows}
            onRowClick={handleRowClick}
            onSelectAllClick={handleSelectAllClick}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            onSort={handleSortChange}
            denseMode={denseMode}
            emptyRows={emptyRows}
          />
        ) : (
          <StandardTable
            plans={currentPlans}
            dataSource={dataSource}
            loading={loading}
            editingPrices={editingPrices}
            pendingPriceChanges={pendingPriceChanges}
            onStartEditingPrice={startEditingPrice}
            onPriceChange={handlePriceChange}
            onSavePrice={savePriceChange}
            onCancelPriceEdit={cancelPriceChange}
            onDeletePlan={deletePlan}
            isRTL={isRTL}
            t={t}
          />
        )}
      </div>

      {/* Dense Mode Toggle (Supabase only) */}
      {dataSource === DATA_SOURCES.SUPABASE && (
        <div className="flex items-center justify-end gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={denseMode}
              onChange={(e) => setDenseMode(e.target.checked)}
              className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
            />
            <span className="text-sm text-gray-600">Dense padding</span>
          </label>
        </div>
      )}

      {/* Pagination */}
      <PlansPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        rowsPerPage={effectiveRowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        dataSource={dataSource}
        isRTL={isRTL}
        t={t}
      />
    </div>
  );
};

export default PlansManagement;
