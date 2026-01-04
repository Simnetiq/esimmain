'use client';

import React, { useState } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { motion } from 'framer-motion';
import {
  Globe,
  Search,
  RefreshCw,
  Download,
  Upload,
  Languages,
  Info,
  X,
  Eye,
  EyeOff,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  ChevronDown
} from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { usePathname } from 'next/navigation';
import CountryEditModal from './CountryEditModal';
import CountryManageModal from './CountryManageModal';
import Image from 'next/image';
import useAdminCountries from '../hooks/useAdminCountries';
import {
  SUPPORTED_LANGUAGES,
  getLocalizedName
} from '../adapters/countryAdapter';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format timestamp to absolute date with timezone
 * @param {Date|string|number} timestamp - The timestamp to format
 * @returns {string} Formatted date string
 */
const formatAbsoluteTimestamp = (timestamp) => {
  if (!timestamp) return 'Never synced';

  try {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Never synced';

    // Format: "Jan 4, 2026, 3:45 PM EST"
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  } catch {
    return 'Never synced';
  }
};

/**
 * Get language count from translations object
 * @param {Object} translations - Translations object
 * @returns {number} Count of languages with translations
 */
const getLanguageCount = (translations) => {
  if (!translations || typeof translations !== 'object') return 0;
  return Object.keys(translations).filter(key =>
    translations[key] && translations[key].trim()
  ).length;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/**
 * Actions row with all controls
 */
const ActionsRow = ({
  isRTL,
  syncingPrices,
  onRecalculateAll,
  showTranslationsMenu,
  setShowTranslationsMenu,
  translatingCountries,
  onTranslateAll,
  onDownloadTemplate,
  uploadingJSON,
  onFileUpload,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  showHidden,
  setShowHidden,
  filteredCount,
  hiddenCount
}) => (
  <div className={`flex gap-3 flex-wrap items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
    {/* Update Stats Button */}
    <div className="relative group">
      <button
        onClick={onRecalculateAll}
        disabled={syncingPrices}
        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm"
      >
        {syncingPrices ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            <span>Updating...</span>
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            <span>Update All Stats</span>
          </>
        )}
      </button>
      <div className="absolute bottom-full left-0 mb-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-72 z-10 shadow-lg p-3">
        <p className="font-semibold mb-1 text-white">Supabase only - no API calls</p>
        <p className="text-gray-300">Recalculates plan counts &amp; min prices from existing dataplans.</p>
      </div>
    </div>

    {/* Translations Menu */}
    <TranslationsMenu
      showMenu={showTranslationsMenu}
      setShowMenu={setShowTranslationsMenu}
      translating={translatingCountries}
      onTranslateAll={onTranslateAll}
      onDownloadTemplate={onDownloadTemplate}
      uploadingJSON={uploadingJSON}
      onFileUpload={onFileUpload}
    />

    {/* Sorting */}
    <div className="relative">
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900"
      >
        <option value="name">Sort by Name</option>
        <option value="code">Sort by Code</option>
        <option value="planCount">Sort by Plans</option>
        <option value="minPrice">Sort by Price</option>
      </select>
      <ArrowUpDown className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>

    <button
      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
      className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
    >
      {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
    </button>

    {/* Show Hidden Toggle */}
    <button
      onClick={() => setShowHidden(!showHidden)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm ${
        showHidden
          ? 'bg-amber-100 text-amber-800 border border-amber-300'
          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      {showHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
      <span>{showHidden ? 'Showing Hidden' : 'Show Hidden'}</span>
    </button>

    {/* Count */}
    <div className="ml-auto text-sm text-gray-500">
      {filteredCount} {filteredCount === 1 ? 'country' : 'countries'}
      {showHidden && hiddenCount > 0 && (
        <span className="ml-1 text-amber-600">({hiddenCount} hidden)</span>
      )}
    </div>
  </div>
);

/**
 * Translations dropdown menu
 */
const TranslationsMenu = ({
  showMenu,
  setShowMenu,
  translating,
  onTranslateAll,
  onDownloadTemplate,
  uploadingJSON,
  onFileUpload
}) => (
  <div className="relative">
    <button
      onClick={() => setShowMenu(!showMenu)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm ${
        showMenu
          ? 'bg-blue-600 text-white'
          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
      }`}
    >
      <Languages className="w-4 h-4" />
      <span>Translations</span>
      <ChevronDown className={`w-4 h-4 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
    </button>

    {showMenu && (
      <>
        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
        <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900 text-sm">Translation Tools</h4>
              <button onClick={() => setShowMenu(false)} className="p-1 hover:bg-gray-200 rounded">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="p-2">
            <button
              onClick={() => { setShowMenu(false); onTranslateAll(); }}
              disabled={translating}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                {translating ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                ) : (
                  <Languages className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {translating ? 'Translating...' : 'Translate Missing Languages'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Uses AI to translate only missing languages.</p>
              </div>
            </button>

            <div className="border-t border-gray-100 my-2" />

            <button
              onClick={() => { setShowMenu(false); onDownloadTemplate(); }}
              className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
            >
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Download className="w-5 h-5 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">Download Template</p>
                <p className="text-xs text-gray-500 mt-0.5">Get a JSON template with example countries</p>
              </div>
            </button>

            <label className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={(e) => { setShowMenu(false); onFileUpload(e); }}
                disabled={uploadingJSON}
                className="hidden"
              />
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                {uploadingJSON ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600" />
                ) : (
                  <Upload className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {uploadingJSON ? 'Uploading...' : 'Upload JSON File'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Import countries with translations</p>
              </div>
            </label>
          </div>

          <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                <strong>Note:</strong> Translations are UI-only and don&apos;t affect payments.
              </p>
            </div>
          </div>
        </div>
      </>
    )}
  </div>
);

/**
 * Country card component - simplified design
 */
const CountryCard = ({
  country,
  currentLanguage,
  isRTL,
  togglingVisibility,
  onToggleVisibility,
  onManage
}) => {
  // Get localized display name
  const displayName = getLocalizedName(country, currentLanguage);
  const languageCount = getLanguageCount(country.translations);
  const lastSyncFormatted = formatAbsoluteTimestamp(country.lastSync || country.lastPriceSync);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 ${
        country.isHidden ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'
      }`}
    >
      <div className="p-5">
        {/* Header with Flag and Info */}
        <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {/* Country Flag - 4:3 aspect ratio */}
          <div className="w-20 h-15 rounded-lg border-2 border-gray-200 overflow-hidden flex-shrink-0 bg-gray-50 shadow-sm" style={{ aspectRatio: '4/3' }}>
            {(country.image?.url || country.imageUrl) ? (
              <Image
                src={country.image?.url || country.imageUrl}
                alt={displayName}
                width={80}
                height={60}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Globe className="w-8 h-8 text-gray-300" />
              </div>
            )}
          </div>

          {/* Country Name and Code */}
          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse justify-end' : ''}`}>
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {displayName}
              </h3>
              {country.isHidden && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded flex-shrink-0">
                  HIDDEN
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium">{country.code}</p>
          </div>

          {/* Visibility Toggle */}
          <button
            onClick={() => onToggleVisibility(country.id, country.isHidden)}
            disabled={togglingVisibility === country.id}
            className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
              country.isHidden
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'
            }`}
            title={country.isHidden ? 'Make visible' : 'Hide country'}
          >
            {togglingVisibility === country.id ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current" />
            ) : country.isHidden ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-100">
          {/* Plans & Price */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {country.planCount || 0}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
              Plans
            </div>
            {country.minPrice > 0 && (
              <div className="text-sm font-medium text-green-600 mt-1">
                from {formatPrice(country.minPrice)}
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {languageCount}
            </div>
            <div className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
              Languages
            </div>
            <div className="text-sm text-gray-400 mt-1">
              of {SUPPORTED_LANGUAGES.length}
            </div>
          </div>

          {/* Last Sync */}
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Last Synced
            </div>
            <div className="text-xs text-gray-600 leading-tight">
              {lastSyncFormatted}
            </div>
          </div>
        </div>

        {/* Manage Button - Single CTA */}
        <button
          onClick={() => onManage(country)}
          className="w-full mt-5 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium flex items-center justify-center gap-2"
        >
          Manage
        </button>
      </div>
    </motion.div>
  );
};

/**
 * Loading skeleton for country cards
 */
const CountryCardSkeleton = () => (
  <div className="bg-white border border-gray-200 rounded-xl p-5 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-20 h-15 rounded-lg bg-gray-200" style={{ aspectRatio: '4/3' }} />
      <div className="flex-1">
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-gray-100">
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-1" />
        <div className="h-3 bg-gray-200 rounded w-10 mx-auto" />
      </div>
      <div className="text-center">
        <div className="h-8 bg-gray-200 rounded w-8 mx-auto mb-1" />
        <div className="h-3 bg-gray-200 rounded w-16 mx-auto" />
      </div>
      <div className="text-center">
        <div className="h-3 bg-gray-200 rounded w-16 mx-auto mb-2" />
        <div className="h-3 bg-gray-200 rounded w-20 mx-auto" />
      </div>
    </div>
    <div className="h-10 bg-gray-200 rounded-lg w-full mt-5" />
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CountryManagement = () => {
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

  // Use the admin countries hook for all data operations
  const {
    countries,
    filteredCountries,
    loading,
    syncingPrices,
    togglingVisibility,
    uploadingJSON,
    translatingCountries,
    searchTerm,
    setSearchTerm,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    showHidden,
    setShowHidden,
    loadCountries,
    handleToggleVisibility,
    handleRecalculateAllStats,
    handleJSONUpload,
    handleTranslateAll
  } = useAdminCountries(currentLanguage);

  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [managingCountry, setManagingCountry] = useState(null);

  // Dropdown state for translations menu
  const [showTranslationsMenu, setShowTranslationsMenu] = useState(false);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const openManageModal = (country) => {
    setManagingCountry(country);
    setShowManageModal(true);
  };

  const closeManageModal = () => {
    setShowManageModal(false);
    setManagingCountry(null);
    loadCountries(); // Refresh data after closing
  };

  const handleEditFromManage = (country) => {
    setEditingCountry(country);
    setShowEditModal(true);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await handleJSONUpload(file, currentUser?.uid);
    event.target.value = '';
  };

  const downloadTemplate = () => {
    const template = [
      {
        code: "US",
        name: "United States",
        translations: {
          en: "United States",
          es: "Estados Unidos",
          fr: "Etats-Unis",
          de: "Vereinigte Staaten",
          ar: "الولايات المتحدة",
          he: "ארצות הברית",
          ru: "Соединенные Штаты"
        }
      },
      {
        code: "GB",
        name: "United Kingdom",
        translations: {
          en: "United Kingdom",
          es: "Reino Unido",
          fr: "Royaume-Uni",
          de: "Vereinigtes Konigreich",
          ar: "المملكة المتحدة",
          he: "הממלכה המאוחדת",
          ru: "Великобритания"
        }
      }
    ];

    const templateWithComments = {
      _README: {
        description: "Countries template for Simnetiq",
        fields: {
          code: "ISO 3166-1 alpha-2 country code (e.g., US, GB, DE)",
          name: "English name of the country (used as fallback)",
          translations: "Object with language codes as keys"
        }
      },
      countries: template
    };

    const blob = new Blob([JSON.stringify(templateWithComments, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'countries-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Country Management</h2>
        <p className="text-gray-600 mt-1">Manage countries, translations, photos, and pricing</p>
        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <p className="text-sm text-emerald-800">
            <strong>Supabase Connected:</strong> All country data is now read from and saved to Supabase. To fetch fresh data from Airalo API, go to <strong>Data Synchronization</strong> tab.
          </p>
        </div>
      </div>

      {/* Actions Row */}
      <ActionsRow
        isRTL={isRTL}
        syncingPrices={syncingPrices}
        onRecalculateAll={handleRecalculateAllStats}
        showTranslationsMenu={showTranslationsMenu}
        setShowTranslationsMenu={setShowTranslationsMenu}
        translatingCountries={translatingCountries}
        onTranslateAll={handleTranslateAll}
        onDownloadTemplate={downloadTemplate}
        uploadingJSON={uploadingJSON}
        onFileUpload={handleFileUpload}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        showHidden={showHidden}
        setShowHidden={setShowHidden}
        filteredCount={filteredCountries.length}
        hiddenCount={countries.filter(c => c.isHidden).length}
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
        <input
          type="text"
          placeholder={t('countryManagement.searchCountries', 'Search countries...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900`}
          style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
        />
      </div>

      {/* Countries Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CountryCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCountries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCountries.map((country) => (
            <CountryCard
              key={country.id}
              country={country}
              currentLanguage={currentLanguage}
              isRTL={isRTL}
              togglingVisibility={togglingVisibility}
              onToggleVisibility={handleToggleVisibility}
              onManage={openManageModal}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Globe className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No countries found</h3>
          <p className="text-gray-600 max-w-sm mx-auto">
            {searchTerm ? 'Try adjusting your search terms' : 'Upload a JSON file to add countries'}
          </p>
        </div>
      )}

      {/* Manage Country Modal (with plans table) */}
      <CountryManageModal
        isOpen={showManageModal}
        onClose={closeManageModal}
        country={managingCountry}
        onEditCountry={handleEditFromManage}
      />

      {/* Edit Country Modal */}
      <CountryEditModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingCountry(null); }}
        country={editingCountry}
        onSave={loadCountries}
      />
    </div>
  );
};

export default CountryManagement;
