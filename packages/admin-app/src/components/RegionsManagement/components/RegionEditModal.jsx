'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Globe,
  Image as ImageIcon,
  Upload,
  Loader2,
  MapPin,
  Languages,
  Settings,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getRegionTypes } from '../../../services/regionService';

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
    }
    setErrors({});
    setActiveTab('basic');
  }, [region, isOpen]);

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
