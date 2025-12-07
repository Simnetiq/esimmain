'use client';

import React, { useState, useEffect } from 'react';
import { db, storage } from '@esim/shared/firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Upload,
  Image as ImageIcon,
  Globe,
  Palette,
  Star,

} from 'lucide-react';

const RegionManagement = () => {
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRegion, setEditingRegion] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [allPlans, setAllPlans] = useState([]);

  // Default regions configuration
  const DEFAULT_REGIONS = [
    { id: 'popular', name: 'Popular', icon: '🔥', order: 0 },
    { id: 'asia', name: 'Asia', icon: '🌏', order: 1 },
    { id: 'europe', name: 'Europe', icon: '🇪🇺', order: 2 },
    { id: 'americas', name: 'Americas', icon: '🌎', order: 3 },
    { id: 'africa', name: 'Africa', icon: '🌍', order: 4 },
    { id: 'oceania', name: 'Oceania', icon: '🌏', order: 5 },
    { id: 'all', name: 'All', icon: '🌐', order: 6 }
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

  // Fetch all plans for top plans selection
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
            imageUrl: '',
            topPlanIds: [],
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

  useEffect(() => {
    fetchRegions();
    fetchPlans();
  }, []);

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
        translations: formData.translations,
        updatedAt: new Date()
      };

      if (!editingRegion) {
        regionData.createdAt = new Date();
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
            Manage regions with colors, translations, images, and featured plans
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

      {/* Regions List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Region
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Color
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Order
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Top Plans
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {regions.map((region) => (
              <tr key={region.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{region.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{region.name}</div>
                      <div className="text-xs text-gray-500">{region.id}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded border border-gray-200"
                      style={{ backgroundColor: region.color }}
                    />
                    <span className="text-xs text-gray-600">{region.color}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {region.order}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {region.topPlanIds?.length || 0} plans
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {region.imageUrl ? (
                    <img
                      src={region.imageUrl}
                      alt={region.name}
                      className="w-16 h-10 object-cover rounded border border-gray-200"
                    />
                  ) : (
                    <div className="w-16 h-10 bg-gray-100 rounded border border-gray-200 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleEdit(region)}
                      className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(region.id)}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {regions.length === 0 && (
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
      </div>

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

              {/* Top Plans Selection */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Top Plans ({formData.topPlanIds?.length || 0} selected)
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

