"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { marked } from 'marked';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import blogServiceSupabase from '@esim/shared/services/blogServiceSupabase';
import { detectLanguageFromPath, getLocalizedBlogListUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatBlogDate } from '@esim/shared/utils/blogUtils';
import BlogCategoryTag from './BlogCategoryTag';
import BlogViewCount from './BlogViewCount';
import BlogAppDownload from './BlogAppDownload';
import { trackBlogPostView, trackSocialShare, detectTrafficSource, initScrollTracking, initTimeTracking } from '@esim/shared/utils/trackingPixels';

// Blog-specific prose styles (code-split from main bundle)
import '../../app/blog-prose.css';

// Inline SVG icons
const CalendarIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>
  </svg>
);

const ArrowLeftIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

const ShareIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const CopyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

// Lazy load toast
const showToast = async (message) => {
  const toast = (await import('react-hot-toast')).default;
  toast.success(message);
};

const BlogPost = ({ slug }) => {
  const pathname = usePathname();
  const { locale, t, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  // Language detection
  const detectedLanguage = useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);
  
  const direction = mounted ? getLanguageDirection(detectedLanguage) : 'ltr';
  const isRTL = direction === 'rtl';
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Configure marked options
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: true,
      mangle: false,
      sanitize: false
    });
  }, []);

  // Parse markdown content
  const parsedContent = useMemo(() => {
    if (!post?.content) return '';
    const isHTML = /<[a-z][\s\S]*>/i.test(post.content);
    if (isHTML) return post.content;
    try {
      return marked.parse(post.content);
    } catch {
      return post.content;
    }
  }, [post?.content]);

  // Load blog post
  useEffect(() => {
    const loadBlogPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!slug) {
          setError('No blog post specified');
          return;
        }

        const postData = await blogServiceSupabase.getPostBySlug(slug, detectedLanguage);
        
        if (postData) {
          setPost(postData);
          await blogServiceSupabase.incrementViews(postData.id);
          const source = detectTrafficSource();
          trackBlogPostView(postData, source);
        } else {
          setError('Blog post not found');
        }
      } catch (err) {
        setError(`Error loading blog post: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadBlogPost();
  }, [slug, detectedLanguage]);

  // Initialize tracking
  useEffect(() => {
    if (!post) return;
    const cleanupScroll = initScrollTracking(post);
    const cleanupTime = initTimeTracking(post);
    return () => {
      if (cleanupScroll) cleanupScroll();
      if (cleanupTime) cleanupTime();
    };
  }, [post]);

  // Structured data for SEO
  const structuredData = useMemo(() => {
    if (!post) return null;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const postUrl = `${baseUrl}/blog/${slug}`;
    const imageUrl = post.featuredImage?.startsWith('http') 
      ? post.featuredImage 
      : `${baseUrl}${post.featuredImage || '/images/og-image.svg'}`;

    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt || post.seoDescription,
      "image": imageUrl,
      "author": { "@type": "Person", "name": post.author || "Simnetiq Team" },
      "publisher": {
        "@type": "Organization",
        "name": "Simnetiq",
        "logo": { "@type": "ImageObject", "url": `${baseUrl}/images/logo_icon/logo.png` }
      },
      "datePublished": post.publishedAt?.toISOString(),
      "dateModified": post.updatedAt?.toISOString(),
      "mainEntityOfPage": { "@type": "WebPage", "@id": postUrl },
      "articleSection": post.category,
      "keywords": post.tags?.join(', '),
      "url": postUrl
    };
  }, [post, slug]);

  // Update document title
  useEffect(() => {
    if (post?.title) {
      document.title = `${post.title} | Simnetiq Blog`;
    }
  }, [post?.title]);

  const handleShare = useCallback(() => setShowShareModal(true), []);
  const closeShareModal = useCallback(() => setShowShareModal(false), []);

  const copyToClipboard = useCallback(async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast(t('blog.linkCopied', 'Link copied to clipboard!'));
      setShowShareModal(false);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      showToast(t('blog.linkCopied', 'Link copied to clipboard!'));
      setShowShareModal(false);
    }
  }, [t]);

  const shareToSocial = useCallback((platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.title || 'Blog Post');
    const text = encodeURIComponent(post?.excerpt || '');
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}&via=Simnetiq`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${text}`,
      whatsapp: `https://wa.me/?text=${title}%20${url}`,
      telegram: `https://t.me/share/url?url=${url}&text=${title}`
    };
    
    if (post) trackSocialShare(platform, post);
    window.open(shareUrls[platform], '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    setShowShareModal(false);
  }, [post]);

  // Loading state
  if (loading || !mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir={direction} lang={detectedLanguage}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue mx-auto" />
          <p className="mt-4 text-gray-600">{t('blog.loading', 'Loading blog post...')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir={direction} lang={detectedLanguage}>
        <div className="text-center px-4">
          <h1 className="text-4xl font-medium tracking-tight text-eerie-black mb-4">
            {t('blog.postNotFound', 'Post Not Found')}
          </h1>
          <p className="text-cool-black mb-8">
            {error || t('blog.postNotFoundDescription', "The blog post you're looking for doesn't exist.")}
          </p>
          <Link href={getLocalizedBlogListUrl(detectedLanguage)} className="btn-primary px-6 py-3 rounded-full">
            {t('blog.backToBlog', 'Back to Blog')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Structured Data for SEO */}
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      
      <div className="bg-white min-h-screen flex flex-col" dir={direction} lang={detectedLanguage}>
        <div className="relative isolate flex-1 flex flex-col">
          {/* Grid Patterns */}
          {/* Header Section */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-6">
              <div className="px-4 sm:py-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className={`flex items-center justify-between mb-4 `}>
                  <Link 
                    href={getLocalizedBlogListUrl(detectedLanguage)} 
                    className={`inline-flex items-center text-tufts-blue hover:text-cobalt-blue font-medium transition-colors `}
                  >
                    {isRTL ? <ArrowRightIcon className="w-4 h-4 ml-2" /> : <ArrowLeftIcon className="w-4 h-4 mr-2" />}
                    {t('blog.backToBlog', 'Back to Blog')}
                  </Link>
                  
                  <button 
                    onClick={handleShare}
                    className={`flex items-center gap-2 text-tufts-blue hover:text-cobalt-blue transition-colors `}
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span>{t('blog.sharePost', 'Share')}</span>
                  </button>
                </div>

                {/* Category Badge */}
                {post.category && (
                  <div className="mb-4">
                    <BlogCategoryTag category={post.category} language={detectedLanguage} size="md" />
                  </div>
                )}

                {/* Title */}
                <h1 className={`text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-eerie-black leading-tight mb-4 ${isRTL ? 'text-right' : ''}`}>
                  {post.title}
                </h1>

                {/* Meta Information */}
                <div className={`flex flex-wrap items-center gap-4 text-cool-black `}>
                  <div className={`flex items-center gap-1 `}>
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatBlogDate(post.publishedAt, detectedLanguage)}</span>
                  </div>
                  <BlogViewCount views={post.views || 0} language={detectedLanguage} isRTL={isRTL} className="text-cool-black" />
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100" />
          </div>

          {/* Featured Image */}
          {post.featuredImage && (
            <div className="mx-auto w-full max-w-9xl">
              <div className="mx-auto w-full max-w-7xl">
                <div className="px-4 py-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                  <div className="relative h-72 md:h-96 lg:h-[500px] overflow-hidden rounded-lg">
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
                      className="object-cover"
                      priority
                    />
                  </div>
                </div>
              </div>
              <div className="w-full h-px bg-gray-100" />
            </div>
          )}

          {/* Content Section */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <article className={`prose prose-lg prose-slate max-w-none prose-headings:font-semibold prose-headings:text-eerie-black prose-p:text-cool-black prose-p:leading-relaxed prose-a:text-tufts-blue prose-a:no-underline hover:prose-a:underline prose-strong:text-eerie-black prose-code:text-tufts-blue prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-img:rounded-lg prose-img:shadow-md ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div dangerouslySetInnerHTML={{ __html: parsedContent }} />
                </article>

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-gray-200">
                    <h3 className={`text-base font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : ''}`}>
                      {t('blog.relatedTags', 'Related Tags')}
                    </h3>
                    <div className={`flex flex-wrap gap-2 `}>
                      {post.tags.map((tag, index) => (
                        <span key={index} className="bg-tufts-blue/10 text-tufts-blue px-3 py-1 rounded-full text-sm font-medium">
                          #{tag.length > 15 ? tag.substring(0, 15) + '...' : tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* App Download CTA */}
                <BlogAppDownload 
                  language={detectedLanguage}
                  isRTL={isRTL}
                  location="blog_post"
                  context={{ page: 'blog_post', blog_title: post.title, blog_id: post.id, blog_category: post.category }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeShareModal}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className={`flex items-center justify-between mb-6 `}>
              <h3 className="text-lg font-semibold text-eerie-black">{t('blog.sharePost', 'Share this post')}</h3>
              <button onClick={closeShareModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <XIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={copyToClipboard}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-eerie-black text-white rounded-full hover:bg-gray-800 transition-colors `}
              >
                <CopyIcon className="w-5 h-5" />
                <span>{t('blog.copyLink', 'Copy Link')}</span>
              </button>
              
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'twitter', label: 'Twitter', color: 'hover:bg-[#1DA1F2]' },
                  { id: 'facebook', label: 'Facebook', color: 'hover:bg-[#4267B2]' },
                  { id: 'linkedin', label: 'LinkedIn', color: 'hover:bg-[#0077B5]' },
                  { id: 'whatsapp', label: 'WhatsApp', color: 'hover:bg-[#25D366]' }
                ].map(({ id, label, color }) => (
                  <button
                    key={id}
                    onClick={() => shareToSocial(id)}
                    className={`flex items-center justify-center gap-2 px-4 py-3 border border-gray-200 rounded-full ${color} hover:text-white hover:border-transparent transition-colors`}
                  >
                    <span className="font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BlogPost;
