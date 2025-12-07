/**
 * Custom Tracking Pixels and Analytics Utilities
 * Tracks user interactions, conversions, and page views
 */

/**
 * Track custom events with Facebook Pixel
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Additional event data
 */
export const trackFacebookPixel = (eventName, eventData = {}) => {
  if (typeof window !== 'undefined' && window.fbq) {
    try {
      window.fbq('track', eventName, eventData);
      console.log(`[FB Pixel] ${eventName}:`, eventData);
    } catch (error) {
      console.error('[FB Pixel] Error:', error);
    }
  }
};

/**
 * Track custom events with Google Analytics
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Additional event data
 */
export const trackGoogleAnalytics = (eventName, eventData = {}) => {
  if (typeof window !== 'undefined' && window.gtag) {
    try {
      window.gtag('event', eventName, eventData);
      console.log(`[GA] ${eventName}:`, eventData);
    } catch (error) {
      console.error('[GA] Error:', error);
    }
  }
};

/**
 * Track custom events with both platforms
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Additional event data
 */
export const trackEvent = (eventName, eventData = {}) => {
  trackFacebookPixel(eventName, eventData);
  trackGoogleAnalytics(eventName, eventData);
};

/**
 * Blog-specific tracking events
 */

/**
 * Track blog post view
 * @param {Object} post - Blog post object
 * @param {string} source - Source of the view (internal, external, direct)
 */
export const trackBlogPostView = (post, source = 'unknown') => {
  const eventData = {
    content_name: post.title,
    content_category: post.category || 'uncategorized',
    content_ids: [post.id],
    content_type: 'blog_post',
    value: 1,
    currency: 'USD',
    source: source,
    language: post.language || 'en',
    slug: post.slug
  };

  trackEvent('ViewContent', eventData);
  
  // Also track as custom event
  trackGoogleAnalytics('blog_post_view', {
    blog_title: post.title,
    blog_category: post.category,
    blog_id: post.id,
    view_source: source,
    language: post.language || 'en'
  });
};

/**
 * Track blog list view
 * @param {string} language - Current language
 * @param {string} category - Selected category filter
 */
export const trackBlogListView = (language = 'en', category = 'all') => {
  trackGoogleAnalytics('blog_list_view', {
    language: language,
    category_filter: category
  });
};

/**
 * Track blog post click from list
 * @param {Object} post - Blog post object
 * @param {number} position - Position in the list
 */
export const trackBlogPostClick = (post, position = 0) => {
  const eventData = {
    content_name: post.title,
    content_category: post.category || 'uncategorized',
    content_ids: [post.id],
    content_type: 'blog_post',
    position: position,
    slug: post.slug
  };

  trackGoogleAnalytics('blog_post_click', eventData);
  
  // Track as engagement
  trackFacebookPixel('ViewContent', {
    content_name: post.title,
    content_category: post.category,
    content_type: 'blog_post_preview'
  });
};

/**
 * Track app download CTA click
 * @param {string} platform - iOS or Android
 * @param {string} location - Where the CTA was clicked (blog_post, blog_list, contact, etc.)
 * @param {Object} context - Additional context (blog post title, etc.)
 */
export const trackAppDownloadClick = (platform, location, context = {}) => {
  const eventData = {
    platform: platform,
    location: location,
    value: 5, // Assign value to download intent
    currency: 'USD',
    ...context
  };

  // Track as Lead event (high-value action)
  trackFacebookPixel('Lead', eventData);
  
  trackGoogleAnalytics('app_download_click', {
    platform: platform,
    cta_location: location,
    ...context
  });
};

/**
 * Track blog search
 * @param {string} searchTerm - Search query
 * @param {number} resultsCount - Number of results found
 */
export const trackBlogSearch = (searchTerm, resultsCount) => {
  trackGoogleAnalytics('search', {
    search_term: searchTerm,
    search_results: resultsCount,
    search_type: 'blog'
  });
};

/**
 * Track blog category filter
 * @param {string} category - Selected category
 * @param {number} resultsCount - Number of posts in category
 */
export const trackBlogCategoryFilter = (category, resultsCount) => {
  trackGoogleAnalytics('blog_category_filter', {
    category: category,
    results_count: resultsCount
  });
};

/**
 * Track social share
 * @param {string} platform - Social platform (twitter, facebook, linkedin, etc.)
 * @param {Object} post - Blog post object
 */
