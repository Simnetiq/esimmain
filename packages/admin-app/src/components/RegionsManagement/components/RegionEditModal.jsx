'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  Globe,
  Image as ImageIcon,
  Loader2,
  MapPin,
  Languages,
  Settings,
  Sparkles,
  Star,
  GripVertical,
  Plus,
  Trash2,
  Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getRegionTypes,
  fetchPromotedCountries,
  updatePromotedCountries,
  fetchAllCountries
} from '../../../services/regionService';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
];

const RegionEditModal = ({
  isOpen,
  onClose,
  region,
  onSave,
  saving
}) => {
  const isEditing = !!region;
  const regionTypes = getRegionTypes();

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    slug: '',
    name: '',
    display_name: '',
    type: 'region',
    image_url: '',
    display_order: 0,
    is_active: true,
    translations: {},
    metadata: {}
  });

  const [activeTab, setActiveTab] = useState('basic');
  const [errors, setErrors] = useState({});
  const [translating, setTranslating] = useState(false);

  // Promoted countries state
  const [promotedCountries, setPromotedCountries] = useState([]);
  const [allCountries, setAllCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const [savingPromoted, setSavingPromoted] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // Auto-translate region name using ChatGPT
  const handleAutoTranslate = async () => {
    const nameToTranslate = formData.name || formData.display_name;
    if (!nameToTranslate) {
      toast.error('Please enter a region name first');
      return;
    }

    try {
      setTranslating(true);
      toast.loading('Translating with AI...', { id: 'translate-region' });

      const response = await fetch('/api/translate-regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regionId: formData.id || 'new-region',
          regionName: nameToTranslate
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Translation failed');
      }

      // Update translations in form - handle both simple and full formats
      const newTranslations = { ...formData.translations };
      if (result.fullTranslations) {
        // API returned full format with source info
        Object.keys(result.fullTranslations).forEach(lang => {
          newTranslations[lang] = {
            ...newTranslations[lang],
            name: result.fullTranslations[lang].name,
            source: result.fullTranslations[lang].source
          };
        });
      } else if (result.translations) {
        // API returned simple format
        Object.keys(result.translations).forEach(lang => {
          newTranslations[lang] = {
            ...newTranslations[lang],
            name: result.translations[lang]
          };
        });
      }

      setFormData(prev => ({
        ...prev,
        translations: newTranslations
      }));

      toast.success('Translations generated successfully!', { id: 'translate-region' });
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(`Translation failed: ${error.message}`, { id: 'translate-region' });
    } finally {
      setTranslating(false);
    }
  };

  // Load promoted countries for this region
  const loadPromotedCountries = useCallback(async (regionId) => {
    if (!regionId) return;

    try {
      setLoadingCountries(true);
      const data = await fetchPromotedCountries(regionId);
      setPromotedCountries(data);
    } catch (error) {
      console.error('Error loading promoted countries:', error);
      // Don't show error toast - table might not exist yet
    } finally {
      setLoadingCountries(false);
    }
  }, []);

  // Load all countries for selection
  const loadAllCountries = useCallback(async () => {
    try {
      const data = await fetchAllCountries({ hasPlans: true });
      setAllCountries(data);
    } catch (error) {
      console.error('Error loading countries:', error);
    }
  }, []);

  // Initialize form with region data
  useEffect(() => {
    if (region) {
      setFormData({
        id: region.id,
        slug: region.slug,
        name: region.name,
        display_name: region.display_name || '',
        type: region.type,
        image_url: region.image_url || '',
        display_order: region.display_order,
        is_active: region.is_active,
        translations: region.translations || {},
        metadata: region.metadata || {}
      });

      // Load promoted countries
      loadPromotedCountries(region.id);
    } else {
      // Reset for new region
      setFormData({
        id: '',
        slug: '',
        name: '',
        display_name: '',
        type: 'region',
        image_url: '',
        display_order: 0,
        is_active: true,
        translations: {},
        metadata: {}
      });
      setPromotedCountries([]);
    }
    setErrors({});
    setActiveTab('basic');
  }, [region, isOpen, loadPromotedCountries]);

  // Load all countries when modal opens
  useEffect(() => {
    if (isOpen) {
      loadAllCountries();
    }
  }, [isOpen, loadAllCountries]);

  // Handle field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Handle translation changes
  const handleTranslationChange = (langCode, field, value) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [langCode]: {
          ...prev.translations[langCode],
          [field]: value
        }
      }
    }));
  };

  // Auto-generate slug from name
  const handleNameChange = (name) => {
    handleChange('name', name);
    if (!isEditing && !formData.id) {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      handleChange('id', slug);
      handleChange('slug', slug);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.id.trim()) {
      newErrors.id = 'Region ID is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.id)) {
      newErrors.id = 'ID must contain only lowercase letters, numbers, and hyphens';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Region name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validateForm()) return;

    await onSave({
      id: formData.id,
      slug: formData.slug || formData.id,
      name: formData.name,
      display_name: formData.display_name || formData.name,
      type: formData.type,
      image_url: formData.image_url || undefined,
      display_order: formData.display_order,
      is_active: formData.is_active,
      translations: formData.translations,
      metadata: formData.metadata
    });
  };

  // ============================================
  // PROMOTED COUNTRIES HANDLERS
  // ============================================

  // Add country to promoted list
  const handleAddPromotedCountry = (country) => {
    if (promotedCountries.length >= 8) {
      toast.error('Maximum 8 promoted countries per region');
      return;
    }

    if (promotedCountries.some(p => p.countryId === country.id)) {
      toast.error('Country already in promoted list');
      return;
    }

    const newPromoted = {
      countryId: country.id,
      countryCode: country.iso_code,
      countryName: country.name,
      countryImage: country.image_url,
      planCount: country.plan_count || 0,
      position: promotedCountries.length
    };

    setPromotedCountries(prev => [...prev, newPromoted]);
    setCountrySearchTerm('');
  };

  // Remove country from promoted list
  const handleRemovePromotedCountry = (countryId) => {
    setPromotedCountries(prev =>
      prev.filter(p => p.countryId !== countryId)
        .map((p, index) => ({ ...p, position: index }))
    );
  };

  // Drag and drop handlers
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPromoted = [...promotedCountries];
    const [draggedItem] = newPromoted.splice(draggedIndex, 1);
    newPromoted.splice(index, 0, draggedItem);

    // Update positions
    const updated = newPromoted.map((p, i) => ({ ...p, position: i }));
    setPromotedCountries(updated);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Save promoted countries
  const handleSavePromotedCountries = async () => {
    if (!region?.id) {
      toast.error('Please save the region first');
      return;
    }

    try {
      setSavingPromoted(true);
      const countries = promotedCountries.map((p, index) => ({
        countryId: p.countryId,
        position: index
      }));

      await updatePromotedCountries(region.id, countries);
      toast.success('Promoted countries updated successfully');
    } catch (error) {
      console.error('Error saving promoted countries:', error);
      toast.error(error.message || 'Failed to save promoted countries');
    } finally {
      setSavingPromoted(false);
    }
  };

  // Filter countries for search
  const filteredCountries = allCountries.filter(country => {
    if (!countrySearchTerm) return false;
    const term = countrySearchTerm.toLowerCase();
    return (
      country.name?.toLowerCase().includes(term) ||
      country.iso_code?.toLowerCase().includes(term)
    );
  }).slice(0, 10);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {isEditing ? 'Edit Region' : 'Create New Region'}
              </h2>
              <p className="text-sm text-gray-500">
                {isEditing ? `Editing ${region.name}` : 'Add a new region to your catalog'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-200">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Basic Info
              </div>
            </button>
            <button
              onClick={() => setActiveTab('promoted')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'promoted'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4" />
                Promoted Countries
                {promotedCountries.length > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    {promotedCountries.length}/8
                  </span>
                )}
              </div>
            </button>
            <button
              onClick={() => setActiveTab('translations')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'translations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4" />
                Translations
              </div>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              {/* ID and Name Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region ID *
                  </label>
                  <input
                    type="text"
                    value={formData.id}
                    onChange={(e) => handleChange('id', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    disabled={isEditing}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.id ? 'border-red-500' : 'border-gray-300'
                    } ${isEditing ? 'bg-gray-100' : ''}`}
                    placeholder="e.g., asia, europe"
                  />
                  {errors.id && (
                    <p className="mt-1 text-xs text-red-600">{errors.id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="e.g., Asia"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name}</p>
                  )}
                </div>
              </div>

              {/* Display Name and Type Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={formData.display_name}
                    onChange={(e) => handleChange('display_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Discover Asia"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Optional marketing name shown to users
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {regionTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" />
                    Image URL
                  </div>
                </label>
                <div className="flex gap-3">
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => handleChange('image_url', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://..."
                  />
                  {formData.image_url && (
                    <div className="w-16 h-10 rounded-lg overflow-hidden border border-gray-200">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Display Order */}
              <div className="w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={formData.display_order}
                  onChange={(e) => handleChange('display_order', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
            </div>
          )}

          {/* Promoted Countries Tab */}
          {activeTab === 'promoted' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">Promoted Countries</h4>
                  <p className="text-sm text-gray-500">
                    Select up to 8 countries to feature on the Hero page for this region.
                    Drag to reorder.
                  </p>
                </div>
                {isEditing && promotedCountries.length > 0 && (
                  <button
                    onClick={handleSavePromotedCountries}
                    disabled={savingPromoted}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
                  >
                    {savingPromoted ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Order
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Search to add countries */}
              <div className="relative">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={countrySearchTerm}
                    onChange={(e) => setCountrySearchTerm(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Search countries to add..."
                    disabled={promotedCountries.length >= 8}
                  />
                </div>

                {/* Search Results Dropdown */}
                {filteredCountries.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCountries.map(country => (
                      <button
                        key={country.id}
                        onClick={() => handleAddPromotedCountry(country)}
                        disabled={promotedCountries.some(p => p.countryId === country.id)}
                        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {country.image_url ? (
                          <img
                            src={country.image_url}
                            alt={country.name}
                            className="w-8 h-6 object-cover rounded border border-gray-200"
                          />
                        ) : (
                          <div className="w-8 h-6 bg-gray-100 rounded flex items-center justify-center">
                            <MapPin className="w-4 h-4 text-gray-400" />
                          </div>
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium text-gray-900">{country.name}</div>
                          <div className="text-xs text-gray-500">
                            {country.iso_code} • {country.plan_count || 0} plans
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-blue-600" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Promoted Countries List */}
              {loadingCountries ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-500">Loading...</span>
                </div>
              ) : promotedCountries.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">No promoted countries yet</p>
                  <p className="text-sm text-gray-400">Search and add countries above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {promotedCountries.map((country, index) => (
                    <div
                      key={country.countryId}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-3 p-3 bg-white border rounded-lg cursor-move transition-all ${
                        draggedIndex === index ? 'opacity-50 border-blue-300' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Drag Handle */}
                      <GripVertical className="w-4 h-4 text-gray-400 flex-shrink-0" />

                      {/* Position Badge */}
                      <div className="w-6 h-6 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {index + 1}
                      </div>

                      {/* Country Image */}
                      {country.countryImage ? (
                        <img
                          src={country.countryImage}
                          alt={country.countryName}
                          className="w-10 h-7 object-cover rounded border border-gray-200 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-7 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-gray-400" />
                        </div>
                      )}

                      {/* Country Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate">
                          {country.countryName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {country.countryCode} • {country.planCount || 0} plans
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemovePromotedCountry(country.countryId)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        title="Remove from promoted"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isEditing && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Note:</strong> Save the region first to enable promoted countries management.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Translations Tab */}
          {activeTab === 'translations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Add translations for the region name and description in different languages.
                </p>
                <button
                  type="button"
                  onClick={handleAutoTranslate}
                  disabled={translating || !formData.name}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                >
                  {translating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Translate with AI
                    </>
                  )}
                </button>
              </div>
              <div className="grid gap-4">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <div key={lang.code} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                      <span className="text-lg">{lang.code === 'ar' ? '🇸🇦' : lang.code === 'he' ? '🇮🇱' : lang.code === 'ru' ? '🇷🇺' : lang.code === 'es' ? '🇪🇸' : lang.code === 'fr' ? '🇫🇷' : lang.code === 'de' ? '🇩🇪' : '🇺🇸'}</span>
                      {lang.name}
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Name
                        </label>
                        <input
                          type="text"
                          value={formData.translations[lang.code]?.name || ''}
                          onChange={(e) => handleTranslationChange(lang.code, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder={`${formData.name || 'Region name'} in ${lang.name}`}
                          dir={lang.code === 'ar' || lang.code === 'he' ? 'rtl' : 'ltr'}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Description
                        </label>
                        <input
                          type="text"
                          value={formData.translations[lang.code]?.description || ''}
                          onChange={(e) => handleTranslationChange(lang.code, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional description"
                          dir={lang.code === 'ar' || lang.code === 'he' ? 'rtl' : 'ltr'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              {/* Active Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">Active Status</h4>
                  <p className="text-sm text-gray-500">
                    Inactive regions are hidden from users
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => handleChange('is_active', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {/* Metadata (JSON) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metadata (JSON)
                </label>
                <textarea
                  value={JSON.stringify(formData.metadata, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      handleChange('metadata', parsed);
                    } catch {
                      // Invalid JSON, don't update
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                  placeholder="{}"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Additional metadata stored as JSON
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditing ? 'Update Region' : 'Create Region'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RegionEditModal;
