'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const Analytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if user has marketing consent
    const hasMarketingConsent = () => {
      try {
        const cookieConsent = localStorage.getItem('cookieConsent');
        if (cookieConsent) {
          if (cookieConsent === 'accepted' || cookieConsent === 'true') {
            return true;
          }
          try {
            const consent = JSON.parse(cookieConsent);
            return consent.marketing === true;
          } catch {
            return true;
          }
        }
        return false;
      } catch {
        return false;
      }
    };

    // Only load analytics if user has consented
    if (!hasMarketingConsent()) {
      return;
    }

    // Initialize gtag with lazy loading
    const initGtag = () => {
      if (typeof window === 'undefined' || window.gtag) return;

      // Create dataLayer
      window.dataLayer = window.dataLayer || [];
      window.gtag = function() {
        window.dataLayer.push(arguments);
      };
      window.gtag('js', new Date());

      // Configure Google Analytics
      window.gtag('config', 'G-X39DVW1SQS', {
        page_path: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
        send_page_view: true,
      });

      // Configure Google Ads
      window.gtag('config', 'AW-17231669358', {
        page_path: pathname + (searchParams.toString() ? `?${searchParams.toString()}` : ''),
      });
    };

    // Load gtag script only when needed
    const loadGtagScript = () => {
      if (document.querySelector('script[src*="googletagmanager.com/gtag/js"]')) {
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-X39DVW1SQS';
      script.async = true;
      script.onload = initGtag;
      document.head.appendChild(script);
    };

    // Delay loading by 3 seconds or until user interaction
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      loadGtagScript();
    };

    // Load after 3 seconds
    const timer = setTimeout(load, 3000);

    // Or load on first user interaction
    const events = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    events.forEach(event => {
      window.addEventListener(event, load, { once: true, passive: true });
    });

    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        window.removeEventListener(event, load);
      });
    };
  }, [pathname, searchParams]);

  // Track page views on route change
  useEffect(() => {
    if (typeof window === 'undefined' || !window.gtag) return;

    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    
    window.gtag('config', 'G-X39DVW1SQS', {
      page_path: url,
    });

    window.gtag('config', 'AW-17231669358', {
      page_path: url,
    });
  }, [pathname, searchParams]);

  return null;
};

export default Analytics;

