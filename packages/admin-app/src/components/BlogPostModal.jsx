'use client';

import React, { useState } from 'react';
import { generateSlug } from '@esim/shared/services/blogServiceSupabase';
import Image from 'next/image';
import { X, Languages } from 'lucide-react';
import toast from 'react-hot-toast';

// Supported languages
const supportedLanguages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
  { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
  { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
  { code: 'nl', name: 'Dutch', flag: '🇳🇱' },
  { code: 'pl', name: 'Polish', flag: '🇵🇱' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'th', name: 'Thai', flag: '🇹🇭' },
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'uk', name: 'Ukrainian', flag: '🇺🇦' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' }
];

const BlogPostModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  formData, 
  setFormData, 
  loading, 
  isEdit, 
  imagePreview, 
  uploadingImage, 
  handleImageFileChange, 
  handleRemoveImage,
  availableTranslations,
  editingTranslation,
  addTranslation,
  removeTranslation,
  switchTranslation
}) => {
  const [translating, setTranslating] = useState(false);

  // Generate translation using OpenAI
  const generateTranslation = async () => {
    try {
      // Check if English content exists
      if (!formData.translations.en?.title || !formData.translations.en?.content) {
        toast.error('Please complete the English version first');
        return;
      }

      // Check if we're not on English tab
      if (editingTranslation === 'en') {
        toast.error('Cannot translate English to English');
        return;
      }

      setTranslating(true);
      toast.loading('Translating with AI...', { id: 'translation' });

      const response = await fetch('/api/translate-blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.translations.en.title,
          content: formData.translations.en.content,
          targetLanguage: editingTranslation
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Translation failed');
      }

      // Update the form data with translated content
      setFormData(prev => {
        const baseSlug = generateSlug(result.translation.title);
        return {
          ...prev,
          translations: {
            ...prev.translations,
            [editingTranslation]: {
              ...prev.translations[editingTranslation],
              title: result.translation.title,
              content: result.translation.content,
              slug: `${baseSlug}-${editingTranslation}`,
              seoTitle: result.translation.seo_title || result.translation.title.slice(0, 70),
              seoDescription: result.translation.seo_description || '',
              ogTitle: result.translation.og_title || '',
              ogDescription: result.translation.og_description || ''
            }
          }
        };
      });

      toast.success('Translation completed!', { id: 'translation' });
    } catch (error) {
      console.error('Translation error:', error);
      toast.error(error.message || 'Translation failed', { id: 'translation' });
    } finally {
      setTranslating(false);
    }
  };

  const handleInputChange = (field, value) => {
    // Handle translation-specific fields
    const translationFields = ['title', 'slug', 'excerpt', 'content', 'seoTitle', 'seoDescription', 'ogTitle', 'ogDescription', 'imageAlt'];
    
    if (translationFields.includes(field)) {
      setFormData(prev => {
        const newTranslations = {
          ...prev.translations,
          [editingTranslation]: {
            ...prev.translations[editingTranslation],
            [field]: value
          }
        };

        // Auto-generate slug when title changes
        if (field === 'title' && value) {
          const baseSlug = generateSlug(value);
          newTranslations[editingTranslation].slug = editingTranslation === 'en' ? baseSlug : `${baseSlug}-${editingTranslation}`;
          
          // Update baseSlug if editing English
          if (editingTranslation === 'en') {
            return {
              ...prev,
              baseSlug: baseSlug,
              translations: newTranslations
            };
          }
        }

        return {
          ...prev,
          translations: newTranslations
        };
      });
    } else {
      // Handle base post fields (shared across all languages)
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Add tag chip
  const addTag = (tag) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !formData.tags.includes(trimmedTag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, trimmedTag]
      }));
    }
  };

  // Remove tag chip
  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle tag input key press
  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const value = e.target.value.trim();
      if (value) {
        addTag(value);
        e.target.value = '';
      }
    }
  };

  // Handle tag input blur (when user clicks away)
  const handleTagBlur = (e) => {
    const value = e.target.value.trim();
    if (value) {
      addTag(value);
      e.target.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {isEdit ? 'Edit Blog Post' : 'Create New Blog Post'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Translation Management - Redesigned */}
          <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Languages className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Language Variants</h3>
                  <p className="text-sm text-gray-600">
                    {availableTranslations.length} language{availableTranslations.length > 1 ? 's' : ''} • 
                    Currently editing: <strong>{supportedLanguages.find(l => l.code === editingTranslation)?.flag} {supportedLanguages.find(l => l.code === editingTranslation)?.name}</strong>
                  </p>
                </div>
              </div>
              
              {editingTranslation !== 'en' && (
                <button
                  onClick={generateTranslation}
                  disabled={translating || !formData.translations.en?.title || !formData.translations.en?.content}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition-colors text-sm"
                >
                  {translating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Translating...
                    </>
                  ) : (
                    <>
                      <Languages className="w-4 h-4" />
                      AI Translate
                    </>
                  )}
                </button>
              )}
            </div>
            
            {/* Language Tabs */}
            <div className="flex flex-wrap gap-2">
              {availableTranslations.map(langCode => {
                const lang = supportedLanguages.find(l => l.code === langCode);
                return (
                  <button
                    key={langCode}
                    onClick={() => switchTranslation(langCode)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      editingTranslation === langCode
                        ? 'bg-gray-900 text-white shadow-md'
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-base">{lang?.flag || '🏳️'}</span>
                    <span>{lang?.name || langCode.toUpperCase()}</span>
                    {langCode !== 'en' && availableTranslations.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTranslation(langCode);
                        }}
                        className={`ml-1 ${editingTranslation === langCode ? 'text-red-300 hover:text-red-100' : 'text-red-500 hover:text-red-700'}`}
                        title="Remove translation"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </button>
                );
              })}
              
              {/* Add Translation Button */}
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    addTranslation(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors"
                defaultValue=""
              >
                <option value="" disabled>Add Language {' '} .</option>
                {supportedLanguages
                  .filter(lang => !availableTranslations.includes(lang.code))
                  .map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name}
                    </option>
                  ))
                }
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.translations[editingTranslation]?.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Enter blog post title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Featured Image
                </label>
                
                {/* Image Preview */}
                {(imagePreview || formData.featuredImage) && (
                  <div className="mb-4">
                    <div className="relative inline-block">
                      <Image
                        src={imagePreview || formData.featuredImage}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                        width={256}
                        height={256}
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Remove image"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                    id="image-upload"
                    disabled={uploadingImage}
                  />
                  <label
                    htmlFor="image-upload"
                    className={`cursor-pointer ${uploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingImage ? (
                      <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-2"></div>
                        <p className="text-sm text-gray-600">Uploading...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-600">
                          Click to upload image or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF up to 5MB • Auto-converts to WebP
                        </p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            </div>
            
            {/* Additional Information */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Author
                </label>
                <input
                  type="text"
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                >
                  <option value="General">General</option>
                  <option value="Technology">Technology</option>
                  <option value="Travel">Travel</option>
                  <option value="Business">Business</option>
                  <option value="Tutorial">Tutorial</option>
                  <option value="Security">Security</option>
                  <option value="Innovation">Innovation</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags
                </label>
                
                {/* Tags Chips Display */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-gray-100 text-gray-800 border border-gray-200"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-gray-600 hover:text-gray-800 focus:outline-none"
                          title="Remove tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Tag Input */}
                <input
                  type="text"
                  onKeyPress={handleTagKeyPress}
                  onBlur={handleTagBlur}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                  placeholder="Type a tag and press Enter or comma"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Press Enter or comma to add tags
                </p>
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content *
            </label>
            <textarea
              value={formData.translations[editingTranslation]?.content || ''}
              onChange={(e) => handleInputChange('content', e.target.value)}
              rows="12"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
              placeholder="Write your blog post content here in Markdown format..."
            />
          </div>

          {/* SEO & Open Graph */}
          <div className="mt-6 border border-gray-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">SEO & Open Graph</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  SEO Title
                  <span className={`ml-2 ${(formData.translations[editingTranslation]?.seoTitle || '').length > 70 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {(formData.translations[editingTranslation]?.seoTitle || '').length}/70
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={70}
                  value={formData.translations[editingTranslation]?.seoTitle || ''}
                  onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm ${(formData.translations[editingTranslation]?.seoTitle || '').length > 70 ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Defaults to post title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  OG Title
                  <span className={`ml-2 ${(formData.translations[editingTranslation]?.ogTitle || '').length > 70 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {(formData.translations[editingTranslation]?.ogTitle || '').length}/70
                  </span>
                </label>
                <input
                  type="text"
                  maxLength={70}
                  value={formData.translations[editingTranslation]?.ogTitle || ''}
                  onChange={(e) => handleInputChange('ogTitle', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm ${(formData.translations[editingTranslation]?.ogTitle || '').length > 70 ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Defaults to SEO title"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  SEO Description
                  <span className={`ml-2 ${(formData.translations[editingTranslation]?.seoDescription || '').length > 220 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {(formData.translations[editingTranslation]?.seoDescription || '').length}/220
                  </span>
                </label>
                <textarea
                  maxLength={220}
                  rows={2}
                  value={formData.translations[editingTranslation]?.seoDescription || ''}
                  onChange={(e) => handleInputChange('seoDescription', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm ${(formData.translations[editingTranslation]?.seoDescription || '').length > 220 ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Defaults to excerpt"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  OG Description
                  <span className={`ml-2 ${(formData.translations[editingTranslation]?.ogDescription || '').length > 200 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                    {(formData.translations[editingTranslation]?.ogDescription || '').length}/200
                  </span>
                </label>
                <textarea
                  maxLength={200}
                  rows={2}
                  value={formData.translations[editingTranslation]?.ogDescription || ''}
                  onChange={(e) => handleInputChange('ogDescription', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm ${(formData.translations[editingTranslation]?.ogDescription || '').length > 200 ? 'border-red-400' : 'border-gray-300'}`}
                  placeholder="Defaults to SEO description"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Image Alt Text
              </label>
              <input
                type="text"
                value={formData.translations[editingTranslation]?.imageAlt || ''}
                onChange={(e) => handleInputChange('imageAlt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                placeholder="Descriptive text for the featured image (defaults to title)"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Empty fields use fallbacks: OG title falls back to SEO title, then post title. OG description falls back to SEO description, then excerpt.
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={loading || !formData.translations[editingTranslation]?.title || !formData.translations[editingTranslation]?.content}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
          >
            {loading ? 'Saving...' : (isEdit ? 'Update Post' : 'Create Post')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogPostModal;

