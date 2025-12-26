"use client";

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import blogServiceSeparate from '@esim/shared/services/blogServiceSeparate';
import { detectLanguageFromPath, getLocalizedBlogUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatBlogDate } from '@esim/shared/utils/blogUtils';

// Lazy load non-critical components
import dynamic from 'next/dynamic';
const BlogAppDownload = dynamic(() => import('./BlogAppDownload'), { ssr: false });

// Lazy load tracking (not needed for initial render)
let trackingLoaded = false;
const loadTracking = async () => {
  if (trackingLoaded) return;
  trackingLoaded = true;
  const tracking = await import('@esim/shared/utils/trackingPixels');
  return tracking;
};

// Category color mapping
const CATEGORY_STYLES = {
  'Travel': 'bg-blue-100/60 text-blue-800',
  'Technology': 'bg-purple-100/60 text-purple-800',
  'Guide': 'bg-green-100/60 text-green-800',
  'News': 'bg-orange-100/60 text-orange-800',
  'Tips': 'bg-teal-100/60 text-teal-800',
  'Tutorial': 'bg-indigo-100/60 text-indigo-800',
  'default': 'bg-gray-100/60 text-gray-800'
};

const getCategoryStyle = (category) => CATEGORY_STYLES[category] || CATEGORY_STYLES.default;

// Large Featured Card (memoized)
const LargeFeaturedCard = memo(({ post, language, isRTL, onPostClick }) => {
  if (!post) return null;
  
  return (
    <Link 
      href={getLocalizedBlogUrl(post.baseSlug || post.slug, language)}
      onClick={() => onPostClick(post, 0)}
      className="group/article-preview flex flex-col h-full"
    >
      <div className="flex-1 w-full shadow-lg shadow-gray-100 min-h-[200px]">
        <div className="relative w-full h-full min-h-[200px] lg:min-h-[300px]">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="absolute inset-0 size-full scale-[1.01] object-cover transition-all duration-300 ease-out group-hover/article-preview:scale-[1.03]"
              quality={80}
              priority
              fetchPriority="high"
            />
          ) : (
            <div className="absolute inset-0 size-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-lg">eSIM</span>
            </div>
          )}
        </div>
      </div>
      <div className="pt-4">
        <div className="pb-2">
          <span className={`inline-flex items-center rounded-full h-6 px-2.5 text-xs font-medium ${getCategoryStyle(post.category)}`}>
            <span className="uppercase tracking-wide">{post.category}</span>
          </span>
        </div>
        <h3 className={`line-clamp-2 pb-1 text-lg lg:text-xl leading-snug font-semibold text-balance group-hover/article-preview:underline decoration-1 underline-offset-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {post.title}
        </h3>
        <div className="pt-2 text-xs text-gray-500">
          {formatBlogDate(post.publishedAt, language)}
        </div>
      </div>
    </Link>
  );
});
LargeFeaturedCard.displayName = 'LargeFeaturedCard';

// Small Featured Card (memoized)
const SmallFeaturedCard = memo(({ post, language, isRTL, onPostClick, index }) => {
  if (!post) return null;
  
  return (
    <Link 
      href={getLocalizedBlogUrl(post.baseSlug || post.slug, language)}
      onClick={() => onPostClick(post, index)}
      className="group/article-preview flex flex-row gap-4 items-start"
    >
      <div className="w-1/3 shrink-0 shadow-lg shadow-gray-100">
        <div className="relative h-0 w-full overflow-hidden pb-[100%]">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 33vw, 15vw"
              className="absolute inset-0 size-full scale-[1.01] object-cover transition-all duration-300 ease-out group-hover/article-preview:scale-[1.07]"
              quality={70}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 size-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">eSIM</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 pt-0">
        <div className="pb-1.5">
          <span className={`inline-flex items-center rounded-full h-5 px-2 text-[10px] font-medium ${getCategoryStyle(post.category)}`}>
            <span className="uppercase tracking-wide">{post.category}</span>
          </span>
        </div>
        <h3 className={`line-clamp-2 text-base leading-snug font-medium text-balance group-hover/article-preview:underline decoration-1 underline-offset-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {post.title}
        </h3>
        <div className="pt-1.5 text-xs text-gray-500">
          {formatBlogDate(post.publishedAt, language)}
        </div>
      </div>
    </Link>
  );
});
SmallFeaturedCard.displayName = 'SmallFeaturedCard';

