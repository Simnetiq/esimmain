'use client';

import React, { useState } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';

// Components
import RegionsHeader from './components/RegionsHeader';
import RegionsStatusBanner from './components/RegionsStatusBanner';
import RegionsSearch from './components/RegionsSearch';
import RegionsTable from './components/RegionsTable';
import RegionsPagination from './components/RegionsPagination';
import RegionEditModal from './components/RegionEditModal';
import RegionDetailModal from './components/RegionDetailModal';

// Hooks
import useRegionsData from '../../hooks/useRegionsData';

/**
 * Regions Management - Main Component
 *
 * Architecture:
 * - Supabase is the PRIMARY data source with server-side filtering
 * - Shows all regions with country counts and tariff info
 * - Allows editing popular countries and featured tariffs per region
 */
const RegionsManagement = () => {
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRegion, setEditingRegion] = useState(null);
  const [viewingRegion, setViewingRegion] = useState(null);

  // Selection state
  const [selectedRows, setSelectedRows] = useState([]);
  const [denseMode, setDenseMode] = useState(false);

  // Use the regions data hook
  const {
    // Data
    regions,
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
    loadRegionTariffs,
    createNewRegion,
    updateExistingRegion,
    deleteExistingRegion,
    toggleRegionVisibility,
    toggleFeaturedTariff,

    // Stats
    totalRegions,
    activeRegions
  } = useRegionsData({ autoLoad: true });

  // ============================================
  // MODAL HANDLERS
  // ============================================

  const handleCreateRegion = () => {
    setEditingRegion(null);
    setShowEditModal(true);
  };

  const handleEditRegion = (region) => {
    setEditingRegion(region);
    setShowEditModal(true);
  };

  const handleViewRegion = async (region) => {
    setViewingRegion(region);
    await loadRegionTariffs(region.id, 100); // Load up to 100 tariffs
    setShowDetailModal(true);
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingRegion(null);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setViewingRegion(null);
  };

  // ============================================
  // CRUD HANDLERS
  // ============================================

  const handleSaveRegion = async (data) => {
    if ('id' in data && editingRegion) {
      // Update
      const result = await updateExistingRegion(data);
      if (result) {
        handleCloseEditModal();
      }
    } else {
      // Create
      const result = await createNewRegion(data);
      if (result) {
        handleCloseEditModal();
      }
    }
  };

  const handleDeleteRegion = async (regionId) => {
    if (!confirm('Are you sure you want to delete this region? This action cannot be undone.')) {
      return;
    }

    await deleteExistingRegion(regionId);
  };

  const handleToggleVisibility = async (regionId, currentlyActive) => {
    await toggleRegionVisibility(regionId, !currentlyActive);
  };

  // ============================================
  // TABLE HANDLERS
  // ============================================

  const handleSelectAllClick = (event) => {
    if (event.target.checked) {
      const newSelected = regions.map((region) => region.id);
      setSelectedRows(newSelected);
      return;
    }
    setSelectedRows([]);
  };

  const handleRowClick = (_event, id, clearAll = false) => {
    if (clearAll || id === null) {
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
  // RENDER
  // ============================================

  if (!currentUser) {
    return null;
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <RegionsHeader
        onCreateRegion={handleCreateRegion}
        onRefresh={() => loadRegions({ showToast: true })}
        loading={loading}
      />

      {/* Status Banner */}
      <RegionsStatusBanner
        totalRegions={totalRegions}
        activeRegions={activeRegions}
        loading={loading}
      />

      {/* Search and Filters */}
      <RegionsSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        showInactive={showInactive}
        onShowInactiveChange={setShowInactive}
        filtersChanged={filtersChanged}
        onApplyFilters={applyFilters}
        onClearFilters={clearFilters}
        loading={loading}
        isRTL={isRTL}
      />

      {/* Regions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <RegionsTable
          regions={regions}
          selectedRows={selectedRows}
          onRowClick={handleRowClick}
          onSelectAllClick={handleSelectAllClick}
          sortColumn={sortColumn}
          sortDirection={sortDirection}
          onSort={handleSortChange}
          denseMode={denseMode}
          onEdit={handleEditRegion}
          onView={handleViewRegion}
          onDelete={handleDeleteRegion}
          onToggleVisibility={handleToggleVisibility}
          loading={loading}
        />
      </div>

      {/* Dense Mode Toggle */}
      <div className="flex items-center justify-end gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={denseMode}
            onChange={(e) => setDenseMode(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-600">Dense padding</span>
        </label>
      </div>

      {/* Pagination */}
      <RegionsPagination
        currentPage={currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        rowsPerPage={rowsPerPage}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        isRTL={isRTL}
      />

      {/* Edit/Create Modal */}
      {showEditModal && (
        <RegionEditModal
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          region={editingRegion}
          onSave={handleSaveRegion}
          saving={saving}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && viewingRegion && (
        <RegionDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          region={viewingRegion}
          tariffs={regionTariffs}
          loadingTariffs={loadingTariffs}
          onEdit={() => {
            handleCloseDetailModal();
            handleEditRegion(viewingRegion);
          }}
          onToggleFeatured={toggleFeaturedTariff}
        />
      )}
    </div>
  );
};

export default RegionsManagement;
