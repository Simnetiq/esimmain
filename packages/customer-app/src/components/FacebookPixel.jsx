'use client';

import { useEffect } from 'react';

const FacebookPixel = () => {
  useEffect(() => {
    // Function to load Facebook Pixel
    const loadFacebookPixel = () => {
      if (typeof window === 'undefined') return;
      
      // Check if pixel is already loaded
      if (window.fbq) {
        return;
      }

      // Facebook Pixel Code with error handling for ad blockers
      try {
        /* eslint-disable @typescript-eslint/no-unused-expressions */
        (function(f, b, e, v, n, t, s) {
          if (f.fbq) return;
          n = f.fbq = function() {
            n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
          };
          if (!f._fbq) f._fbq = n;
          n.push = n;
          n.loaded = !0;
          n.version = '2.0';
          n.queue = [];
          t = b.createElement(e);
          t.async = !0;
          t.src = v;
          t.onerror = function() {
          };
          s = b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
        /* eslint-enable @typescript-eslint/no-unused-expressions */

        // Initialize the pixel with your Pixel ID
        if (window.fbq) {
          window.fbq('init', '23986256027642678');
          window.fbq('track', 'PageView');
        }
      } catch {
      } 
    };

    // Function to check marketing consent
    const hasMarketingConsent = () => {
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

    // Function to remove Facebook Pixel
    const removeFacebookPixel = () => {
      if (typeof window === 'undefined') return;
      
      // Remove fbq function
      if (window.fbq) {
        delete window.fbq;
        delete window._fbq;
      }
      
      // Remove script tags
      const scripts = document.querySelectorAll('script[src*="fbevents.js"]');
      scripts.forEach(script => script.remove());
    };

    // Load pixel if user has consented - defer to avoid blocking
    if (hasMarketingConsent()) {
      // Use requestIdleCallback for non-critical third-party scripts
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => loadFacebookPixel(), { timeout: 3000 });
      } else {
        // Fallback: delay by 2 seconds
        setTimeout(loadFacebookPixel, 2000);
      }
    }

    // Listen for consent changes
    const handleConsentChange = (event) => {
      if (event.detail && event.detail.marketing) {
        loadFacebookPixel();
      } else {
        removeFacebookPixel();
      }
    };

    // Listen for custom consent events
    window.addEventListener('cookieConsentChanged', handleConsentChange);
    
    // Listen for storage changes (in case consent is changed in another tab)
    const handleStorageChange = (event) => {
      if (event.key === 'cookieConsent') {
        if (hasMarketingConsent()) {
          loadFacebookPixel();
        } else {
          removeFacebookPixel();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener('cookieConsentChanged', handleConsentChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return (
    <>
      {/* Noscript fallback for Facebook Pixel */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://www.facebook.com/tr?id=23986256027642678&ev=PageView&noscript=1"
          alt="Facebook Pixel"
          width="1"
          height="1"
          style={{ display: 'none' }}
        />
      </noscript>
    </>
  );
};

export default FacebookPixel;