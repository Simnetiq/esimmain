'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  fetchCountries,
  updateCountry,
  deleteCountryWithPlans,
  toggleCountryVisibility as toggleVisibility,
  recalculateCountryStats,
  recalculateAllCountryStats,
  importCountriesFromJSON,
  updateCountryTranslations
} from '../services/countryService';

/**
 * Hook for managing countries in admin panel
 * Handles all CRUD operations, filtering, sorting, and stats
 */
export function useAdminCountries(currentLanguage = 'en') {
  // Data state
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showHidden, setShowHidden] = useState(false);

  // Operation states
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncingCountry, setSyncingCountry] = useState(null);
  const [togglingVisibility, setTogglingVisibility] = useState(null);
  const [uploadingJSON, setUploadingJSON] = useState(false);

  // Translation states
  const [translatingCountries, setTranslatingCountries] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0 });

  // ============================================================================
  // LOAD COUNTRIES
  // ============================================================================

  const loadCountries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCountries(currentLanguage);
      setCountries(data);
    } catch (error) {
      console.error('Failed to load countries:', error);
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  }, [currentLanguage]);

  // Initial load
  useEffect(() => {
    loadCountries();
  }, [loadCountries]);

  // ============================================================================
  // FILTER AND SORT
  // ============================================================================

  useEffect(() => {
    let filtered = [...countries];

    // Filter by visibility
    if (!showHidden) {
      filtered = filtered.filter(country => !country.isHidden);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(country =>
        country.code?.toLowerCase().includes(term) ||
        country.name?.toLowerCase().includes(term) ||
        Object.values(country.translations || {}).some(translation =>
          translation?.toLowerCase().includes(term)
        )
      );
    }

    // Sort countries
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'code':
          comparison = (a.code || '').localeCompare(b.code || '');
          break;
        case 'planCount':
          comparison = (a.planCount || 0) - (b.planCount || 0);
          break;
        case 'minPrice':
          comparison = (a.minPrice || 0) - (b.minPrice || 0);
          break;
        default:
          comparison = (a.name || '').localeCompare(b.name || '');
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredCountries(filtered);
  }, [countries, searchTerm, sortBy, sortOrder, showHidden]);

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const handleUpdateCountry = useCallback(async (countryId, updates) => {
    try {
      await updateCountry(countryId, updates);
      await loadCountries();
      toast.success('Country updated successfully');
    } catch (error) {
      console.error('Failed to update country:', error);
      toast.error('Failed to update country');
      throw error;
    }
  }, [loadCountries]);

  const handleDeleteCountry = useCallback(async (countryId, countryName) => {
    if (!window.confirm(`Are you sure you want to delete "${countryName}" (${countryId})? This will also delete all associated plans.`)) {
      return false;
    }

    try {
      setLoading(true);
      const { deletedPlans } = await deleteCountryWithPlans(countryId);
      toast.success(`Deleted "${countryName}" and ${deletedPlans} associated plans`);
      await loadCountries();
      return true;
    } catch (error) {
      console.error('Failed to delete country:', error);
      toast.error('Failed to delete country');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadCountries]);

  const handleToggleVisibility = useCallback(async (countryId, currentlyHidden) => {
    try {
      setTogglingVisibility(countryId);
      await toggleVisibility(countryId, currentlyHidden); // If currently hidden, make active
      toast.success(currentlyHidden ? `${countryId} is now visible` : `${countryId} is now hidden`);
      await loadCountries();
    } catch (error) {
      console.error('Failed to toggle visibility:', error);
      toast.error(`Failed to update visibility for ${countryId}`);
    } finally {
      setTogglingVisibility(null);
    }
  }, [loadCountries]);

  // ============================================================================
  // STATS OPERATIONS
  // ============================================================================

  const handleRecalculateStats = useCallback(async (countryId) => {
    try {
      setSyncingCountry(countryId);
      const { planCount, minPrice } = await recalculateCountryStats(countryId);

      if (planCount === 0) {
        toast.error(`No plans found for ${countryId}. Use "Sync All Prices" to fetch from Airalo API.`, {
          icon: '???',
          duration: 5000
        });
      } else {
        toast.success(`Updated ${countryId}: ${planCount} plans, min price $${(minPrice || 0).toFixed(2)}`);
      }

      await loadCountries();
    } catch (error) {
      console.error(`Error syncing ${countryId}:`, error);
      toast.error(`Failed to sync ${countryId}: ${error.message || 'Unknown error'}`);
    } finally {
      setSyncingCountry(null);
    }
  }, [loadCountries]);

  const handleRecalculateAllStats = useCallback(async () => {
    try {
      setSyncingPrices(true);
      toast.loading('Recalculating stats for all countries...', { id: 'sync-all' });

      const { updated, totalPlans } = await recalculateAllCountryStats();

      toast.success(`Updated all countries: ${updated} countries with ${totalPlans} total plans`, { id: 'sync-all' });
      await loadCountries();
    } catch (error) {
      console.error('Error syncing all countries:', error);
      toast.error(`Failed to update countries: ${error.message || 'Unknown error'}`, { id: 'sync-all' });
    } finally {
      setSyncingPrices(false);
    }
  }, [loadCountries]);

  // ============================================================================
  // IMPORT OPERATIONS
  // ============================================================================

  const handleJSONUpload = useCallback(async (file, userId) => {
    try {
      setUploadingJSON(true);

      const fileContent = await file.text();
      const parsedData = JSON.parse(fileContent);

      let countriesData;
      if (Array.isArray(parsedData)) {
        countriesData = parsedData;
      } else if (parsedData.countries && Array.isArray(parsedData.countries)) {
        countriesData = parsedData.countries;
      } else {
        throw new Error('JSON must be an array of countries or have a "countries" array property');
      }

      const { successCount, errorCount, skippedCount } = await importCountriesFromJSON(countriesData, userId);

      const message = [];
      if (successCount > 0) message.push(`${successCount} uploaded`);
      if (skippedCount > 0) message.push(`${skippedCount} skipped (missing code/name)`);
      if (errorCount > 0) message.push(`${errorCount} errors`);

      toast.success(`${message.join(', ')}`);
      await loadCountries();

    } catch (error) {
      console.error('Error processing JSON:', error);
      toast.error(`Failed to process JSON: ${error.message}`);
    } finally {
      setUploadingJSON(false);
    }
  }, [loadCountries]);

  // ============================================================================
  // TRANSLATION OPERATIONS
  // ============================================================================

  const handleTranslateAll = useCallback(async () => {
    try {
      setTranslatingCountries(true);
      setTranslationProgress({ current: 0, total: countries.length });

      toast.loading('Translating countries to all languages...', { id: 'translate-countries' });

      // Call translation API
      const response = await fetch('/api/translate-countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ translateAll: true })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Translation failed');
      }

      toast.success(
        `Translation complete! ${result.summary.translated} countries translated, ${result.summary.skipped} skipped`,
        { id: 'translate-countries', duration: 5000 }
      );

      await loadCountries();
    } catch (error) {
      console.error('Error translating countries:', error);
      toast.error(`Translation failed: ${error.message}`, { id: 'translate-countries' });
    } finally {
      setTranslatingCountries(false);
      setTranslationProgress({ current: 0, total: 0 });
    }
  }, [countries.length, loadCountries]);

  const handleUpdateTranslations = useCallback(async (countryId, translations) => {
    try {
      await updateCountryTranslations(countryId, translations);
      await loadCountries();
      toast.success('Translations updated successfully');
    } catch (error) {
      console.error('Failed to update translations:', error);
      toast.error('Failed to update translations');
      throw error;
    }
  }, [loadCountries]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    // Data
    countries,
    filteredCountries,

    // Loading states
    loading,
    syncingPrices,
    syncingCountry,
    togglingVisibility,
    uploadingJSON,
    translatingCountries,
    translationProgress,

    // Filter/Sort state
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    showHidden,
    setShowHidden,

    // Actions
    loadCountries,
    handleUpdateCountry,
    handleDeleteCountry,
    handleToggleVisibility,
    handleRecalculateStats,
    handleRecalculateAllStats,
    handleJSONUpload,
    handleTranslateAll,
    handleUpdateTranslations
  };
}

export default useAdminCountries;
