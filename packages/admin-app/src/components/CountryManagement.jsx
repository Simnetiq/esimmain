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
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import { usePathname } from 'next/navigation';
import CountryEditModal from './CountryEditModal';
import TariffManagement from './TariffManagement';
import Image from 'next/image';
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
      const countriesData = JSON.parse(fileContent);

      if (!Array.isArray(countriesData)) {
        throw new Error('JSON must be an array of countries');
      }

      // Validate and upload each country
      let successCount = 0;
      let errorCount = 0;

      for (const country of countriesData) {
        try {
          if (!country.code || !country.name) {
            errorCount++;
            continue;
          }

          const countryRef = doc(db, 'countries', country.code);
          await setDoc(countryRef, {
            code: country.code,
            name: country.name,
            translations: country.translations || {},
            photo: country.photo || '',
            description: country.description || '',
            isActive: country.isActive !== false,
            status: 'active',
            updated_at: serverTimestamp(),
            updated_by: currentUser?.uid || 'admin',
            source: 'json_upload'
          }, { merge: true });

          successCount++;
        } catch {
          errorCount++;
        }
      }

      toast.success(`✅ Uploaded ${successCount} countries successfully!${errorCount > 0 ? ` (${errorCount} errors)` : ''}`);
      
      // Reload countries
      await loadCountries();
      
      // Reset file input
      event.target.value = '';
      
    } catch {
      toast.error('Failed to process JSON');
    } finally {
      setUploadingJSON(false);
    }
  };

  // Download template JSON
  const downloadTemplate = () => {
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
      }
    ];

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'countries-template.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded! Edit and upload it back.');
  };

  // Sync prices from Airalo for specific country
  // This function reads existing plans from Firebase and updates country stats
  // Note: To fetch fresh data from Airalo, use "Sync All Prices" button
  const syncCountryPricesFromAiralo = async (countryCode) => {
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
  const syncAllCountriesFromAiralo = async () => {
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
        onSyncPrices={syncCountryPricesFromAiralo}
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
            <strong>Note:</strong> To fetch fresh data from RoamJet API, go to <strong>API Config</strong> tab and use the sync buttons there. The buttons here recalculate stats from existing data in Firebase.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className={`flex gap-3 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          title="Download JSON template"
        >
          <Download className="w-4 h-4" />
          <span>Download Template</span>
        </button>
        
        <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer">
          <input
            type="file"
            accept=".json"
            onChange={handleJSONUpload}
            disabled={uploadingJSON}
            className="hidden"
          />
          {uploadingJSON ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              <span>Upload JSON</span>
            </>
          )}
        </label>
        
        <button
          onClick={syncAllCountriesFromAiralo}
          disabled={syncingPrices}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors text-sm"
          title="Recalculate stats for all countries from existing plans in Firebase"
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
                    {country.photo ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-gray-200">
                        <Image 
                          src={country.photo} 
                          alt={country.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                        />
                        {/* Flag badge overlay */}
                        <div className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-tl border-l border-t border-gray-200">
                          <FlagIcon 
                            countryCode={country.code} 
                            size="xs" 
                            squared={true}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg border-2 border-gray-200 overflow-hidden flex items-center justify-center bg-gray-50">
                        <FlagIcon 
                          countryCode={country.code} 
                          size="lg" 
                          squared={false}
                        />
                      </div>
                    )}
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
                  onClick={() => syncCountryPricesFromAiralo(country.code)}
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
