'use client';

import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const Analytics = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [hasConsent, setHasConsent] = useState(false);

  // Check if user has marketing/analytics consent
  const checkConsent = () => {
    try {
      const cookieConsent = localStorage.getItem('cookieConsent');
      if (cookieConsent) {
        if (cookieConsent === 'accepted' || cookieConsent === 'true') {
          return true;
        }
        try {
          const consent = JSON.parse(cookieConsent);
          return consent.marketing === true || consent.analytics === true;
        } catch {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  };

  // Listen for consent changes from CookieConsent component
  useEffect(() => {
    // Check initial consent state
    setHasConsent(checkConsent());

    // Listen for consent changes
    const handleConsentChange = (event) => {
      const consent = event.detail;
      if (consent.marketing === true || consent.analytics === true) {
        setHasConsent(true);
      }
    };

    window.addEventListener('cookieConsentChanged', handleConsentChange);
    return () => {
      window.removeEventListener('cookieConsentChanged', handleConsentChange);
    };
  }, []);

  // Load analytics only when consent is given
  useEffect(() => {
    if (!hasConsent) return;

    // Initialize gtag
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
        initGtag();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://www.googletagmanager.com/gtag/js?id=G-X39DVW1SQS';
      script.async = true;
      script.onload = initGtag;
      document.head.appendChild(script);
    };

    // Load after short delay or on first user interaction
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      loadGtagScript();
    };

    // Load after 1 second (user already consented, so don't delay too much)
    const timer = setTimeout(load, 1000);

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
  }, [hasConsent, pathname, searchParams]);

  // Track page views on route change (only if gtag is already loaded)
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
