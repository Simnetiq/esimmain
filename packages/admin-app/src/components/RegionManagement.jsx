'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@esim/shared/firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  const [sortBy, setSortBy] = useState('order'); // 'order', 'name', 'countryCount'
  const [sortOrder, setSortOrder] = useState('asc');
  const [showHidden, setShowHidden] = useState(false);
  const [togglingVisibility, setTogglingVisibility] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Expanded region details
  const [expandedRegion, setExpandedRegion] = useState(null);

  // Default regions configuration - only geographic regions from Airalo
  const DEFAULT_REGIONS = [
    { id: 'global', name: 'Global', icon: '🌐', order: 0, type: 'global' },
    { id: 'europe', name: 'Europe', icon: '🇪🇺', order: 1, type: 'regional' },
    { id: 'asia', name: 'Asia', icon: '🌏', order: 2, type: 'regional' },
    { id: 'americas', name: 'Americas', icon: '🌎', order: 3, type: 'regional' },
    { id: 'africa', name: 'Africa', icon: '🌍', order: 4, type: 'regional' },
    { id: 'oceania', name: 'Oceania', icon: '🌏', order: 5, type: 'regional' }
  ];

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
    type: 'regional',
    translations: {
      en: '',
      ru: '',
      es: '',
      fr: '',
      de: '',
      ar: '',
      he: ''
    }
  });

  // Fetch all regions
  const fetchRegions = async () => {
    try {
      setLoading(true);
      const regionsRef = collection(db, 'regions');
      const q = query(regionsRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);

      const regionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // If no regions exist, create defaults
      if (regionsData.length === 0) {
        await initializeDefaultRegions();
        return;
      }

      setRegions(regionsData);
    } catch (error) {
      console.error('Error fetching regions:', error);
      toast.error('Failed to fetch regions');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all plans for top plans selection and region analysis
  const fetchPlans = async () => {
    try {
      const plansRef = collection(db, 'dataplans');
      const snapshot = await getDocs(plansRef);
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllPlans(plansData);
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  // Sync region data from Airalo plans (auto-populate countries and images)
  // Finds regional plans by matching country_slug to region names
  const syncRegionsFromPlans = async () => {
    try {
      toast.loading('Syncing regions from Airalo plans...', { id: 'sync-regions' });

      // Fetch all plans
      const plansSnapshot = await getDocs(collection(db, 'dataplans'));
      const plans = plansSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${plans.length} total plans`);

      // Find all regional plans (plans with multiple countries)
      const regionalPlans = plans.filter(plan =>
        plan.is_regional === true ||
        (plan.country_codes && plan.country_codes.length > 1) ||
        plan.region_type === 'regional' ||
        plan.region_type === 'global'
      );
      console.log(`🌍 Found ${regionalPlans.length} regional plans`);

      // Log unique country_slug values to understand naming
      const uniqueSlugs = [...new Set(regionalPlans.map(p => p.country_slug).filter(Boolean))];
      console.log('📋 Regional plan country_slugs:', uniqueSlugs);

      // Fetch current regions
      const regionsSnapshot = await getDocs(collection(db, 'regions'));
      const existingRegions = regionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📍 Found ${existingRegions.length} regions to sync`);

      let updatedCount = 0;

      for (const region of existingRegions) {
        // Skip special regions
        if (region.type === 'special' || region.id === 'all' || region.id === 'popular') {
          console.log(`⏭️ Skipping special region: ${region.id}`);
          continue;
        }

        // Build patterns to match this region in plan data
        const regionPatterns = [region.id.toLowerCase(), region.name?.toLowerCase()].filter(Boolean);

        // Add variations for common regions
        if (region.id === 'europe') regionPatterns.push('european', 'eurolink', 'eu-');
        if (region.id === 'asia') regionPatterns.push('asian', 'asialink');
        if (region.id === 'africa') regionPatterns.push('african', 'africalink');
        if (region.id === 'americas') regionPatterns.push('america', 'latin', 'caribbean', 'north-america', 'south-america', 'latam');
        if (region.id === 'oceania') regionPatterns.push('pacific', 'australia');

        // Find plans that match this region by country_slug
        const matchingPlans = regionalPlans.filter(plan => {
          const slug = (plan.country_slug || '').toLowerCase();
          const title = (plan.country_title || '').toLowerCase();
          const name = (plan.name || plan.title || '').toLowerCase();

          return regionPatterns.some(pattern =>
            slug.includes(pattern) ||
            title.includes(pattern) ||
            name.includes(pattern)
          );
        });

        console.log(`🔍 Region ${region.id}: found ${matchingPlans.length} matching plans with patterns [${regionPatterns.join(', ')}]`);

        // Extract all unique countries from matching plans
        const countrySet = new Set();
        matchingPlans.forEach(plan => {
          (plan.country_codes || []).forEach(code => {
            if (code && typeof code === 'string' && code.length > 0) {
              countrySet.add(code);
            }
          });
        });

        const extractedCountries = Array.from(countrySet);
        console.log(`🏳️ Region ${region.id}: extracted ${extractedCountries.length} countries`);

        // Count total plans for this region (plans that have any of these countries)
        const plansForRegion = plans.filter(plan => {
          const planCountries = plan.country_codes || [];
          return planCountries.some(code => extractedCountries.includes(code));
        });

        // Update region - only countries and plan count, NEVER touch imageUrl
        const regionRef = doc(db, 'regions', region.id);
        const updateData = {
          popularCountries: extractedCountries,
          planCount: plansForRegion.length,
          updatedAt: serverTimestamp()
        };

        await updateDoc(regionRef, updateData);
        updatedCount++;
        console.log(`✅ Updated region ${region.id}: ${extractedCountries.length} countries, ${plansForRegion.length} plans`);
      }

      toast.success(`✅ Synced ${updatedCount} regions with countries from Airalo`, { id: 'sync-regions' });
      await fetchRegions();
      await fetchCountries();
    } catch (error) {
      console.error('Error syncing regions:', error);
      toast.error('Failed to sync regions: ' + error.message, { id: 'sync-regions' });
    }
  };

  // Initialize default regions
  const initializeDefaultRegions = async () => {
    try {
      const batch = [];
      for (const region of DEFAULT_REGIONS) {
        const regionDoc = doc(db, 'regions', region.id);
        batch.push(
          setDoc(regionDoc, {
            name: region.name,
            icon: region.icon,
            color: '#0066CC',
            order: region.order,
            type: region.type || 'regional',
            imageUrl: '',
            topPlanIds: [],
            popularCountries: [],
            isHidden: false,
            translations: {
              en: region.name,
              ru: region.name,
              es: region.name,
              fr: region.name,
              de: region.name,
              ar: region.name,
              he: region.name
            },
            createdAt: new Date(),
            updatedAt: new Date()
          })
        );
      }

      await Promise.all(batch);
      toast.success('Default regions initialized');
      fetchRegions();
    } catch (error) {
      console.error('Error initializing regions:', error);
      toast.error('Failed to initialize regions');
    }
  };

  // Fetch all active countries
  const fetchCountries = async () => {
    try {
      const countriesRef = collection(db, 'countries');
      const snapshot = await getDocs(countriesRef);
      const countriesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort alphabetically
      countriesData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
      setAllCountries(countriesData);
    } catch (error) {
      console.error('Error fetching countries:', error);
    }
  };

  useEffect(() => {
    fetchRegions();
    fetchPlans();
    fetchCountries();
  }, []);

  // Filter and sort regions
  useEffect(() => {
    let filtered = [...regions];

    // Filter by visibility
    if (!showHidden) {
      filtered = filtered.filter(region => region.isHidden !== true);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      filtered = filtered.filter(region =>
        region.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        region.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Sort regions
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'order':
          comparison = (a.order || 0) - (b.order || 0);
          break;
        case 'countryCount':
          comparison = (a.popularCountries?.length || 0) - (b.popularCountries?.length || 0);
          break;
        default:
          comparison = (a.order || 0) - (b.order || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredRegions(filtered);
  }, [regions, searchTerm, sortBy, sortOrder, showHidden]);

  // Get countries for a region
  const getRegionCountries = (region) => {
    if (region.popularCountries && region.popularCountries.length > 0) {
      // Match by code, slug, or id (they may all be the same slug format)
      return allCountries.filter(c =>
        region.popularCountries.includes(c.code) ||
        region.popularCountries.includes(c.slug) ||
        region.popularCountries.includes(c.id)
      );
    }
    return [];
  };

  // Get plan count for a region
  const getRegionPlanCount = (region) => {
    if (region.type === 'global') {
      return allPlans.filter(p =>
        p.type === 'global' ||
        (p.name || '').toLowerCase().includes('global') ||
        (p.country_region || '').toLowerCase().includes('global')
      ).length;
    }

    const regionCountries = region.popularCountries || [];
    if (regionCountries.length === 0) return 0;

    return allPlans.filter(plan => {
      const planCountries = plan.country_codes || plan.country_ids || [];
      return planCountries.some(code => regionCountries.includes(code));
    }).length;
  };

  // Toggle region visibility
  const toggleRegionVisibility = async (regionId, currentlyHidden) => {
    try {
      setTogglingVisibility(regionId);

      const regionRef = doc(db, 'regions', regionId);
      await updateDoc(regionRef, {
        isHidden: !currentlyHidden,
        updatedAt: serverTimestamp()
      });

      toast.success(
        currentlyHidden
          ? `✅ ${regionId} is now visible`
          : `✅ ${regionId} is now hidden`
      );

      await fetchRegions();
    } catch (error) {
      console.error('Error toggling region visibility:', error);
      toast.error(`Failed to update visibility for ${regionId}`);
    } finally {
      setTogglingVisibility(null);
    }
  };

  // Open modal for creating new region
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
      type: 'regional',
      translations: {
        en: '',
        ru: '',
        es: '',
        fr: '',
        de: '',
        ar: '',
        he: ''
      }
    });
    setEditingRegion(null);
    setIsModalOpen(true);
  };

  // Open modal for editing region
  const handleEdit = (region) => {
    setFormData({
      id: region.id,
      name: region.name || '',
      icon: region.icon || '',
      color: region.color || '#0066CC',
      order: region.order || 0,
      imageUrl: region.imageUrl || '',
      topPlanIds: region.topPlanIds || [],
      popularCountries: region.popularCountries || [],
      type: region.type || 'regional',
      translations: region.translations || {
        en: '',
        ru: '',
        es: '',
        fr: '',
        de: '',
        ar: '',
        he: ''
      }
    });
    setEditingRegion(region);
    setIsModalOpen(true);
  };

  // Handle image upload
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
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
      const timestamp = Date.now();
      const fileName = `regions/${formData.id || 'temp'}_${timestamp}_${file.name}`;
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

  // Save region
  const handleSave = async () => {
    try {
      // Validation
      if (!formData.id) {
        toast.error('Region ID is required');
        return;
      }
      if (!formData.name) {
        toast.error('Region name is required');
        return;
      }

      const regionDoc = doc(db, 'regions', formData.id);
      const regionData = {
        name: formData.name,
        icon: formData.icon,
        color: formData.color,
        order: formData.order,
        imageUrl: formData.imageUrl,
        topPlanIds: formData.topPlanIds,
        popularCountries: formData.popularCountries,
        type: formData.type,
        translations: formData.translations,
        updatedAt: new Date()
      };

      if (!editingRegion) {
        regionData.createdAt = new Date();
        regionData.isHidden = false;
      }

      await setDoc(regionDoc, regionData, { merge: true });

      toast.success(editingRegion ? 'Region updated successfully' : 'Region created successfully');
      setIsModalOpen(false);
      fetchRegions();
    } catch (error) {
      console.error('Error saving region:', error);
      toast.error('Failed to save region');
    }
  };

  // Delete region
  const handleDelete = async (regionId) => {
    if (!confirm(`Are you sure you want to delete this region? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'regions', regionId));
      toast.success('Region deleted successfully');
      fetchRegions();
    } catch (error) {
      console.error('Error deleting region:', error);
      toast.error('Failed to delete region');
    }
  };

  // Toggle plan selection
  const togglePlanSelection = (planId) => {
    setFormData(prev => {
      const currentPlans = prev.topPlanIds || [];
      const isSelected = currentPlans.includes(planId);

      return {
        ...prev,
        topPlanIds: isSelected
          ? currentPlans.filter(id => id !== planId)
          : [...currentPlans, planId]
      };
    });
  };

  // Toggle popular country selection
  const toggleCountrySelection = (countryCode) => {
    setFormData(prev => {
      const currentCountries = prev.popularCountries || [];
      const isSelected = currentCountries.includes(countryCode);

      return {
        ...prev,
        popularCountries: isSelected
          ? currentCountries.filter(code => code !== countryCode)
          : [...currentCountries, countryCode]
      };
    });
  };

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
            Manage global, regional, and special regions with countries
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
        {/* Sorting Dropdown */}
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

        {/* Sort Order Toggle */}
        <button
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2 px-3 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          title={sortOrder === 'asc' ? 'Ascending order' : 'Descending order'}
        >
          {sortOrder === 'asc' ? (
            <SortAsc className="w-4 h-4" />
          ) : (
            <SortDesc className="w-4 h-4" />
          )}
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
          {showHidden ? (
            <>
              <Eye className="w-4 h-4" />
              <span>Showing Hidden</span>
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4" />
              <span>Show Hidden</span>
            </>
          )}
        </button>

        {/* Sync from Plans Button */}
        <button
          onClick={syncRegionsFromPlans}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          title="Auto-populate region countries and images from Airalo plans"
        >
          <RefreshCw className="w-4 h-4" />
          Sync from Plans
        </button>

        {/* Refresh Button */}
        <button
          onClick={fetchRegions}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        {/* Regions Count */}
        <div className="ml-auto text-sm text-gray-500">
          {filteredRegions.length} {filteredRegions.length === 1 ? 'region' : 'regions'}
          {showHidden && regions.filter(r => r.isHidden).length > 0 && (
            <span className="ml-1 text-amber-600">
              ({regions.filter(r => r.isHidden).length} hidden)
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
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
        {filteredRegions.map((region) => {
          const regionCountries = getRegionCountries(region);
          const planCount = getRegionPlanCount(region);

          return (
            <RegionCard
              key={region.id}
              region={region}
              countries={regionCountries}
              planCount={planCount}
              isExpanded={expandedRegion === region.id}
              togglingVisibility={togglingVisibility}
              onToggleVisibility={toggleRegionVisibility}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleExpand={() => setExpandedRegion(
                expandedRegion === region.id ? null : region.id
              )}
            />
          );
        })}
      </div>

      {/* Empty State */}
      {filteredRegions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No regions found</p>
          <button
            onClick={initializeDefaultRegions}
            className="mt-4 text-sm text-gray-900 hover:underline"
          >
            Initialize default regions
          </button>
        </div>
      )}

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingRegion ? 'Edit Region' : 'Create Region'}
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Basic Information
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Region ID *
                    </label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      disabled={!!editingRegion}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                      placeholder="e.g., asia, europe"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="e.g., Asia"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                    >
                      <option value="global">Global</option>
                      <option value="regional">Regional</option>
                      <option value="special">Special</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Icon (Emoji)
                    </label>
                    <input
                      type="text"
                      value={formData.icon}
                      onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      placeholder="🌏"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Palette className="w-4 h-4" />
                      Color
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
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="#0066CC"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Order
                    </label>
                    <input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Image Upload */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  Region Image
                </h4>

                <div className="space-y-3">
                  {formData.imageUrl && (
                    <div className="relative">
                      <img
                        src={formData.imageUrl}
                        alt="Region"
                        className="w-full h-48 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                        className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600">
                        {uploadingImage ? 'Uploading...' : 'Click to upload image'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              </div>

              {/* Translations */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  Translations
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  {Object.keys(formData.translations).map((lang) => (
                    <div key={lang}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {lang.toUpperCase()}
                      </label>
                      <input
                        type="text"
                        value={formData.translations[lang]}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          translations: {
                            ...prev.translations,
                            [lang]: e.target.value
                          }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder={`Translation in ${lang.toUpperCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Countries Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Countries ({formData.popularCountries?.length || 0} selected)
                </h4>
                <p className="text-xs text-gray-500">
                  Select countries that belong to this region
                </p>

                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {allCountries.map((country) => (
                    <label
                      key={country.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.popularCountries?.includes(country.code) || false}
                        onChange={() => toggleCountrySelection(country.code)}
                        className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                      />
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {country.image?.url ? (
                          <div className="w-8 h-6 rounded overflow-hidden border border-gray-200 flex-shrink-0">
                            <Image
                              src={country.image.url}
                              alt={country.name}
                              width={32}
                              height={24}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-6 bg-gray-100 rounded flex-shrink-0"></div>
                        )}
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {country.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          ({country.code})
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Top Plans Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Featured Plans ({formData.topPlanIds?.length || 0} selected)
                </h4>

                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  {allPlans.slice(0, 50).map((plan) => (
                    <label
                      key={plan.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.topPlanIds?.includes(plan.id) || false}
                        onChange={() => togglePlanSelection(plan.id)}
                        className="w-4 h-4 text-gray-900 rounded border-gray-300 focus:ring-gray-900"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {plan.title || plan.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {plan.country_region} • ${plan.price} • {plan.data}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                {allPlans.length > 50 && (
                  <p className="text-xs text-gray-500">
                    Showing first 50 plans. Select the most popular ones.
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
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
