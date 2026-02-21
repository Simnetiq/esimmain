'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useAdmin } from '@esim/shared/contexts/AdminContext';
import blogServiceSupabase from '@esim/shared/services/blogServiceSupabase';
import imageUploadService from '@esim/shared/services/imageUploadService';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search,
  ExternalLink,
  X,
  Languages,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import BlogPostModal from './BlogPostModal';

const BlogManagement = () => {
  const { currentUser } = useAuth();
  const { canManageBlog } = useAdmin();
  
  // State management
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [translatingPost, setTranslatingPost] = useState(null);
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, language: '' });

  // Supported languages
  const supportedLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', flag: '🇪🇸' },
    { code: 'fr', name: 'French', flag: '🇫🇷' },
    { code: 'de', name: 'German', flag: '🇩🇪' },
    { code: 'ar', name: 'Arabic', flag: '🇸🇦' },
    { code: 'he', name: 'Hebrew', flag: '🇮🇱' },
    { code: 'ru', name: 'Russian', flag: '🇷🇺' }
  ];

  // Form state for creating/editing posts
  const [formData, setFormData] = useState({
    // Base post data (shared across all language variants)
    baseSlug: '', // Base slug for the post (same for all languages)
    author: '',
    category: 'General',
    tags: [],
    featuredImage: '',
    status: 'published',
    seoKeywords: [],
    
    // Language-specific content
    currentLanguage: 'en', // Currently editing language
    translations: {
      en: {
        title: '',
        slug: '',
        content: '',
        seoTitle: '',
        seoDescription: ''
      }
    }
  });

  // State for managing translations
  const [availableTranslations, setAvailableTranslations] = useState(['en']);
  const [editingTranslation, setEditingTranslation] = useState('en');

  // Add a new language translation
  const addTranslation = (languageCode) => {
    if (!availableTranslations.includes(languageCode)) {
      setFormData(prev => ({
        ...prev,
        translations: {
          ...prev.translations,
          [languageCode]: {
            title: '',
            slug: prev.baseSlug ? `${prev.baseSlug}-${languageCode}` : '',
            content: '',
            seoTitle: '',
            seoDescription: ''
          }
        }
      }));
      setAvailableTranslations(prev => [...prev, languageCode]);
      setEditingTranslation(languageCode);
    }
  };

  // Remove a language translation
  const removeTranslation = (languageCode) => {
    if (languageCode !== 'en' && availableTranslations.length > 1) {
      setFormData(prev => {
        const newTranslations = { ...prev.translations };
        delete newTranslations[languageCode];
        return {
          ...prev,
          translations: newTranslations
        };
      });
      setAvailableTranslations(prev => prev.filter(lang => lang !== languageCode));
      if (editingTranslation === languageCode) {
        setEditingTranslation('en');
      }
    }
  };

  // Switch between language translations
  const switchTranslation = (languageCode) => {
    setEditingTranslation(languageCode);
  };

  // Load posts on component mount
  useEffect(() => {
    loadPosts();
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load posts based on filters
  useEffect(() => {
    loadPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterCategory, searchTerm]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      let postsData;
      
      console.log('Loading posts...', { searchTerm, filterCategory });
      
      if (searchTerm) {
        postsData = await blogServiceSupabase.searchPosts(searchTerm);
        console.log('Search results:', postsData);
      } else {
        const result = await blogServiceSupabase.getAllPosts(50);
        postsData = result.posts;
        console.log('All posts loaded:', postsData.length, 'posts');
      }

      // Apply filters
      let filteredPosts = postsData;
      
      if (filterCategory !== 'all') {
        filteredPosts = filteredPosts.filter(post => post.category === filterCategory);
        console.log('After category filter:', filteredPosts.length, 'posts');
      }

      console.log('Final filtered posts:', filteredPosts);
      setPosts(filteredPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Error loading blog posts');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await blogServiceSupabase.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  // Check slug availability with debouncing
  const checkSlugAvailability = async (slug, excludeId = null) => {
    if (!slug || slug.length < 3) {
      return;
    }

    try {
      const isAvailable = await blogServiceSupabase.isSlugAvailable(slug, excludeId);
      return isAvailable;
    } catch (error) {
      console.error('Error checking slug availability:', error);
      return null;
    }
  };

  // Debounced slug checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.slug) {
        checkSlugAvailability(formData.slug, selectedPost?.id);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formData.slug, selectedPost?.id]);

  // Handle image upload
  const handleImageUpload = async (file) => {
    try {
      setUploadingImage(true);
      
      // Validate file
      const validation = imageUploadService.validateImageFile(file);
      if (!validation.isValid) {
        toast.error(validation.errors.join(', '));
        return;
      }

      // Generate preview
      const previewUrl = await imageUploadService.generatePreviewUrl(file);
      setImagePreview(previewUrl);

      // Upload image
      const result = await imageUploadService.uploadImage(file, 'blog-images');
      
      if (result.success) {
        setFormData(prev => ({
          ...prev,
          featuredImage: result.url
        }));
        
        // Show success message with compression info
        if (result.compressionRatio && result.compressionRatio !== '0.0%') {
          toast.success(`Image uploaded! Converted to WebP (${result.compressionRatio} smaller)`);
        } else {
          toast.success('Image uploaded successfully!');
        }
      } else {
        toast.error(result.error || 'Failed to upload image');
        setImagePreview(null);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error uploading image');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // Handle image file selection
  const handleImageFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      featuredImage: ''
    }));
    setImagePreview(null);
  };

  const handleCreatePost = () => {
    setFormData({
      baseSlug: '',
      author: currentUser?.displayName || currentUser?.email || '',
      category: 'General',
      tags: [],
      featuredImage: '',
      status: 'published',
      seoKeywords: [],
      currentLanguage: 'en',
      translations: {
        en: {
          title: '',
          slug: '',
          content: '',
          seoTitle: '',
          seoDescription: ''
        }
      }
    });
    setAvailableTranslations(['en']);
    setEditingTranslation('en');
    setImagePreview(null);
    setShowCreateModal(true);
  };

  const handleEditPost = async (post) => {
    try {
      // Fetch full post data with all translations
      const fullPost = await blogServiceSupabase.getPostById(post.id);
      
      if (!fullPost) {
        toast.error('Failed to load post data');
        return;
      }

      // Convert translations to the format expected by the form
      const translations = {};
      for (const [langCode, translation] of Object.entries(fullPost.translations || {})) {
        translations[langCode] = {
          title: translation.title || '',
          slug: translation.slug || '',
          content: translation.content || '',
          excerpt: translation.excerpt || '',
          seoTitle: translation.seoTitle || '',
          seoDescription: translation.seoDescription || ''
        };
      }

      setFormData({
        baseSlug: fullPost.baseSlug || '',
        author: fullPost.author || '',
        category: fullPost.category || 'General',
        tags: fullPost.tags || [],
        featuredImage: fullPost.featuredImage || '',
        status: fullPost.status || 'published',
        seoKeywords: fullPost.seoKeywords || [],
        currentLanguage: post.language || 'en',
        translations: translations
      });

      setAvailableTranslations(Object.keys(translations));
      setEditingTranslation(post.language || Object.keys(translations)[0] || 'en');
      setImagePreview(fullPost.featuredImage || null);
      setSelectedPost(fullPost);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error loading post for editing:', error);
      toast.error('Failed to load post data');
    }
  };

  const handleSavePost = async () => {
    try {
      setLoading(true);
      
      // Prepare post data in the new format
      const postData = {
        baseSlug: formData.baseSlug,
        author: formData.author,
        category: formData.category,
        tags: formData.tags,
        featuredImage: formData.featuredImage,
        status: formData.status,
        seoKeywords: formData.seoKeywords,
        translations: formData.translations
      };

      console.log('Saving post with data:', postData);

      if (showCreateModal) {
        console.log('Creating new post...');
        const postId = await blogServiceSupabase.createPost(postData);
        console.log('Post created with ID:', postId);
        toast.success('Blog post created successfully!');
      } else {
        console.log('Updating existing post:', selectedPost.id);
        await blogServiceSupabase.updatePost(selectedPost.id, postData);
        toast.success('Blog post updated successfully!');
      }
      
      setShowCreateModal(false);
      setShowEditModal(false);
      setSelectedPost(null);
      
      console.log('Reloading posts...');
      await loadPosts();
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Error saving blog post');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    try {
      setLoading(true);
      await blogServiceSupabase.deletePost(postToDelete.id);
      toast.success('Blog post deleted successfully!');
      setShowDeleteModal(false);
      setPostToDelete(null);
      loadPosts();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Error deleting blog post');
    } finally {
      setLoading(false);
    }
  };

  // Translate post to all missing languages
  const handleTranslateToAllLanguages = async (post) => {
    try {
      // Fetch full post data with all translations
      const fullPost = await blogServiceSupabase.getPostById(post.id);
      
      if (!fullPost) {
        toast.error('Failed to load post data');
        return;
      }

      // Check if English translation exists
      if (!fullPost.translations?.en?.title || !fullPost.translations?.en?.content) {
        toast.error('English version is required for translation');
        return;
      }

      // Find missing languages
      const existingLanguages = Object.keys(fullPost.translations || {});
      const missingLanguages = supportedLanguages
        .map(lang => lang.code)
        .filter(code => code !== 'en' && !existingLanguages.includes(code));

      if (missingLanguages.length === 0) {
        toast.success('All languages are already translated!');
        return;
      }

      setTranslatingPost(post.id);
      setTranslationProgress({ current: 0, total: missingLanguages.length, language: '' });

      const englishTitle = fullPost.translations.en.title;
      const englishContent = fullPost.translations.en.content;
      const baseSlug = fullPost.baseSlug;

      let successCount = 0;
      let failCount = 0;

      // Translate to each missing language
      for (let i = 0; i < missingLanguages.length; i++) {
        const targetLang = missingLanguages[i];
        const langName = supportedLanguages.find(l => l.code === targetLang)?.name || targetLang;
        
        setTranslationProgress({ 
          current: i + 1, 
          total: missingLanguages.length, 
          language: langName 
        });

        try {
          // Call translation API
          const response = await fetch('/api/translate-blog', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: englishTitle,
              content: englishContent,
              targetLanguage: targetLang
            })
          });

          const result = await response.json();

          if (!result.success) {
            throw new Error(result.error || 'Translation failed');
          }

          // Update the post with new translation
          const updatedTranslations = {
            ...fullPost.translations,
            [targetLang]: {
              title: result.translation.title,
              slug: baseSlug, // All languages use the same base slug
              content: result.translation.content,
              excerpt: result.translation.content.substring(0, 160).replace(/<[^>]*>/g, ''),
              seoTitle: result.translation.title,
              seoDescription: result.translation.title.substring(0, 160)
            }
          };

          // Save updated post
          await blogServiceSupabase.updatePost(post.id, {
            translations: updatedTranslations
          });

          successCount++;
          toast.success(`✅ Translated to ${langName}`);
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error translating to ${targetLang}:`, error);
          toast.error(`Failed to translate to ${langName}`);
          failCount++;
        }
      }

      // Show final summary
      if (successCount > 0) {
        toast.success(`Translation complete! ${successCount} language${successCount > 1 ? 's' : ''} added${failCount > 0 ? `, ${failCount} failed` : ''}`);
        await loadPosts(); // Reload posts to show updated translations
      } else {
        toast.error('All translations failed');
      }

    } catch (error) {
      console.error('Error in translation process:', error);
      toast.error('Translation process failed');
    } finally {
      setTranslatingPost(null);
      setTranslationProgress({ current: 0, total: 0, language: '' });
    }
  };



  const formatDate = (date) => {
    if (!date) return 'Not published';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };


  if (!canManageBlog) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You need blog management privileges to access this feature</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Blog Management</h2>
          <p className="text-gray-600 mt-1">Create and manage blog posts • {posts.length} post{posts.length !== 1 ? 's' : ''}</p>
        </div>
        
        <button
          onClick={handleCreatePost}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 text-sm"
        >
          <option value="all">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>

      {/* Posts List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600 text-sm">Loading posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No blog posts found</h3>
            <p className="text-gray-600">
              {searchTerm || filterCategory !== 'all' ? 'Try adjusting your filters' : 'Create your first blog post to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Post
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Language
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Views
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {post.featuredImage && (
                            <Image
                              src={post.featuredImage}
                              alt={post.title}
                              className="w-12 h-12 rounded-lg object-cover mr-4"
                              width={256}
                              height={256}
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900 line-clamp-1">
                              {post.title}
                            </div>
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {post.excerpt}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {post.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const translationCount = post.availableLanguages ? post.availableLanguages.length : 1;
                            const translationFlags = post.availableLanguages 
                              ? post.availableLanguages.slice(0, 3).map(langCode => 
                                  supportedLanguages.find(lang => lang.code === langCode)?.flag || '🌐'
                                ).join(' ')
                              : '🇺🇸';
                            
                            return (
                              <>
                                <span>{translationFlags}</span>
                                <span className="font-medium">
                                  {translationCount} {translationCount === 1 ? 'language' : 'languages'}
                                </span>
                                {translationCount > 3 && (
                                  <span className="text-gray-500 text-xs">+{translationCount - 3}</span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {post.author}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(post.publishedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {post.views || 0}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="View Post"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        
                        <button
                          onClick={() => handleTranslateToAllLanguages(post)}
                          disabled={translatingPost === post.id}
                          className={`p-2 rounded-lg transition-colors ${
                            translatingPost === post.id
                              ? 'text-tufts-blue bg-blue-50 cursor-wait'
                              : 'text-gray-600 hover:text-tufts-blue hover:bg-blue-50'
                          }`}
                          title="Translate to All Languages"
                        >
                          {translatingPost === post.id ? (
                            <div className="w-4 h-4 border-2 border-tufts-blue border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Languages className="w-4 h-4" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => handleEditPost(post)}
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit Post"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setPostToDelete(post);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Post"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <BlogPostModal
          isOpen={showCreateModal || showEditModal}
          onClose={() => {
            setShowCreateModal(false);
            setShowEditModal(false);
            setSelectedPost(null);
          }}
          onSave={handleSavePost}
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          isEdit={showEditModal}
          imagePreview={imagePreview}
          setImagePreview={setImagePreview}
          uploadingImage={uploadingImage}
          handleImageFileChange={handleImageFileChange}
          handleRemoveImage={handleRemoveImage}
          availableTranslations={availableTranslations}
          editingTranslation={editingTranslation}
          addTranslation={addTranslation}
          removeTranslation={removeTranslation}
          switchTranslation={switchTranslation}
        />
      )}

      {/* Translation Progress Modal */}
      {translatingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Translating Post</h3>
            </div>
            
            {/* Content */}
            <div className="px-6 py-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 border-4 border-tufts-blue border-t-transparent rounded-full animate-spin"></div>
              </div>
              
              <div className="text-center">
                <p className="text-gray-900 font-medium mb-2">
                  {translationProgress.language 
                    ? `Translating to ${translationProgress.language}...`
                    : 'Preparing translation...'}
                </p>
                <p className="text-gray-600 text-sm">
                  {translationProgress.current} of {translationProgress.total} languages
                </p>
                
                {/* Progress Bar */}
                <div className="mt-4 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-tufts-blue h-full transition-all duration-300"
                    style={{ 
                      width: `${translationProgress.total > 0 
                        ? (translationProgress.current / translationProgress.total) * 100 
                        : 0}%` 
                    }}
                  />
                </div>
              </div>
              
              <p className="text-gray-500 text-xs text-center mt-4">
                This may take a few minutes. Please don&apos;t close this window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Delete Blog Post</h3>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPostToDelete(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Content */}
            <div className="px-6 py-4">
              <p className="text-gray-600">
                Are you sure you want to delete &quot;{postToDelete?.title}&quot;? This action cannot be undone.
              </p>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setPostToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePost}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlogManagement;
