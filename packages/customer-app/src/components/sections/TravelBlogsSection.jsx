'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import blogServiceSupabase from '@esim/shared/services/blogServiceSupabase';
import { detectLanguageFromPath, getLocalizedBlogUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatBlogDate } from '@esim/shared/utils/blogUtils';

// Inline arrow icon to avoid lucide-react bundle overhead
const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

// Category color mapping (same as Blog.jsx)
const getCategoryStyle = (category) => {
  const styles = {
    'Travel': 'bg-blue-100/60 text-blue-800',
    'Technology': 'bg-purple-100/60 text-purple-800',
    'Guide': 'bg-green-100/60 text-green-800',
    'News': 'bg-orange-100/60 text-orange-800',
    'Tips': 'bg-teal-100/60 text-teal-800',
    'Tutorial': 'bg-indigo-100/60 text-indigo-800',
    'default': 'bg-gray-100/60 text-gray-800'
  };
  return styles[category] || styles.default;
};

// Blog Card Component (similar to GridArticleCard from Blog.jsx)
const BlogCard = ({ post, language, isRTL }) => {
  if (!post) return null;
  
  return (
    <Link 
      href={getLocalizedBlogUrl(post.baseSlug || post.slug, language)}
      className="group/article-preview flex shrink-0 flex-col"
    >
      {/* Image */}
      <div className="w-full shadow-lg shadow-gray-100 mb-4">
        <div className="relative h-0 w-full overflow-hidden pb-[60%]">
          {post.featuredImage ? (
            <Image
              src={post.featuredImage}
              alt={post.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="absolute inset-0 size-full scale-[1.01] object-cover transition-all duration-300 ease-out group-hover/article-preview:scale-[1.05]"
              quality={75}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 size-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <span className="text-gray-400 text-sm">eSIM</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1">
        <div className="pb-2">
          <span className={`inline-flex items-center rounded-full h-6 px-2.5 text-xs font-medium ${getCategoryStyle(post.category)}`}>
            <span className="uppercase tracking-wide">{post.category}</span>
          </span>
        </div>
        <h3 className={`line-clamp-2 pb-2 text-base md:text-lg leading-snug font-semibold text-balance text-eerie-black group-hover/article-preview:underline decoration-1 underline-offset-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {post.title}
        </h3>
        <p className={`line-clamp-2 text-sm text-gray-600 leading-relaxed mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
          {post.excerpt || post.metaDescription}
        </p>
        <div className="text-xs text-gray-500">
          {formatBlogDate(post.publishedAt, language)}
        </div>
      </div>
    </Link>
  );
};

// Skeleton Card for loading state
const SkeletonCard = () => (
  <div className="flex flex-col animate-pulse">
    <div className="w-full mb-4">
      <div className="relative h-0 w-full pb-[60%] bg-gray-200 rounded" />
    </div>
    <div className="flex-1">
      <div className="h-5 w-16 bg-gray-200 rounded-full mb-2" />
      <div className="h-6 w-full bg-gray-200 rounded mb-2" />
      <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-20 bg-gray-200 rounded" />
    </div>
  </div>
);

export default function TravelBlogsSection() {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  
  const urlLanguage = detectLanguageFromPath(pathname);
  const detectedLanguage = urlLanguage || locale || 'en';
  const isRTL = getLanguageDirection(detectedLanguage) === 'rtl';
  
  const [travelBlogs, setTravelBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Grid pattern style
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };

  useEffect(() => {
    loadTravelBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectedLanguage]);

  const loadTravelBlogs = async () => {
    try {
      setLoading(true);
      // Fetch all posts and filter by Travel category
      const result = await blogServiceSupabase.getPublishedPosts(20, 0, detectedLanguage);
      const travelPosts = result.posts
        .filter(post => post.category === 'Travel')
        .slice(0, 3); // Get only top 3
      setTravelBlogs(travelPosts);
    } catch {
      setTravelBlogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Get localized blog URL
  const getBlogListUrl = () => {
    return detectedLanguage && detectedLanguage !== 'en' ? `/${detectedLanguage}/blog` : '/blog';
  };

  // Don't render if no travel blogs and not loading
  if (!loading && travelBlogs.length === 0) {
    return null;
  }

  return (
    <div className="bg-white flex flex-col overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative flex-1 flex flex-col">
        {/* Grid Pattern - Left Side */}
        <div 
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />

        {/* Grid Pattern - Right Side */}
        <div 
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />

        {/* Section Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 mb-4 animate-fade-in-up ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('travelBlogs.title', 'Travel Tips & Guides')}
              </p>
              <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 `}>
                <h2 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-3xl animate-fade-in-up animation-delay-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('travelBlogs.subtitle', 'Latest travel insights for digital nomads')}
                </h2>
                <Link 
                  href={getBlogListUrl()}
                  className={`group inline-flex items-center gap-2 text-sm font-medium text-tufts-blue hover:text-tufts-blue/80 transition-colors animate-fade-in-up animation-delay-200 `}
                >
                  <span>{t('travelBlogs.viewAll', 'View all articles')}</span>
                  <ArrowRightIcon className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </Link>
              </div>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* Blog Cards Grid */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              {loading ? (
                // Loading skeleton
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
              ) : (
                // Blog cards
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {travelBlogs.map((post, index) => (
                    <div 
                      key={post.id} 
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${(index + 1) * 100}ms` }}
                    >
                      <BlogCard 
                        post={post}
                        language={detectedLanguage}
                        isRTL={isRTL}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
