'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveCountryComplete } from '../services/countryService';
import { 
  X, 
  Save, 
  Upload, 
  Image as ImageIcon,
  Languages,
  Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import Image from 'next/image';
import imageUploadService from '@esim/shared/services/imageUploadService';

const CountryEditModal = ({ 
  isOpen, 
  onClose, 
  country = null, 
  onSave 
}) => {
  const { currentUser } = useAuth();
  const isEditing = !!country;
  
  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    translations: {
      en: '',
      es: '',
      fr: '',
      de: '',
      ar: '',
      he: '',
      ru: ''
    },
    photo: '',
    description: '',
    isActive: true,
    region: 'other',
    is_popular: false
  });
  
  const [loading, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');

  // Language options
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' }
  ];

  // Initialize form data when country changes
  useEffect(() => {
    if (country) {
      setFormData({
        code: country.code || '',
        name: country.name || '',
        translations: {
          en: country.translations?.en || country.name || '',
          es: country.translations?.es || '',
          fr: country.translations?.fr || '',
          de: country.translations?.de || '',
          ar: country.translations?.ar || '',
          he: country.translations?.he || '',
          ru: country.translations?.ru || ''
        },
        photo: country.photo || '',
        description: country.description || '',
        isActive: country.isActive !== false,
        region: country.region || 'other',
        is_popular: country.is_popular || false
      });
      setPhotoPreview(country.photo || '');
    } else {
      // Reset form for new country
      setFormData({
        code: '',
        name: '',
        translations: {
          en: '',
          es: '',
          fr: '',
          de: '',
          ar: '',
          he: '',
          ru: ''
        },
        photo: '',
        description: '',
        isActive: true,
        region: 'other',
        is_popular: false
      });
      setPhotoPreview('');
    }
    setPhotoFile(null);
  }, [country, isOpen]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle translation changes
  const handleTranslationChange = (langCode, value) => {
    setFormData(prev => ({
      ...prev,
      translations: {
        ...prev.translations,
        [langCode]: value
      }
    }));
  };

  // Handle photo file selection
  const handlePhotoSelect = async (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file
      const validation = imageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.errors.join(', '));
        return;
      }
      
      setPhotoFile(file);
      
      // Generate preview
      const previewUrl = await imageUploadService.generatePreviewUrl(file);
      setPhotoPreview(previewUrl);
    }
  };

  // Upload photo to Firebase Storage
  const uploadPhoto = async () => {
    if (!photoFile) return formData.photo;
    
    try {
      setUploadingPhoto(true);
      
      // Upload image using imageUploadService (auto-converts to WebP)
      const result = await imageUploadService.uploadImage(photoFile, 'countries');
      
      if (result.success) {
        // Show success message with compression info
        if (result.compressionRatio && result.compressionRatio !== '0.0%') {
          toast.success(`Image uploaded! Converted to WebP (${result.compressionRatio} smaller)`);
        } else {
          toast.success('Image uploaded successfully!');
        }
        return result.url;
      } else {
        throw new Error(result.error || 'Failed to upload image');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload photo: ${error.message}`);
      throw error;
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Remove photo
  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    handleInputChange('photo', '');
  };

  // Save country to Supabase
  const handleSave = async () => {
    try {
      // Validation
      if (!formData.code.trim()) {
        toast.error('Country code is required');
        return;
      }

      if (!formData.name.trim()) {
        toast.error('Country name is required');
        return;
      }

      // Only validate country code length when creating a new country
      if (!isEditing && (formData.code.length < 2 || formData.code.length > 50)) {
        toast.error('Country code must be between 2 and 50 characters');
        return;
      }

      setSaving(true);

      // Upload photo if selected
      let photoURL = formData.photo;
      if (photoFile) {
        photoURL = await uploadPhoto();
      }

      // Save to Supabase using the country service
      await saveCountryComplete({
        code: formData.code.toUpperCase(),
        name: formData.name.trim(),
        translations: formData.translations,
        photo: photoURL,
        description: formData.description.trim(),
        isActive: formData.isActive,
        region: formData.region,
        is_popular: formData.is_popular
      }, currentUser?.uid || 'admin');

      toast.success(
        isEditing
          ? `Updated ${formData.name} successfully!`
          : `Created ${formData.name} successfully!`
      );

      // Call onSave callback to refresh the list
      if (onSave) {
        await onSave();
      }

      // Close modal
      onClose();

    } catch (error) {
      console.error('Error saving country:', error);
      toast.error(`Failed to save country: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? `Edit ${country?.name}` : 'Add New Country'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  placeholder="US or ANTIGUA-AND-BARBUDA"
                  maxLength={50}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                  disabled={isEditing} // Don't allow changing code for existing countries
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="United States"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Country Photo
              </label>
              
              {photoPreview ? (
                <div className="relative inline-block">
                  <Image
                    src={photoPreview}
                    alt="Country preview"
                    width={128}
                    height={128}
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                  />
                  <button
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">Upload country photo</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </label>
                </div>
              )}
            </div>

            {/* Translations */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Languages className="w-4 h-4 inline mr-2" />
                Translations
              </label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {languages.map((lang) => (
                  <div key={lang.code}>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {lang.flag} {lang.name}
                    </label>
                    <input
                      type="text"
                      value={formData.translations[lang.code]}
                      onChange={(e) => handleTranslationChange(lang.code, e.target.value)}
                      placeholder={`Country name in ${lang.name}`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Optional description about this country..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Region Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select
                value={formData.region}
                onChange={(e) => handleInputChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="asia">🌏 Asia</option>
                <option value="europe">🇪🇺 Europe</option>
                <option value="americas">🌎 Americas</option>
                <option value="africa">🌍 Africa</option>
                <option value="oceania">🌏 Oceania</option>
                <option value="other">🌐 Other</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Select the geographic region for filtering
              </p>
            </div>

            {/* Active Status & Popular */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleInputChange('isActive', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  Country is active and visible to users
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isPopular"
                  checked={formData.is_popular}
                  onChange={(e) => handleInputChange('is_popular', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isPopular" className="ml-2 text-sm text-gray-700">
                  🔥 Mark as popular destination
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={loading || uploadingPhoto}
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={loading || uploadingPhoto}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading || uploadingPhoto ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              {loading ? 'Saving...' : uploadingPhoto ? 'Uploading...' : 'Save Country'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CountryEditModal;
