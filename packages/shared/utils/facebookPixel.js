/**
 * Facebook Pixel utility functions
 * These functions help track events while respecting user consent
 */

/**
 * Check if user has consented to marketing cookies
 * @returns {boolean} Whether marketing cookies are allowed
 */
export const hasMarketingConsent = () => {
  try {
    const cookieConsent = localStorage.getItem('cookieConsent');
    if (cookieConsent) {
      // Handle case where localStorage contains plain string instead of JSON
      if (cookieConsent === 'accepted' || cookieConsent === 'true') {
        return true;
      }
      
      // Try to parse as JSON
      try {
        const consent = JSON.parse(cookieConsent);
        return consent.marketing === true;
      } catch {
        return true; // Default to accepted if it's a plain string
      }
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Track a Facebook Pixel event if user has consented
 * @param {string} eventName - The event name to track
 * @param {object} parameters - Optional parameters for the event
 */
export const trackFacebookEvent = (eventName, parameters = {}) => {
  if (!hasMarketingConsent()) {
    return;
  }

  if (typeof window !== 'undefined' && window.fbq) {
    try {
      window.fbq('track', eventName, parameters);
    } catch {
    }
  } else {
  }
};

/**
 * Track custom Facebook Pixel event if user has consented
 * @param {string} eventName - The custom event name
 * @param {object} parameters - Optional parameters for the event
 */
export const trackCustomFacebookEvent = (eventName, parameters = {}) => {
  if (!hasMarketingConsent()) {
    return;
  }

  if (typeof window !== 'undefined' && window.fbq) {
    try {
      window.fbq('trackCustom', eventName, parameters);
    } catch {
    }
  } else {
  }
};

/**
 * Common Facebook Pixel events for e-commerce
 */
export const FacebookEvents = {
  VIEW_CONTENT: 'ViewContent',
  ADD_TO_CART: 'AddToCart',
  INITIATE_CHECKOUT: 'InitiateCheckout',
  PURCHASE: 'Purchase',
  LEAD: 'Lead',
  COMPLETE_REGISTRATION: 'CompleteRegistration',
  SEARCH: 'Search',
  ADD_PAYMENT_INFO: 'AddPaymentInfo',
  ADD_TO_WISHLIST: 'AddToWishlist',
  CONTACT: 'Contact',
  CUSTOMIZE_PRODUCT: 'CustomizeProduct',
  DONATE: 'Donate',
  FIND_LOCATION: 'FindLocation',
  SCHEDULE: 'Schedule',
  START_TRIAL: 'StartTrial',
  SUBMIT_APPLICATION: 'SubmitApplication',
  SUBSCRIBE: 'Subscribe'
};

/**
 * Track a purchase event
 * @param {object} purchaseData - Purchase data including value, currency, content_ids, etc.
 */
export const trackPurchase = (purchaseData) => {
  trackFacebookEvent(FacebookEvents.PURCHASE, {
    value: purchaseData.value,
    currency: purchaseData.currency || 'USD',
    content_ids: purchaseData.content_ids || [],
    content_type: purchaseData.content_type || 'product',
    ...purchaseData
  });
};

/**
 * Track an add to cart event
 * @param {object} cartData - Cart data including value, currency, content_ids, etc.
 */
export const trackAddToCart = (cartData) => {
  trackFacebookEvent(FacebookEvents.ADD_TO_CART, {
    value: cartData.value,
    currency: cartData.currency || 'USD',
    content_ids: cartData.content_ids || [],
    content_type: cartData.content_type || 'product',
    ...cartData
  });
};

/**
 * Track initiate checkout event
 * @param {object} checkoutData - Checkout data including value, currency, content_ids, etc.
 */
export const trackInitiateCheckout = (checkoutData) => {
  trackFacebookEvent(FacebookEvents.INITIATE_CHECKOUT, {
    value: checkoutData.value,
    currency: checkoutData.currency || 'USD',
    content_ids: checkoutData.content_ids || [],
    content_type: checkoutData.content_type || 'product',
    num_items: checkoutData.num_items || 1,
    ...checkoutData
  });
};

/**
 * Track lead event
 * @param {object} leadData - Lead data
 */
export const trackLead = (leadData = {}) => {
  trackFacebookEvent(FacebookEvents.LEAD, leadData);
};

/**
 * Track registration completion
 * @param {object} registrationData - Registration data
 */
export const trackCompleteRegistration = (registrationData = {}) => {
  trackFacebookEvent(FacebookEvents.COMPLETE_REGISTRATION, registrationData);
};


