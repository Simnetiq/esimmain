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
import PlansSearch from './components/PlansSearch';
import SupabaseTable from './components/SupabaseTable';
import PlansPagination from './components/PlansPagination';
import { AiraloSyncModal } from './components/SyncModals';

// Hooks and utilities
import usePlansData from './hooks/usePlansData';
import { DATA_SOURCES } from './utils/helpers';

/**
 * Plans Management - Main Component
 *
 * Architecture:
 * - Supabase is the PRIMARY data source with server-side filtering
 * - Airalo API is for sync operations
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

  // Modal state
  const [showSyncModal, setShowSyncModal] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Use the plans data hook
  const {
    // Supabase data (primary)
    supabasePlans,
    loadingSupabase,
    supabasePagination,
    loadSupabasePlans,
    supabaseStatus,
    loadSupabaseStatus,
    supabaseCountries,
    syncStatus,
    loadSyncStatus,

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
          await loadSupabasePlans({ showToast: true });
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
  }, [loadSupabasePlans, loadSyncStatus]);

  // ============================================
  // TABLE HANDLERS
  // ============================================

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = supabasePlans.map((plan) => plan.id);
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
  // PAGINATION
  // ============================================

  const totalPages = supabasePagination.totalPages;
  const totalItems = supabasePagination.total;
  const emptyRows = currentPage > 1
    ? Math.max(0, currentPage * rowsPerPage - totalItems)
    : 0;

  // ============================================
  // RENDER
  // ============================================

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <PlansHeader
        onOpenAiraloSync={() => setShowSyncModal(true)}
      />

      {/* Status Banner */}
      <PlansStatusBanner
        syncStatus={syncStatus}
        supabaseStatus={supabaseStatus}
        onRefreshStatus={loadSupabaseStatus}
        dataSource="supabase"
      />

      {/* Airalo Sync Modal */}
      <AiraloSyncModal
        isOpen={showSyncModal}
        onClose={() => {
          setShowSyncModal(false);
          setSyncResult(null);
        }}
        allPlansCount={supabasePagination.total || 0}
        syncStatus={syncStatus}
        syncing={syncing}
        syncResult={syncResult}
        onDryRun={() => runSync({ dryRun: true })}
        onFullSync={() => runSync({ dryRun: false, removeDeprecated: true })}
      />

      {/* Search and Filters */}
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
        availableCountries={[]}
        airaloCountries={[]}
        supabaseCountries={supabaseCountries}
        filtersChanged={filtersChanged}
        appliedFilters={appliedFilters}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        loading={loadingSupabase}
        dataSource="supabase"
        isRTL={isRTL}
        t={t}
      />

      {/* Plans Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <SupabaseTable
          plans={supabasePlans}
          selectedRows={selectedRows}
          onRowClick={handleRowClick}
          onSelectAllClick={handleSelectAllClick}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSortChange}
          denseMode={denseMode}
          emptyRows={emptyRows}
        />
      </div>

      {/* Pagination + Dense toggle */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={denseMode}
            onChange={(e) => setDenseMode(e.target.checked)}
            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
          />
          <span className="text-sm text-gray-500">Dense</span>
        </label>
        <PlansPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          dataSource="supabase"
          isRTL={isRTL}
          t={t}
        />
      </div>
    </div>
  );
};

export default PlansManagement;