export const trackSocialShare = (platform, post) => {
  const eventData = {
    content_name: post.title,
    content_category: post.category || 'uncategorized',
    content_type: 'blog_post',
    method: platform
  };

  trackEvent('Share', eventData);
  
  trackGoogleAnalytics('blog_share', {
    platform: platform,
    blog_title: post.title,
    blog_id: post.id
  });
};

/**
 * Track scroll depth on blog post
 * @param {number} percentage - Scroll percentage (25, 50, 75, 100)
 * @param {Object} post - Blog post object
 */
export const trackScrollDepth = (percentage, post) => {
  trackGoogleAnalytics('scroll_depth', {
    scroll_percentage: percentage,
    blog_title: post.title,
    blog_id: post.id
  });
};

/**
 * Track time spent on blog post
 * @param {number} seconds - Time spent in seconds
 * @param {Object} post - Blog post object
 */
export const trackTimeOnPost = (seconds, post) => {
  trackGoogleAnalytics('time_on_post', {
    time_seconds: seconds,
    blog_title: post.title,
    blog_id: post.id,
    engagement_level: seconds > 120 ? 'high' : seconds > 60 ? 'medium' : 'low'
  });
};

/**
 * Detect traffic source for blog post
 * @returns {string} - Traffic source (internal, external, direct, social, search)
 */
export const detectTrafficSource = () => {
  if (typeof window === 'undefined') return 'unknown';
  
  const referrer = document.referrer;
  const currentDomain = window.location.hostname;
  
  if (!referrer) {
    return 'direct';
  }
  
  const referrerDomain = new URL(referrer).hostname;
  
  // Internal traffic
  if (referrerDomain === currentDomain || referrerDomain.includes('simnetiq')) {
    return 'internal';
  }
  
  // Social media
  const socialDomains = ['facebook.com', 'twitter.com', 'linkedin.com', 'instagram.com', 'pinterest.com', 't.co', 'fb.me'];
  if (socialDomains.some(domain => referrerDomain.includes(domain))) {
    return 'social';
  }
  
  // Search engines
  const searchDomains = ['google.', 'bing.com', 'yahoo.com', 'duckduckgo.com', 'baidu.com'];
  if (searchDomains.some(domain => referrerDomain.includes(domain))) {
    return 'search';
  }
  
  return 'external';
};

/**
 * Track newsletter subscription from blog
 * @param {string} email - Subscriber email
 * @param {string} source - Source of subscription
 */
export const trackNewsletterSubscription = (email, source = 'blog') => {
  const eventData = {
    value: 3, // Assign value to newsletter signup
    currency: 'USD',
    source: source
  };

  trackFacebookPixel('CompleteRegistration', eventData);
  
  trackGoogleAnalytics('newsletter_subscription', {
    source: source,
    method: 'email'
  });
};

/**
 * Initialize scroll tracking for blog post
 * @param {Object} post - Blog post object
 */
export const initScrollTracking = (post) => {
  if (typeof window === 'undefined') return;
  
  const scrollThresholds = [25, 50, 75, 100];
  const tracked = new Set();
  
  const handleScroll = () => {
    const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
    
    scrollThresholds.forEach(threshold => {
      if (scrollPercentage >= threshold && !tracked.has(threshold)) {
        tracked.add(threshold);
        trackScrollDepth(threshold, post);
      }
    });
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => window.removeEventListener('scroll', handleScroll);
};

/**
 * Initialize time tracking for blog post
 * @param {Object} post - Blog post object
 */
export const initTimeTracking = (post) => {
  if (typeof window === 'undefined') return;
  
  const startTime = Date.now();
  const tracked = new Set();
  
  const checkTime = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    
    // Track at 30s, 60s, 120s, 300s intervals
    const thresholds = [30, 60, 120, 300];
    thresholds.forEach(threshold => {
      if (elapsed >= threshold && !tracked.has(threshold)) {
        tracked.add(threshold);
        trackTimeOnPost(threshold, post);
      }
    });
  };
  
  const interval = setInterval(checkTime, 10000); // Check every 10 seconds
  
  return () => clearInterval(interval);
};

export default {
  trackEvent,
  trackBlogPostView,
  trackBlogListView,
  trackBlogPostClick,
  trackAppDownloadClick,
  trackBlogSearch,
  trackBlogCategoryFilter,
  trackSocialShare,
  trackScrollDepth,
  trackTimeOnPost,
  detectTrafficSource,
  trackNewsletterSubscription,
  initScrollTracking,
  initTimeTracking
};