// Grid Article Card (memoized)
const GridArticleCard = memo(({ post, language, isRTL, onPostClick, index }) => {
  if (!post) return null;
  
  return (
    <Link 
      href={getLocalizedBlogUrl(post.baseSlug || post.slug, language)}
      onClick={() => onPostClick(post, index)}
      className="group/article-preview flex shrink-0 flex-row items-center gap-3 md:flex-col"
    >
      <div className="w-1/4 shrink-0 grow-0 md:w-full shadow-lg shadow-gray-100">
        <div className="relative h-0 w-full overflow-hidden pb-[100%]">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 25vw, 33vw"
              className="absolute inset-0 size-full scale-[1.01] object-cover transition-all duration-300 ease-out group-hover/article-preview:scale-[1.07]"
              quality={70}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 size-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">eSIM</span>
            </div>
          )}
        </div>
      </div>
      <div className="w-full shrink">
        <div className="pb-1.5">
          <span className={`inline-flex items-center rounded-full h-6 px-2.5 text-xs font-medium ${getCategoryStyle(post.category)}`}>
            <span className="uppercase tracking-wide">{post.category}</span>
          </span>
        </div>
        <h3 className={`line-clamp-3 pb-1 text-base md:text-lg leading-snug font-medium text-balance group-hover/article-preview:underline decoration-1 underline-offset-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {post.title}
        </h3>
        <div className="pt-1.5 text-xs text-gray-500">
          {formatBlogDate(post.publishedAt, language)}
        </div>
      </div>
    </Link>
  );
});
GridArticleCard.displayName = 'GridArticleCard';

// Category Filter Button (memoized)
const CategoryButton = memo(({ category, isSelected, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-8 w-fit shrink-0 cursor-pointer items-center rounded-full px-3 transition-all duration-200 ${
      isSelected
        ? 'bg-gray-900 text-white shadow-sm'
        : 'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)] hover:bg-gray-100 text-gray-700'
    }`}
  >
    <span className="font-medium text-sm tracking-wide">{category}</span>
  </button>
));
CategoryButton.displayName = 'CategoryButton';

// Pagination Button (memoized)
const PaginationButton = memo(({ page, currentPage, onClick }) => (
  <button
    onClick={() => onClick(page)}
    className={`w-10 h-10 text-sm font-medium rounded-full transition-colors ${
      currentPage === page
        ? 'bg-gray-900 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`}
  >
    {page}
  </button>
));
PaginationButton.displayName = 'PaginationButton';

