'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc,
  serverTimestamp,
  where,
  orderBy 
} from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe,
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Upload,
  Download,
  Languages,
  FileText,
  MoreVertical,
  Info,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { usePathname } from 'next/navigation';
import CountryEditModal from './CountryEditModal';
import TariffManagement from './TariffManagement';
import FlagIcon from '@esim/shared/components/FlagIcon';

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

  // State Management
  const [loading, setLoading] = useState(false);
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingJSON, setUploadingJSON] = useState(false);
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCountry, setEditingCountry] = useState(null);
  
  // Airalo sync states
  const [syncingPrices, setSyncingPrices] = useState(false);
  const [syncingCountry, setSyncingCountry] = useState(null);
  
  // Expanded country details
  const [expandedCountry, setExpandedCountry] = useState(null);
  
  // Tariff management view
  const [showTariffManagement, setShowTariffManagement] = useState(false);
  const [selectedCountryForTariffs, setSelectedCountryForTariffs] = useState(null);
  
  // Translation states
  const [translatingCountries, setTranslatingCountries] = useState(false);
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0 });
  
  // Dropdown state for translations menu
  const [showTranslationsMenu, setShowTranslationsMenu] = useState(false);

  // Load countries on component mount
  useEffect(() => {
    if (currentUser) {
      loadCountries();
    }
  }, [currentUser]);

  // Filter countries based on search term
  useEffect(() => {
    let filtered = [...countries];

    if (searchTerm.trim()) {
      filtered = filtered.filter(country => 
        country.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        Object.values(country.translations || {}).some(translation => 
          translation.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    setFilteredCountries(filtered);
  }, [countries, searchTerm]);

  // Load all countries from Firebase
  const loadCountries = async () => {
    try {
      setLoading(true);
      const countriesSnapshot = await getDocs(
        query(collection(db, 'countries'), orderBy('name', 'asc'))
      );
      
      const countriesData = countriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCountries(countriesData);
    } catch {
      toast.error('Failed to load countries');
    } finally {
      setLoading(false);
    }
  };

  // Handle JSON file upload
  const handleJSONUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingJSON(true);
      
      // Read file
      const fileContent = await file.text();
      const parsedData = JSON.parse(fileContent);

      // Support both formats: 
      // 1. Array of countries (old format)
      // 2. Object with 'countries' key (new format with _README)
      let countriesData;
      if (Array.isArray(parsedData)) {
        countriesData = parsedData;
      } else if (parsedData.countries && Array.isArray(parsedData.countries)) {
        countriesData = parsedData.countries;
      } else {
        throw new Error('JSON must be an array of countries or have a "countries" array property');
      }

      // Validate and upload each country
      let successCount = 0;
      let errorCount = 0;
      let skippedCount = 0;

      for (const country of countriesData) {
        try {
          // Validate required fields
          if (!country.code || !country.name) {
            skippedCount++;
            continue;
          }
          
          // Normalize country code to uppercase
          const normalizedCode = country.code.toUpperCase();

          const countryRef = doc(db, 'countries', normalizedCode);
          await setDoc(countryRef, {
            code: normalizedCode,
            name: country.name,
            translations: country.translations || {},
            description: country.description || '',
            isActive: country.isActive !== false,
            status: 'active',
            updated_at: serverTimestamp(),
            updated_by: currentUser?.uid || 'admin',
            source: 'json_upload'
          }, { merge: true });

          successCount++;
        } catch (err) {
          console.error(`Error uploading country ${country.code}:`, err);
          errorCount++;
        }
      }

      const message = [];
      if (successCount > 0) message.push(`${successCount} uploaded`);
      if (skippedCount > 0) message.push(`${skippedCount} skipped (missing code/name)`);
      if (errorCount > 0) message.push(`${errorCount} errors`);
      
      toast.success(`✅ ${message.join(', ')}`);
      
      // Reload countries
      await loadCountries();
      
      // Reset file input
      event.target.value = '';
      
    } catch (err) {
      console.error('Error processing JSON:', err);
      toast.error(`Failed to process JSON: ${err.message}`);
    } finally {
      setUploadingJSON(false);
    }
  };

  // Download template JSON
  const downloadTemplate = () => {
    // Template with examples - code must be ISO 3166-1 alpha-2 (lowercase works too)
    // Flag SVGs are served from /flags/4x3/{code}.svg
    const template = [
      {
        code: "US",
        name: "United States",
        translations: {
          en: "United States",
          es: "Estados Unidos",
          fr: "États-Unis",
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
          de: "Vereinigtes Königreich",
          ar: "المملكة المتحدة",
          he: "הממלכה המאוחדת",
          ru: "Великобритания"
        }
      },
      {
        code: "DE",
        name: "Germany",
        translations: {
          en: "Germany",
          es: "Alemania",
          fr: "Allemagne",
          de: "Deutschland",
          ar: "ألمانيا",
          he: "גרמניה",
          ru: "Германия"
        }
      }
    ];

    // Add comment explaining the format
    const templateWithComments = {
      _README: {
        description: "Countries template for Simnetiq",
        fields: {
          code: "ISO 3166-1 alpha-2 country code (e.g., US, GB, DE). Used for flag display (/flags/4x3/{code}.svg)",
          name: "English name of the country (used as fallback)",
          translations: "Object with language codes as keys (en, es, fr, de, ar, he, ru)"
        },
        notes: [
          "Flag SVGs must exist in /public/flags/4x3/ folder",
          "Translations are for UI display only - do not affect Stripe payments",
          "Use 'Translate All' button to auto-translate missing languages with AI"
        ]
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
    
    toast.success('Template downloaded! Check the _README section for instructions.');
  };

  // Recalculate stats for a specific country from Firebase data
  // NOTE: This does NOT call Airalo API - it reads from Firebase dataplans collection
  // To fetch fresh data from Airalo, go to Plans Management > Sync with Airalo
  const recalculateCountryStats = async (countryCode) => {
    try {
      setSyncingCountry(countryCode);
      
      // Query plans directly from Firebase for this country
      const plansQuery = query(
        collection(db, 'dataplans'),
        where('country_codes', 'array-contains', countryCode)
      );
      
      const plansSnapshot = await getDocs(plansQuery);
      const countryPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (countryPlans.length === 0) {
        toast.error(`No plans found for ${countryCode}. Use "Sync All Prices" to fetch from Airalo API.`, {
          icon: '⚠️',
          duration: 5000
        });
        
        // Still update the country to show it was checked
        const countryRef = doc(db, 'countries', countryCode);
        await updateDoc(countryRef, {
          planCount: 0,
          lastPriceSync: serverTimestamp(),
          lastSyncBy: currentUser?.uid || 'admin'
        });
        
        await loadCountries();
        return;
      }
      
      // Calculate min price from the plans
      const prices = countryPlans.map(p => parseFloat(p.price) || 0).filter(p => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      
      // Update country's plan count, minPrice, and last sync
      const countryRef = doc(db, 'countries', countryCode);
      await updateDoc(countryRef, {
        planCount: countryPlans.length,
        minPrice: minPrice,
        status: 'active',
        lastPriceSync: serverTimestamp(),
        lastSyncBy: currentUser?.uid || 'admin'
      });
      
      toast.success(
        `✅ Updated ${countryCode}: ${countryPlans.length} plans, min price $${minPrice.toFixed(2)}`
      );
      
      // Reload countries to show updated data
      await loadCountries();
      
    } catch (error) {
      console.error(`Error syncing ${countryCode}:`, error);
      toast.error(`Failed to sync ${countryCode}: ${error.message || 'Unknown error'}`);
    } finally {
      setSyncingCountry(null);
    }
  };

  // Recalculate stats for all countries from existing Firebase data
  // NOTE: This does NOT call Airalo API - it only reads from Firebase dataplans collection
  const recalculateAllCountryStats = async () => {
    try {
      setSyncingPrices(true);
      
      toast.loading('Recalculating stats for all countries...', { id: 'sync-all' });
      
      // Fetch ALL plans from Firebase dataplans collection
      const plansSnapshot = await getDocs(collection(db, 'dataplans'));
      const allPlans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get all existing countries from Firebase
      const countriesSnapshot = await getDocs(collection(db, 'countries'));
      const existingCountries = countriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let countriesUpdated = 0;
      
      // Update each country with plan count and min price
      for (const country of existingCountries) {
        const countryCode = country.code || country.id;
        
        // Filter plans for this country
        const countryPlans = allPlans.filter(plan => {
          if (plan.country_codes && Array.isArray(plan.country_codes)) {
            return plan.country_codes.includes(countryCode);
          }
          if (plan.country_ids && Array.isArray(plan.country_ids)) {
            return plan.country_ids.includes(countryCode);
          }
          return false;
        });
        
        // Calculate min price
        const prices = countryPlans.map(p => parseFloat(p.price) || 0).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        
        // Update country in Firebase (even if no plans, to show 0)
        const countryRef = doc(db, 'countries', countryCode);
        await updateDoc(countryRef, {
          planCount: countryPlans.length,
          minPrice: minPrice,
          status: 'active',
          lastPriceSync: serverTimestamp(),
          lastSyncBy: currentUser?.uid || 'admin'
        });
        
        countriesUpdated++;
      }
      
      toast.success(
        `✅ Updated all countries: ${countriesUpdated} countries with ${allPlans.length} total plans`,
        { id: 'sync-all' }
      );
      
      // Reload countries
      await loadCountries();
      
    } catch (error) {
      console.error('Error syncing all countries:', error);
      toast.error(`Failed to update countries: ${error.message || 'Unknown error'}`, { id: 'sync-all' });
    } finally {
      setSyncingPrices(false);
    }
  };

  // Translate all countries to all supported languages
  const translateAllCountries = async () => {
    try {
      setTranslatingCountries(true);
      setTranslationProgress({ current: 0, total: countries.length });
      
      toast.loading('Translating countries to all languages...', { id: 'translate-countries' });
      
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
        `✅ Translation complete! ${result.summary.translated} countries translated, ${result.summary.skipped} skipped`,
        { id: 'translate-countries', duration: 5000 }
      );
      
      // Reload countries to show updated translations
      await loadCountries();
      
    } catch (error) {
      console.error('Error translating countries:', error);
      toast.error(`Translation failed: ${error.message}`, { id: 'translate-countries' });
    } finally {
      setTranslatingCountries(false);
      setTranslationProgress({ current: 0, total: 0 });
    }
  };

  // Delete country
  const deleteCountry = async (countryCode, countryName) => {
    if (!window.confirm(`Are you sure you want to delete "${countryName}" (${countryCode})? This will also delete all associated plans.`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Delete all plans for this country
      const plansQuery = query(
        collection(db, 'dataplans'),
        where('country_codes', 'array-contains', countryCode)
      );
      const plansSnapshot = await getDocs(plansQuery);
      
      const deletePromises = plansSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      // Delete country
      await deleteDoc(doc(db, 'countries', countryCode));
      
      toast.success(`Deleted "${countryName}" and ${plansSnapshot.docs.length} associated plans`);
      await loadCountries();
      
    } catch {
      toast.error('Failed to delete country');
    } finally {
      setLoading(false);
    }
  };

  // Open tariff management for a country
  const openTariffManagement = (country) => {
    setSelectedCountryForTariffs(country);
    setShowTariffManagement(true);
  };

  // Close tariff management
  const closeTariffManagement = () => {
    setShowTariffManagement(false);
    setSelectedCountryForTariffs(null);
    // Reload countries to show updated plan counts
    loadCountries();
  };

  // If showing tariff management, render that instead
  if (showTariffManagement && selectedCountryForTariffs) {
    return (
      <TariffManagement
        countryCode={selectedCountryForTariffs.code}
        countryName={selectedCountryForTariffs.name}
        onBack={closeTariffManagement}
        onSyncPrices={recalculateCountryStats}
      />
    );
  }

  return (
    <div className="space-y-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Country Management</h2>
        <p className="text-gray-600 mt-1">Manage countries, translations, photos, and pricing</p>
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> To fetch fresh data from Airalo API, go to <strong>Data Synchronization</strong> tab and use the sync buttons there. The buttons here recalculate stats from existing data in Firebase.
          </p>
        </div>
      </div>

      {/* Actions Row */}
      <div className={`flex gap-3 flex-wrap items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
        {/* Update Stats Button */}
        <div className="relative group">
          <button
            onClick={recalculateAllCountryStats}
            disabled={syncingPrices}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm"
          >
            {syncingPrices ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Updating...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Update All Stats</span>
              </>
            )}
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full left-full -ml-4 mb-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-72 z-10 shadow-lg p-3">
            <p className="font-semibold mb-1 text-white">No API calls - Firebase only</p>
            <p className="text-white">Recalculates plan counts &amp; min prices from existing dataplans collection. Does not fetch from Airalo API.</p>
            <div className="absolute top-full left-3 transform translate-y-0 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        {/* Translations Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowTranslationsMenu(!showTranslationsMenu)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-colors text-sm ${
              showTranslationsMenu 
                ? 'bg-tufts-blue text-white' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Languages className="w-4 h-4" />
            <span>Translations</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showTranslationsMenu ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Dropdown Menu */}
          {showTranslationsMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowTranslationsMenu(false)}
              />
              {/* Menu */}
              <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 text-sm">Translation Tools</h4>
                    <button 
                      onClick={() => setShowTranslationsMenu(false)}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage country name translations for UI display
                  </p>
                </div>
                
                {/* Menu Items */}
                <div className="p-2">
                  {/* Translate All */}
                  <button
                    onClick={() => {
                      setShowTranslationsMenu(false);
                      translateAllCountries();
                    }}
                    disabled={translatingCountries}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="w-9 h-9 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0">
                      {translatingCountries ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-tufts-blue"></div>
                      ) : (
                        <Languages className="w-5 h-5 text-tufts-blue" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {translatingCountries ? 'Translating...' : 'Translate Missing Languages'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Uses AI to translate <strong>only missing</strong> languages. Existing translations are preserved.
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Safe to run multiple times
                      </p>
                    </div>
                  </button>
                  
                  <div className="border-t border-gray-100 my-2"></div>
                  
                  {/* Download Template */}
                  <button
                    onClick={() => {
                      setShowTranslationsMenu(false);
                      downloadTemplate();
                    }}
                    className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      <Download className="w-5 h-5 text-gray-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">Download Template</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Get a JSON template with example countries and translations structure
                      </p>
                    </div>
                  </button>
                  
                  {/* Upload JSON */}
                  <label className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        setShowTranslationsMenu(false);
                        handleJSONUpload(e);
                      }}
                      disabled={uploadingJSON}
                      className="hidden"
                    />
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                      {uploadingJSON ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      ) : (
                        <Upload className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">
                        {uploadingJSON ? 'Uploading...' : 'Upload JSON File'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Import countries with translations. Uses merge mode - <strong>overwrites</strong> matching fields but keeps other data.
                      </p>
                    </div>
                  </label>
                </div>
                
                {/* Info Footer */}
                <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      <strong>Note:</strong> Translations are UI-only and don&apos;t affect Stripe payments. Country codes (US, GB) are used for checkout.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Countries Count */}
        <div className="ml-auto text-sm text-gray-500">
          {filteredCountries.length} {filteredCountries.length === 1 ? 'country' : 'countries'}
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5`} />
        <input
          type="text"
          placeholder={t('countryManagement.searchCountries', 'Search countries...')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900`}
          style={{ textAlign: isRTL ? 'right' : 'left', direction: isRTL ? 'rtl' : 'ltr' }}
        />
      </div>

      {/* Countries Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCountries.map((country) => (
          <motion.div
            key={country.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Country Header */}
            <div className="p-4">
              <div className={`flex items-center justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
                      <FlagIcon 
                        countryCode={country.code} 
                        size="lg" 
                        squared={false}
                      />
                    </div>
                  </div>
                  <div>
                    <h3 className={`text-base font-semibold text-gray-900 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {country.translations?.[currentLanguage] || country.name}
                    </h3>
                    <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {country.code}
                    </p>
                  </div>
                </div>
                
                <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <button
                    onClick={() => {
                      setEditingCountry(country);
                      setShowEditModal(true);
                    }}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                    title="Edit country"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => deleteCountry(country.code, country.name)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
                    title="Delete country"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Country Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="text-xl font-bold text-cool-black">
                    {country.planCount || 0}
                  </div>
                  <div className="text-xs text-cool-black">Plans</div>
                </div>
                <div className={`text-center ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div className="text-xl font-bold text-cool-black">
                    {formatPrice(country.minPrice || 0)}
                  </div>
                  <div className="text-xs text-cool-black">Min Price</div>
                </div>
              </div>

              {/* Languages */}
              <div className={`mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center gap-2">
                  {(() => {
                    const supportedLanguages = [
                      { code: 'en', name: 'English', flag: '🇺🇸' },
                      { code: 'es', name: 'Spanish', flag: '🇪🇸' },
                      { code: 'fr', name: 'French', flag: '🇫🇷' },
                      { code: 'de', name: 'German', flag: '🇩🇪' },
                      { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
                      { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
                      { code: 'ru', name: 'Russian', flag: '🇷🇺' }
                    ];
                    
                    const availableLanguages = Object.keys(country.translations || {});
                    const translationCount = availableLanguages.length;
                    const translationFlags = availableLanguages
                      .slice(0, 3)
                      .map(langCode => 
                        supportedLanguages.find(lang => lang.code === langCode)?.flag || '🌐'
                      )
                      .join(' ');
                    
                    return (
                      <>
                        <span className="text-sm">{translationFlags}</span>
                        <span className="text-xs font-medium text-cool-black">
                          {translationCount} {translationCount === 1 ? 'language' : 'languages'}
                        </span>
                        {translationCount > 3 && (
                          <span className="text-gray-500 text-xs">+{translationCount - 3}</span>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Last Sync Info */}
              {country.lastPriceSync && (
                <div className={`text-xs text-cool-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Last synced: {new Date(country.lastPriceSync.toDate()).toLocaleDateString()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => recalculateCountryStats(country.code)}
                  disabled={syncingCountry === country.code}
                  className="flex-1 px-2 py-1.5 bg-tufts-blue text-white rounded-full flex items-center justify-center gap-2 text-xs"
                  title="Recalculate stats from existing plans in Firebase"
                >
                  {syncingCountry === country.code ? (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Update
                </button>
                
                <button
                  onClick={() => openTariffManagement(country)}
                  className="flex-1 px-2 py-1.5 bg-cool-black text-white rounded-full  flex items-center justify-center gap-2 "
                >
                  <DollarSign className="w-4 h-4" />
                  Manage
                </button>
                
                <button
                  onClick={() => setExpandedCountry(
                    expandedCountry === country.code ? null : country.code
                  )}
                  className="px-2 py-1.5 bg-gray-100 text-gray-700 rounded-full  flex items-center gap-1 text-sm"
                >
                  {expandedCountry === country.code ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Details
                </button>
              </div>

              {/* Expanded Details */}
              <AnimatePresence>
                {expandedCountry === country.code && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <div className="space-y-3">
                      {/* Translations */}
                      <div>
                        <h4 className="text-base font-medium text-gray-700 mb-2">Translations</h4>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(country.translations || {}).map(([lang, translation]) => (
                            <div key={lang} className="flex justify-between">
                              <span className="text-gray-500 uppercase">{lang}:</span>
                              <span className="text-gray-900">{translation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Source Info */}
                      <div>
                        <h4 className="text-base font-medium text-gray-700 mb-2">Source</h4>
                        <div className="text-xs text-gray-600">
                          {country.source || 'Manual'}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCountries.length === 0 && !loading && (
        <div className="text-center py-12">
          <Globe className="w-10 h-10 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No countries found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm ? 'Try adjusting your search terms' : 'Upload a JSON file to add countries'}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm">Loading countries...</p>
        </div>
      )}

      {/* Edit Country Modal */}
      <CountryEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingCountry(null);
        }}
        country={editingCountry}
        onSave={loadCountries}
      />
    </div>
  );
};

export default CountryManagement;
