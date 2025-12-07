"use client";

import React, { useState, useEffect } from 'react';
import { Calendar, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import blogServiceSeparate from '@esim/shared/services/blogServiceSeparate';
import { detectLanguageFromPath, getLocalizedBlogUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatBlogDate } from '@esim/shared/utils/blogUtils';
import BlogCategoryTag from './BlogCategoryTag';
import BlogViewCount from './BlogViewCount';
import BlogAppDownload from './BlogAppDownload';
import { trackBlogListView, trackBlogPostClick, trackBlogSearch, trackBlogCategoryFilter } from '@esim/shared/utils/trackingPixels';

const Blog = () => {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  
  // Prioritize URL-based detection for immediate response, then use I18n context
  const urlLanguage = detectLanguageFromPath(pathname);
  const detectedLanguage = urlLanguage || locale || 'en';
  
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPosts, setFilteredPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const isRTL = getLanguageDirection(detectedLanguage) === 'rtl';
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 12;

  // Load blog posts on component mount and when language changes
  useEffect(() => {
    loadBlogPosts();
    loadCategories();
    // Track blog list view
    trackBlogListView(detectedLanguage, selectedCategory);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedLanguage, pathname, locale]); // Add pathname as dependency for immediate URL-based changes

  // Filter posts when search term or category changes
  useEffect(() => {
    filterPosts();
    setCurrentPage(1); // Reset to first page when filters change
    
    // Track search if there's a search term
    if (searchTerm) {
      const timeoutId = setTimeout(() => {
        trackBlogSearch(searchTerm, filteredPosts.length);
      }, 1000); // Debounce search tracking
      
      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory, blogPosts]);

  const loadBlogPosts = async () => {
    try {
      setLoading(true);
      const result = await blogServiceSeparate.getPublishedPosts(20, null, detectedLanguage);
      setBlogPosts(result.posts);
    } catch {
      // Fallback to empty array if there's an error
      setBlogPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await blogServiceSeparate.getCategories();
      setCategories(cats);
    } catch {
    }
  };

  const filterPosts = () => {
    let filtered = blogPosts;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(post => post.category === selectedCategory);
      // Track category filter
      trackBlogCategoryFilter(selectedCategory, filtered.length);
    }

    setFilteredPosts(filtered);
  };

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
          <div className="px-4 pt-6 lg:pt-0 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className=" font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-bold rtl:tracking-tight">
              {t('blog.title', 'Blog')}
            </p>
            <h2 className="my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
              {t('blog.subtitle', 'Stay updated with eSIM technology')}
            </h2>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full">
          <div className="px-4 py-4">
            <div className="flex flex-col md:flex-row gap-3 lg:gap-4">
              <div className="flex-1 relative">
              <input
                type="text"
                placeholder={t('blog.searchPlaceholder', 'Search blog posts...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`input-field w-full py-2 resize-none ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                style={{ 
                  textAlign: isRTL ? 'right' : 'left',
                  direction: isRTL ? 'rtl' : 'ltr'
                }}
              />
            </div>
            <div className="md:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`input-field w-full py-2 resize-none ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                style={{ 
                  textAlign: isRTL ? 'right' : 'left',
                  direction: isRTL ? 'rtl' : 'ltr'
                }}
              >
                <option value="all" className="py-2">{t('blog.allCategories', 'All Categories')}</option>
                {categories.map(category => (
                  <option key={category} value={category} className="py-2">{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <div className="mx-auto w-full max-w-9xl ">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full">
          <div className="px-4">
          {loading ? (
            <div className="text-center">
              <p className="mt-4 text-gray-600">{t('blog.loadingPosts', 'Loading blog posts...')}</p>
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="text-center">
              <p className="text-gray-500 text-sm lg:text-base">
                {searchTerm || selectedCategory !== 'all' 
                  ? t('blog.noPostsFound', 'No blog posts found matching your criteria')
                  : t('blog.noPostsAvailable', 'No blog posts available yet')
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2  lg:grid-cols-3 gap-3 lg:gap-6">
              {filteredPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage).map((post, index) => (
              <Link 
                href={getLocalizedBlogUrl(post.baseSlug || post.slug, detectedLanguage)} 
                key={post.id}
                onClick={() => trackBlogPostClick(post, index + 1)}
              >
                <article className="relative cursor-pointer group  transition-transform duration-200 ">
                  <div className="relative flex h-full flex-col overflow-hidden border border-gray-200/50 ">
                  <div className="relative">
                    {post.featuredImage ? (
                      <Image
                        src={post.featuredImage}
                        alt={post.title}
                        width={400}
                        height={192}
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="w-full h-48 object-cover"
                        quality={75}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-400 text-sm">No image</span>
                      </div>
                    )}
                    {/* Category tag on top right corner */}
                    <BlogCategoryTag 
                      category={post.category}
                      language={detectedLanguage}
                      absolute={true}
                      isRTL={isRTL}
                    />
                    <div className={`flex gap-2`}>
                      
                      {post.isFallback && (
                        <span className="text-sm font-medium text-cool-black">
                          English
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h2 className={`text-lg lg:text-xl font-semibold tracking-tight text-eerie-black mb-3 line-clamp-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {post.title}
                    </h2>
                    
                    
                    
                    <div className={`flex items-center text-sm lg:text-base mb-4 text-cool-black ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'}`}>
                        <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>{formatBlogDate(post.publishedAt, detectedLanguage)}</span>
                      </div>
                    </div>
                    
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className={`flex flex-wrap gap-1 mb-4 overflow-hidden text-cool-black`}>
                        {post.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="text-xs lg:text-sm font-medium truncate max-w-20"
                          >
                            #{tag.length > 8 ? tag.substring(0, 8) + '...' : tag}
                          </span>
                        ))}
                        {post.tags.length > 3 && (
                          <span className={`text-xs lg:text-sm font-medium ${isRTL ? 'ml-2' : 'mr-2'}`}>
                            +{post.tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                      <BlogViewCount 
                        views={post.views || 0}
                        language={detectedLanguage}
                        isRTL={isRTL}
                        className="text-cool-black"
                      />
                      
                      <div className={`inline-flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} font-medium`}>
                        <span>{t('blog.readMore', 'Read More')}</span>
                        <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isRTL ? 'group-hover:-translate-x-1 rotate-180' : 'group-hover:translate-x-1'}`} />
                      </div>
                    </div>
                  </div>
                  </div>
                </article>
              </Link>
            ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && filteredPosts.length > postsPerPage && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentPage === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-cool-black hover:text-tufts-blue'
                }`}
              >
                {t('blog.pagination.previous', 'Previous')}
              </button>
              
              <div className="flex gap-2">
                {Array.from({ length: Math.ceil(filteredPosts.length / postsPerPage) }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-tufts-blue text-white'
                        : 'text-cool-black hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredPosts.length / postsPerPage)))}
                disabled={currentPage === Math.ceil(filteredPosts.length / postsPerPage)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  currentPage === Math.ceil(filteredPosts.length / postsPerPage)
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-cool-black hover:text-tufts-blue'
                }`}
              >
                {t('blog.pagination.next', 'Next')}
              </button>
            </div>
          )}

          {/* Download App Widget */}
          {!loading && filteredPosts.length > 0 && (
            <BlogAppDownload 
              language={detectedLanguage}
              isRTL={isRTL}
              location="blog_list"
              context={{
                page: 'blog_list',
                posts_shown: filteredPosts.length,
                category: selectedCategory
              }}
            />
          )}
          </div>
        </div>
      </div>
    
    </div>
    </div>
  
  );
};
export default Blog;
