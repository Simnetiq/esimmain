"use client";

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { marked } from 'marked';

// Inline SVG icons to avoid lucide-react bundle overhead
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

const Share2Icon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98"/><path d="m15.41 6.51-6.82 3.98"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);
import { useI18n } from '@esim/shared/contexts/I18nContext';
import blogServiceSeparate from '@esim/shared/services/blogServiceSeparate';
import { detectLanguageFromPath, getLocalizedBlogListUrl, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatBlogDate } from '@esim/shared/utils/blogUtils';
import BlogCategoryTag from './BlogCategoryTag';
import BlogViewCount from './BlogViewCount';
import BlogAppDownload from './BlogAppDownload';
import { trackBlogPostView, trackSocialShare, detectTrafficSource, initScrollTracking, initTimeTracking } from '@esim/shared/utils/trackingPixels';
import Image from 'next/image';

const BlogPost = ({ slug }) => {
  const pathname = usePathname();
  const { locale, t, isLoading: i18nLoading } = useI18n();
  
  // Language detection with proper I18n initialization handling
  const detectedLanguage = React.useMemo(() => {
    try {
      // Wait for I18n to initialize before using locale
      if (i18nLoading) {
        // While loading, use localStorage or pathname detection
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      // Once loaded, prioritize locale from I18nContext
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);
  
  // Get text direction for RTL support
  const direction = getLanguageDirection(detectedLanguage);
  const isRTL = direction === 'rtl';
  
  
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Configure marked options for better rendering
  useMemo(() => {
    marked.setOptions({
      breaks: true, // Convert \n to <br>
      gfm: true, // GitHub Flavored Markdown
      headerIds: true,
      mangle: false,
      sanitize: false // We trust our admin content
    });
  }, []);

  // Parse markdown content to HTML
  const parsedContent = useMemo(() => {
    if (!post?.content) return '';
    
    // Check if content is already HTML (contains HTML tags)
    const isHTML = /<[a-z][\s\S]*>/i.test(post.content);
    
    if (isHTML) {
      // Content is already HTML, return as-is
      return post.content;
    } else {
      // Content is markdown, parse it
      try {
        return marked.parse(post.content);
      } catch {
        return post.content; // Fallback to raw content
      }
    }
  }, [post?.content]);

  useEffect(() => {
    const loadBlogPost = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!slug) {
          console.error('BlogPost: No slug provided');
          setError('No blog post specified');
          return;
        }

        const postData = await blogServiceSeparate.getPostBySlug(slug, detectedLanguage);
        
        if (postData) {
          setPost(postData);
          
          // Increment view count
          await blogServiceSeparate.incrementViews(postData.id);
          
          // Track blog post view with source detection
          const source = detectTrafficSource();
          trackBlogPostView(postData, source);
        } else {
          console.error('BlogPost: Post not found for slug:', slug);
          setError('Blog post not found');
        }
      } catch (err) {
        console.error('BlogPost: Error loading blog post:', err);
        setError(`Error loading blog post: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadBlogPost();
  }, [slug, detectedLanguage]); // detectedLanguage already includes pathname and locale changes

  // Initialize scroll and time tracking
  useEffect(() => {
    if (!post) return;
    
    const cleanupScroll = initScrollTracking(post);
    const cleanupTime = initTimeTracking(post);
    
    return () => {
      if (cleanupScroll) cleanupScroll();
      if (cleanupTime) cleanupTime();
    };
  }, [post]);

  // Generate structured data for SEO - memoized to prevent recalculation
  // Must be called before any conditional returns (React hooks rule)
  const generateStructuredData = useMemo(() => {
    if (!post) return null;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const postUrl = `${baseUrl}/blog/${slug}`;
    const imageUrl = post.featuredImage ? 
      (post.featuredImage.startsWith('http') ? post.featuredImage : `${baseUrl}${post.featuredImage}`) :
      `${baseUrl}/images/og-image.svg`;

    return {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.excerpt || post.seoDescription,
      "image": imageUrl,
      "author": {
        "@type": "Person",
        "name": post.author || "Simnetiq Team"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Simnetiq",
        "logo": {
          "@type": "ImageObject",
          "url": `${baseUrl}/images/logo_icon/logo.png`
        }
      },
      "datePublished": post.publishedAt?.toISOString(),
      "dateModified": post.updatedAt?.toISOString(),
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": postUrl
      },
      "articleSection": post.category,
      "keywords": post.tags?.join(', '),
      "wordCount": post.content ? post.content.replace(/<[^>]*>/g, '').split(' ').length : 0,
      "url": postUrl
    };
  }, [post, slug]);

  // Update document title for client-side navigation
  useEffect(() => {
    if (post?.title) {
      document.title = `${post.title} | Simnetiq Blog`;
    }
  }, [post?.title]);

  const handleShare = () => {
    setShowShareModal(true);
  };

  const copyToClipboard = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      alert(t('blog.linkCopied', 'Link copied to clipboard!'));
      setShowShareModal(false);
    } catch {
      // Fallback if clipboard API fails
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert(t('blog.linkCopied', 'Link copied to clipboard!'));
      setShowShareModal(false);
    }
  };

  const shareToSocial = (platform) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post?.title || 'Blog Post');
    const text = encodeURIComponent(post?.excerpt || '');
    
    let shareUrl = '';
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}&via=Simnetiq`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${title}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}&summary=${text}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${title}%20${url}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${url}&text=${title}`;
        break;
      default:
        return;
    }
    
    // Track social share
    if (post) {
      trackSocialShare(platform, post);
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400,scrollbars=yes,resizable=yes');
    setShowShareModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir={direction} lang={detectedLanguage}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" dir={direction} lang={detectedLanguage}>
        <div className="text-center px-4">
          <h1 className="text-4xl font-medium tracking-tight text-eerie-black mb-4">{t('blog.postNotFound', 'Post Not Found')}</h1>
          <p className="text-cool-black mb-8">{error || t('blog.postNotFoundDescription', 'The blog post you\'re looking for doesn\'t exist.')}</p>
          <Link 
            href={getLocalizedBlogListUrl(detectedLanguage)} 
            className="btn-primary px-6 py-3"
          >
            {t('blog.backToBlog', 'Back to Blog')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Structured Data for SEO - injected via script tag */}
      {post && generateStructuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateStructuredData)
          }}
        />
      )}
      <div className="bg-white min-h-screen flex flex-col" dir={direction} lang={detectedLanguage}>
        <div className="relative isolate flex-1 flex flex-col">
          {/* Grid Pattern - Left Side */}
          <div 
            className="hidden xl:block absolute left-0 top-0 bottom-0 w-32 "
            style={{
              backgroundSize: '10px 10px',
              backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
            }}
          ></div>

          {/* Grid Pattern - Right Side */}
          <div 
            className="hidden xl:block absolute right-0 top-0 bottom-0 w-32 "
            style={{
              backgroundSize: '10px 10px',
              backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
            }}
          ></div>

          {/* Header Section */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-6">
              <div className="px-4 sm:py-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="flex items-center justify-between mb-4">
                  <Link 
                    href={getLocalizedBlogListUrl(detectedLanguage)} 
                    className="inline-flex items-center text-tufts-blue hover:text-cobalt-blue font-medium transition-colors duration-200"
                  >
                    {isRTL ? (
                      <ArrowRightIcon className="w-4 h-4 ml-2" />
                    ) : (
                      <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    )}
                    {t('blog.backToBlog', 'Back to Blog')}
                  </Link>
                  
                  <button 
                    onClick={handleShare}
                    className="flex items-center space-x-2 text-tufts-blue hover:text-cobalt-blue transition-colors duration-200"
                  >
                    <Share2Icon className="w-4 h-4" />
                    <span>{t('blog.sharePost', 'Share')}</span>
                  </button>
                </div>

                {/* Category Badge */}
                {post.category && (
                  <div className="mb-4">
                    <BlogCategoryTag 
                      category={post.category}
                      language={detectedLanguage}
                      size="md"
                    />
                  </div>
                )}

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-eerie-black leading-tight mb-4">
                  {post.title}
                </h1>

                {/* Meta Information */}
                <div className={`flex flex-wrap items-center gap-4 text-cool-black ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className={`flex items-center ${isRTL ? 'space-x-reverse space-x-1' : 'space-x-1'} text-cool-black`}>
                    <CalendarIcon className="w-4 h-4" />
                    <span>{formatBlogDate(post.publishedAt, detectedLanguage)}</span>
                  </div>
                  <BlogViewCount 
                    views={post.views || 0}
                    language={detectedLanguage}
                    isRTL={isRTL}
                    className="text-cool-black"
                  />
                </div>
              </div>
            </div>
            {/* Full width gray line */}
            <div className="w-full h-px bg-gray-100"></div>
          </div>

          {/* Featured Image Section */}
          {post.featuredImage && (
            <div className="mx-auto w-full max-w-9xl">
              <div className="mx-auto w-full max-w-7xl">
                <div className="px-4 py-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                  <div className="relative h-72 md:h-96 lg:h-[500px] overflow-hidden">
                    <Image
                      src={post.featuredImage}
                      alt={post.title}
                      className="w-full h-full object-cover"
                      width={1200}
                      height={600}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1000px"
                      quality={80}
                      priority
                    />
                  </div>
                </div>
              </div>
              {/* Full width gray line */}
              <div className="w-full h-px bg-gray-100"></div>
            </div>
          )}

          {/* Content Section */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <article className={`prose prose-lg prose-slate max-w-none prose-headings:font-semibold prose-headings:text-eerie-black prose-p:text-cool-black prose-p:leading-relaxed prose-a:text-tufts-blue prose-a:no-underline hover:prose-a:underline prose-strong:text-eerie-black prose-code:text-tufts-blue prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-img:rounded-lg prose-img:shadow-md ${isRTL ? 'text-right' : 'text-left'}`}>
                  <div dangerouslySetInnerHTML={{ __html: parsedContent }} />
                </article>

                {/* Tags at bottom of post */}
                {post.tags && post.tags.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h3 className="text-base font-semibold text-eerie-black mb-4">{t('blog.relatedTags', 'Related Tags')}</h3>
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium"
                        >
                          #{tag.length > 8 ? tag.substring(0, 8) + '...' : tag}
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
                  context={{
                    page: 'blog_post',
                    blog_title: post.title,
                    blog_id: post.id,
                    blog_category: post.category
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" dir={direction}>
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-4">
            <h3 className={`text-base font-semibold text-gray-900 mb-4 ${isRTL ? 'float-right' : 'float-left'}`}>{t('blog.sharePost', 'Share this post')}</h3>
            
              <button
                onClick={() => setShowShareModal(false)}
                className={`flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors text-xs sm:text-sm ${isRTL ? 'float-left' : 'float-right'}`}
              >
                <XIcon className="w-4 h-4" /> <span>{t('common.close', 'Close')}</span>
              </button>
            
            <div className="mt-2 space-y-2">
              <button
                onClick={copyToClipboard}
                className="w-full flex items-center justify-center space-x-2 px-2 py-1.5 bg-tufts-blue text-white rounded-full hover:bg-blue-700 transition-colors text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>{t('blog.copyLink', 'Copy Link')}</span>
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => shareToSocial('twitter')}
                  className="flex items-center justify-center space-x-2 px-2 py-1.5 bg-white text-tufts-blue rounded-full border border-tufts-blue hover:bg-tufts-blue hover:text-white transition-colors text-xs sm:text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  <span>Twitter</span>
                </button>
                
                <button
                  onClick={() => shareToSocial('facebook')}
                  className="flex items-center justify-center space-x-2 px-2 py-1.5 bg-white text-tufts-blue rounded-full border border-tufts-blue hover:bg-tufts-blue hover:text-white transition-colors text-xs sm:text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Facebook</span>
                </button>
                
                <button
                  onClick={() => shareToSocial('linkedin')}
                  className="flex items-center justify-center space-x-2 px-2 py-1.5 bg-white text-tufts-blue rounded-full border border-tufts-blue hover:bg-tufts-blue hover:text-white transition-colors text-xs sm:text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  <span>LinkedIn</span>
                </button>
                
                <button
                  onClick={() => shareToSocial('whatsapp')}
                  className="flex items-center justify-center space-x-2 px-2 py-1.5 bg-white text-tufts-blue rounded-full border border-tufts-blue hover:bg-tufts-blue hover:text-white transition-colors text-xs sm:text-sm"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>
            
           
          </div>
        </div>
      )}
    </>
  );
};

export default BlogPost;