const Blog = () => {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  
  const detectedLanguage = useMemo(() => {
    const urlLanguage = detectLanguageFromPath(pathname);
    return urlLanguage || locale || 'en';
  }, [pathname, locale]);
  
  const [blogPosts, setBlogPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  
  const isRTL = useMemo(() => getLanguageDirection(detectedLanguage) === 'rtl', [detectedLanguage]);
  const postsPerPage = 12;

  // Load blog posts
  const loadBlogPosts = useCallback(async () => {
    try {
      setLoading(true);
      const result = await blogServiceSeparate.getPublishedPosts(50, null, detectedLanguage);
      setBlogPosts(result.posts);
      
      // Track view after loading (non-blocking)
      loadTracking().then(tracking => {
        tracking?.trackBlogListView?.(detectedLanguage, selectedCategory);
      });
    } catch {
      setBlogPosts([]);
    } finally {
      setLoading(false);
    }
  }, [detectedLanguage, selectedCategory]);

  // Load categories
  const loadCategories = useCallback(async () => {
    try {
      const cats = await blogServiceSeparate.getCategories();
      setCategories(cats);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    loadBlogPosts();
    loadCategories();
  }, [loadBlogPosts, loadCategories]);

  // Filter posts (memoized)
  const filteredPosts = useMemo(() => {
    if (selectedCategory === 'all') return blogPosts;
    return blogPosts.filter(post => post.category === selectedCategory);
  }, [selectedCategory, blogPosts]);

  // Reset page when category changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory]);

  const handleCategoryClick = useCallback((category) => {
    setSelectedCategory(category);
    // Track category filter (non-blocking)
    if (category !== 'all') {
      loadTracking().then(tracking => {
        const filtered = blogPosts.filter(p => p.category === category);
        tracking?.trackBlogCategoryFilter?.(category, filtered.length);
      });
    }
  }, [blogPosts]);

  const handlePostClick = useCallback((post, index) => {
    loadTracking().then(tracking => {
      tracking?.trackBlogPostClick?.(post, index + 1);
    });
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  // Computed values (memoized)
  const { featuredPost, secondaryPosts, paginatedGridPosts, totalPages } = useMemo(() => {
    const featured = filteredPosts[0];
    const secondary = filteredPosts.slice(1, 3);
    const gridPosts = filteredPosts.slice(3);
    const paginated = gridPosts.slice((currentPage - 1) * postsPerPage, currentPage * postsPerPage);
    const pages = Math.ceil(gridPosts.length / postsPerPage);
    
    return {
      featuredPost: featured,
      secondaryPosts: secondary,
      paginatedGridPosts: paginated,
      totalPages: pages
    };
  }, [filteredPosts, currentPage, postsPerPage]);

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full lg:mt-20 mt-10">
          <div className="px-4 pt-6 lg:pt-0 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-bold rtl:tracking-tight">
              {t('blog.title', 'Blog')}
            </p>
            <h2 className="my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
              {t('blog.subtitle', 'Stay updated with eSIM technology')}
            </h2>
          </div>
        </div>
      </div>

      {/* Category Filters & Blog Grid */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full">
          <div className="px-4">
            {/* Category Filter Pills */}
            <div className="py-6 md:py-8">
              <div className="flex flex-wrap gap-2">
                <CategoryButton
                  category={t('blog.allCategories', 'All')}
                  isSelected={selectedCategory === 'all'}
                  onClick={() => handleCategoryClick('all')}
                />
                {categories.map(category => (
                  <CategoryButton
                    key={category}
                    category={category}
                    isSelected={selectedCategory === category}
                    onClick={() => handleCategoryClick(category)}
                  />
                ))}
              </div>
            </div>

            {/* Loading State */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-gray-500 text-base">
                  {selectedCategory !== 'all'
                    ? t('blog.noPostsFound', 'No blog posts found matching your criteria')
                    : t('blog.noPostsAvailable', 'No blog posts available yet')
                  }
                </p>
              </div>
            ) : (
              <>
                {/* Newest Section */}
                {featuredPost && (
                  <>
                    <div className="mb-6">
                      <h3 className={`text-lg font-semibold text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('blog.newest', 'Newest')}
                      </h3>
                    </div>
                    
                    <div className="grid gap-6 md:gap-8 lg:grid-cols-2 mb-12 md:mb-16 pb-10 md:pb-14 border-b border-gray-200">
                      <LargeFeaturedCard 
                        post={featuredPost}
                        language={detectedLanguage}
                        isRTL={isRTL}
                        onPostClick={handlePostClick}
                      />
                      
                      {secondaryPosts.length > 0 && (
                        <div className="flex flex-col gap-6 md:gap-8">
                          {secondaryPosts.map((post, index) => (
                            <SmallFeaturedCard
                              key={post.id}
                              post={post}
                              language={detectedLanguage}
                              isRTL={isRTL}
                              onPostClick={handlePostClick}
                              index={index + 1}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
                    
                {/* All Posts Section */}
                {paginatedGridPosts.length > 0 && (
                  <>
                    <div className="mb-6">
                      <h3 className={`text-lg font-semibold text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>
                        {t('blog.allPosts', 'All Posts')}
                      </h3>
                    </div>
                    
                    <div className="grid gap-x-6 gap-y-8 md:grid-cols-2 md:gap-x-8 md:gap-y-10 lg:grid-cols-3">
                      {paginatedGridPosts.map((post, index) => (
                        <div key={post.id} className={index >= 6 ? 'content-visibility-auto-sm' : ''}>
                          <GridArticleCard
                            post={post}
                            language={detectedLanguage}
                            isRTL={isRTL}
                            onPostClick={handlePostClick}
                            index={index + 3}
                          />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-12 flex justify-center items-center gap-2">
                    <button
                      onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                      disabled={currentPage === 1}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                        currentPage === 1
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('blog.pagination.previous', 'Previous')}
                    </button>
                    
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                        <PaginationButton
                          key={page}
                          page={page}
                          currentPage={currentPage}
                          onClick={handlePageChange}
                        />
                      ))}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
                        currentPage === totalPages
                          ? 'text-gray-300 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {t('blog.pagination.next', 'Next')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Download App Widget - Lazy loaded */}
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
  );
};

export default Blog;
