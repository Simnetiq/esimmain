'use client';

import React, { useState, useEffect } from 'react';
import { storage } from '@esim/shared/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import {
  Plus,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Globe,
  Palette,
  Star,
  Eye,
  EyeOff,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  RefreshCw,
  Flag,
  Search,
  Trash2
} from 'lucide-react';
import Image from 'next/image';
import { RegionCard } from './regions';
import supabase from '../lib/supabase';

const RegionManagement = () => {
  const [regions, setRegions] = useState([]);
  const [filteredRegions, setFilteredRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRegion, setEditingRegion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [allPlans, setAllPlans] = useState([]);
  const [allCountries, setAllCountries] = useState([]);

  // Sorting and visibility states
  const [sortBy, setSortBy] = useState('order');
  const [sortOrder, setSortOrder] = useState('asc');
  const [showHidden, setShowHidden] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded region details
  const [expandedRegion, setExpandedRegion] = useState(null);

  // Country search in modal
  const [countrySearchTerm, setCountrySearchTerm] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '',
    color: '#0066CC',
    order: 0,
    imageUrl: '',
    topPlanIds: [],
    popularCountries: [],
    type: 'continent',
    translations: {
      en: '', ru: '', es: '', fr: '', de: '', ar: '', he: ''
    }
  });

  // ============================================================================
  // DATA FETCHING - Direct Supabase queries
  // ============================================================================

  const fetchRegions = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        toast.error('Supabase not configured');
        return;
      }

      // Fetch regions with their countries
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('*')
        .order('display_order', { ascending: true });

      if (regionsError) throw regionsError;

      // Fetch countries grouped by region
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, name, iso_code, image_url, region_id, plan_count, is_popular')
        .eq('is_active', true)
        .order('is_popular', { ascending: false })
        .order('name', { ascending: true });

      if (countriesError) throw countriesError;

      // Group countries by region
      const countriesByRegion = {};
      countriesData?.forEach(country => {
        if (country.region_id) {
          if (!countriesByRegion[country.region_id]) {
            countriesByRegion[country.region_id] = [];
          }
          countriesByRegion[country.region_id].push({
            id: country.id,
            name: country.name,
            code: country.iso_code?.toUpperCase(),
            imageUrl: country.image_url,
            image: { url: country.image_url },
            planCount: country.plan_count || 0,
            isPopular: country.is_popular
          });
        }
      });

      // Transform regions data
      const transformed = (regionsData || []).map(region => ({
        id: region.id,
        name: region.display_name || region.name,
        displayName: region.display_name,
        icon: region.metadata?.icon || '',
        color: region.metadata?.color || '#0066CC',
        order: region.display_order ?? 0,
        imageUrl: region.image_url || '',
        type: region.type || 'continent',
        isHidden: region.is_active === false,
        isActive: region.is_active !== false,
        planCount: region.plan_count || 0,
        countryCount: region.country_count || 0,
        minPrice: region.min_price,
        countries: countriesByRegion[region.id] || [],
        popularCountries: (countriesByRegion[region.id] || []).map(c => c.id),
        translations: region.metadata?.translations || {},
        topPlanIds: region.metadata?.topPlanIds || []
      }));

      setRegions(transformed);
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error('Failed to fetch regions: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('dataplans')
        .select('id, name, title, price, data_display, validity_days, is_regional, region_id')
        .eq('status', 'active')
        .eq('is_enabled', true)
        .eq('is_regional', true)
        .order('price', { ascending: true })
        .limit(100);

      if (error) throw error;

      setAllPlans((data || []).map(plan => ({
        id: plan.id,
        name: plan.name || plan.title,
        title: plan.title || plan.name,
        price: plan.price,
        data: plan.data_display,
        validity: plan.validity_days,
        is_regional: plan.is_regional,
        region_id: plan.region_id
      })));
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchCountries = async () => {
    try {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('countries')
        .select('id, name, iso_code, image_url, is_popular, plan_count, region_id')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;

      setAllCountries((data || []).map(country => ({
        id: country.id,
        name: country.name,
        code: country.iso_code?.toUpperCase() || country.id?.toUpperCase(),
        slug: country.id,
        imageUrl: country.image_url,
        image: { url: country.image_url },
        planCount: country.plan_count || 0,
        isPopular: country.is_popular || false,
        regionId: country.region_id
      })));
    } catch (error) {
      console.error('Error fetching countries:', error);
      toast.error('Failed to fetch countries');
    }
  };

  // ============================================================================
  // SYNC STATS - Recalculate region statistics
  // ============================================================================

  const syncRegionStats = async () => {
    try {
      toast.loading('Syncing region statistics...', { id: 'sync-regions' });

      if (!supabase) throw new Error('Supabase not configured');

      // Get all regions
      const { data: regions } = await supabase.from('regions').select('id');

      for (const region of (regions || [])) {
        // Count countries
        const { count: countryCount } = await supabase
          .from('countries')
          .select('*', { count: 'exact', head: true })
          .eq('region_id', region.id)
          .eq('is_active', true);

        // Count plans and get min price
        const { data: plans } = await supabase
          .from('dataplans')
          .select('price')
          .eq('region_id', region.id)
          .eq('status', 'active')
          .eq('is_enabled', true);

        const planCount = plans?.length || 0;
        const prices = plans?.map(p => parseFloat(p.price)).filter(p => p > 0) || [];
        const minPrice = prices.length > 0 ? Math.min(...prices) : null;

        // Update region
        await supabase
          .from('regions')
          .update({
            country_count: countryCount || 0,
            plan_count: planCount,
            min_price: minPrice,
            updated_at: new Date().toISOString()
          })
          .eq('id', region.id);
      }

      toast.success('✅ Region statistics synced', { id: 'sync-regions' });
      await fetchRegions();
    } catch (error) {
      console.error('Error syncing regions:', error);
      toast.error('Failed to sync: ' + error.message, { id: 'sync-regions' });
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    fetchRegions();
    fetchPlans();
    fetchCountries();
  }, []);

  useEffect(() => {
    let filtered = [...regions];

    if (!showHidden) {
      filtered = filtered.filter(region => !region.isHidden);
    }

    if (searchTerm.trim()) {
      filtered = filtered.filter(region =>
        region.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        region.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'countryCount':
          comparison = (a.countryCount || 0) - (b.countryCount || 0);
          break;
        default:
          comparison = (a.order || 0) - (b.order || 0);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredRegions(filtered);
  }, [regions, searchTerm, sortBy, sortOrder, showHidden]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const getRegionCountries = (region) => region.countries || [];
  const getRegionPlanCount = (region) => region.planCount || 0;

  const toggleRegionVisibility = async (regionId, currentlyHidden) => {
    try {
      setTogglingVisibility(regionId);

      const { error } = await supabase
        .from('regions')
        .update({ is_active: currentlyHidden, updated_at: new Date().toISOString() })
        .eq('id', regionId);

      if (error) throw error;

      toast.success(currentlyHidden ? `✅ ${regionId} is now visible` : `✅ ${regionId} is now hidden`);
      await fetchRegions();
    } catch (error) {
      console.error('Error toggling visibility:', error);
      toast.error(`Failed to update visibility for ${regionId}`);
    } finally {
      setTogglingVisibility(null);
    }
  };

  const handleCreate = () => {
    setFormData({
      id: '',
      name: '',
      icon: '',
      color: '#0066CC',
      order: regions.length,
      imageUrl: '',
      topPlanIds: [],
      popularCountries: [],
      type: 'continent',
      translations: { en: '', ru: '', es: '', fr: '', de: '', ar: '', he: '' }
    });
    setEditingRegion(null);
    setCountrySearchTerm('');
    setIsModalOpen(true);
  };

  const handleEdit = (region) => {
    const translations = {};
    if (region.translations) {
      Object.entries(region.translations).forEach(([lang, data]) => {
        translations[lang] = typeof data === 'string' ? data : (data?.name || '');
      });
    }
    ['en', 'ru', 'es', 'fr', 'de', 'ar', 'he'].forEach(lang => {
      if (!translations[lang]) translations[lang] = '';
    });

    setFormData({
      id: region.id,
      name: region.name || '',
      icon: region.icon || '',
      color: region.color || '#0066CC',
      order: region.order || 0,
      imageUrl: region.imageUrl || '',
      topPlanIds: region.topPlanIds || [],
      popularCountries: region.popularCountries || [],
      type: region.type || 'continent',
      translations
    });
    setEditingRegion(region);
    setCountrySearchTerm('');
    setIsModalOpen(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      const fileName = `regions/${formData.id || 'temp'}_${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, imageUrl: downloadURL }));
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.id) {
        toast.error('Region ID is required');
        return;
      }
      if (!formData.name) {
        toast.error('Region name is required');
        return;
      }

      if (!supabase) throw new Error('Supabase not configured');

      const payload = {
        name: formData.name,
        display_name: formData.name,
        slug: formData.id,
        type: formData.type,
        image_url: formData.imageUrl || null,
        display_order: formData.order,
        is_active: true,
        metadata: {
          icon: formData.icon,
          color: formData.color,
          translations: formData.translations,
          topPlanIds: formData.topPlanIds,
          popularCountries: formData.popularCountries
        },
        updated_at: new Date().toISOString()
      };

      if (editingRegion) {
        // Update existing
        const { error } = await supabase
          .from('regions')
          .update(payload)
          .eq('id', formData.id);

        if (error) throw error;
      } else {
        // Create new
        payload.id = formData.id;
        payload.created_at = new Date().toISOString();

        const { error } = await supabase
          .from('regions')
          .insert(payload);

        if (error) throw error;
      }

      // Update country region assignments if popularCountries changed
      if (formData.popularCountries?.length > 0) {
        // Assign selected countries to this region
        await supabase
          .from('countries')
          .update({ region_id: formData.id })
          .in('id', formData.popularCountries);
      }

      await fetchRegions();
      toast.success(editingRegion ? 'Region updated successfully' : 'Region created successfully');
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving region:', error);
      toast.error('Failed to save region: ' + error.message);
    }
  };

  const handleDelete = async (regionId) => {
    if (!confirm('Are you sure you want to delete this region?')) return;

    try {
      // First, remove region_id from countries
      await supabase
        .from('countries')
        .update({ region_id: null })
        .eq('region_id', regionId);

      // Then delete the region
      const { error } = await supabase
        .from('regions')
        .delete()
        .eq('id', regionId);

      if (error) throw error;

      toast.success('Region deleted successfully');
      await fetchRegions();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error('Failed to delete region');
    }
  };

  const togglePlanSelection = (planId) => {
    setFormData(prev => ({
      ...prev,
      topPlanIds: prev.topPlanIds.includes(planId)
        ? prev.topPlanIds.filter(id => id !== planId)
        : [...prev.topPlanIds, planId]
    }));
  };

  const toggleCountrySelection = (countryId) => {
    setFormData(prev => ({
      ...prev,
      popularCountries: prev.popularCountries.includes(countryId)
        ? prev.popularCountries.filter(id => id !== countryId)
        : [...prev.popularCountries, countryId]
    }));
  };

  const filteredCountriesInModal = countrySearchTerm.trim()
    ? allCountries.filter(c =>
        c.name?.toLowerCase().includes(countrySearchTerm.toLowerCase()) ||
        c.code?.toLowerCase().includes(countrySearchTerm.toLowerCase())
      )
    : allCountries;

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Region Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage regions with {allCountries.length} countries available
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Region
        </button>
      </div>

      {/* Actions Row */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="appearance-none px-4 py-2.5 pr-10 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-gray-900"
          >
            <option value="order">Sort by Order</option>
            <option value="name">Sort by Name</option>
            <option value="countryCount">Sort by Countries</option>
          </select>
          <ArrowUpDown className="w-4 h-4 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 pointer-events-none" />
        </div>

        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
        </button>

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

        <button
          onClick={syncRegionStats}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Sync Stats
        </button>

        <button
          onClick={fetchRegions}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        <div className="ml-auto text-sm text-gray-500">
          {filteredRegions.length} regions
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search regions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      {/* Regions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRegions.map((region) => (
          <RegionCard
            key={region.id}
            region={region}
            countries={getRegionCountries(region)}
            planCount={getRegionPlanCount(region)}
            isExpanded={expandedRegion === region.id}
            togglingVisibility={togglingVisibility}
            onToggleVisibility={toggleRegionVisibility}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleExpand={() => setExpandedRegion(expandedRegion === region.id ? null : region.id)}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredRegions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No regions found</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingRegion ? 'Edit Region' : 'Create Region'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Basic Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Region ID *</label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      disabled={!!editingRegion}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                      placeholder="e.g., asia, europe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="e.g., Asia"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="global">Global</option>
                      <option value="continent">Continent</option>
                      <option value="region">Region</option>
                      <option value="special">Special</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon (Emoji)</label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      placeholder="🌏"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Palette className="w-4 h-4" /> Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                      />
                      <input
                        type="text"
                        value={formData.color}
                        onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Region Image
                </h4>
                {formData.imageUrl && (
                  <div className="relative">
                    <img src={formData.imageUrl} alt="Region" className="w-full h-48 object-cover rounded-lg border" />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">{uploadingImage ? 'Uploading...' : 'Click to upload'}</p>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploadingImage} />
                </label>
              </div>

              {/* Countries Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Flag className="w-4 h-4" /> Countries ({formData.popularCountries?.length || 0} selected)
                </h4>
                <p className="text-xs text-gray-500">{allCountries.length} countries available</p>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search countries (e.g., Thailand, France)..."
                    value={countrySearchTerm}
                    onChange={(e) => setCountrySearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {filteredCountriesInModal.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      {countrySearchTerm ? `No countries found for "${countrySearchTerm}"` : 'Loading countries...'}
                    </div>
                  ) : (
                    filteredCountriesInModal.map((country) => (
                      <label
                        key={country.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={formData.popularCountries?.includes(country.id)}
                          onChange={() => toggleCountrySelection(country.id)}
                          className="w-4 h-4 text-gray-900 rounded border-gray-300"
                        />
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {country.imageUrl ? (
                            <div className="w-8 h-6 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                              <Image
                                src={country.imageUrl}
                                alt={country.name}
                                width={32}
                                height={24}
                                className="w-full h-full object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-6 bg-gray-100 rounded flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-gray-900 truncate">{country.name}</span>
                          <span className="text-xs text-gray-400">({country.code})</span>
                          {country.planCount > 0 && (
                            <span className="text-xs text-green-600 ml-auto">{country.planCount} plans</span>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Featured Plans */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="w-4 h-4" /> Featured Plans ({formData.topPlanIds?.length || 0} selected)
                </h4>
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {allPlans.map((plan) => (
                    <label
                      key={plan.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.topPlanIds?.includes(plan.id)}
                        onChange={() => togglePlanSelection(plan.id)}
                        className="w-4 h-4 text-gray-900 rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{plan.title || plan.name}</div>
                        <div className="text-xs text-gray-500">${plan.price} • {plan.data} • {plan.validity} days</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg">
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
              >
                <Save className="w-4 h-4" />
                {editingRegion ? 'Update' : 'Create'} Region
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionManagement;
