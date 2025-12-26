'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { getPlatformAppStoreLink } from '@esim/shared/utils/appStoreLinks';
import CountrySearchBar from '../CountrySearchBar';

// Inline SVG icons to avoid lucide-react bundle overhead
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

export default function HeroSection({ onCountrySelect }) {
  const pathname = usePathname();
  const { locale, t, translations, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Debug logging
  useEffect(() => {

  }, [pathname, locale, i18nLoading, detectedLanguage, direction, mounted]);

  const handleDownloadApp = () => {
    // Track with Facebook Pixel - Download App CTA
    trackCustomFacebookEvent('DownloadAppCTA', {
      source: 'hero_section',
      content_type: 'download_button',
      button_location: 'hero_badge',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  // Check if translations are loaded
  const hasTranslations = translations && Object.keys(translations).length > 0 && translations.hero;
  
  // Trust indicators data - using inline SVG icons
  const trustIndicators = [
    { Icon: GlobeIcon, label: t('hero.countries', '200+ Countries'), key: 'countries' },
    { Icon: ZapIcon, label: t('hero.instantActivation', 'Instant Activation'), key: 'activation' },
    { Icon: ShieldIcon, label: t('hero.securePayment', 'Secure Payment'), key: 'secure' },
  ];
  
  // Grid pattern style (matching FeaturesSection)
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };
  
  // Skeleton loader
  if (!hasTranslations) {
    return (
      <div className="hero-section relative min-h-[85vh] flex flex-col" style={{ background: 'linear-gradient(to bottom right, rgba(83, 116, 205, 0.25), rgba(240, 249, 255, 0.4), rgba(239, 246, 255, 1))' }} dir={direction} lang={detectedLanguage}>
        {/* Gradient Orbs - Using #5374CD - Large to bleed into navbar and features */}
        <div className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full blur-[120px] -translate-x-1/3 -translate-y-1/3" style={{ backgroundColor: 'rgba(83, 116, 205, 0.25)' }} />
        <div className="absolute bottom-0 right-0 w-[700px] h-[700px] rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" style={{ backgroundColor: 'rgba(83, 116, 205, 0.2)' }} />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[80px]" style={{ backgroundColor: 'rgba(83, 116, 205, 0.15)' }} />
        
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
          
          <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 lg:py-20">
            <div className="mx-auto w-full max-w-7xl">§
              <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl text-center">

                {/* Badge skeleton */}
                <div className="flex mb-6 justify-center">
                  <div className="h-10 w-52 bg-white/60 rounded-full shadow-sm" />
                </div>
                
                {/* Headline skeleton */}
                <div className="space-y-3 mb-8">
                  <div className="h-12 sm:h-16 lg:h-20 w-full max-w-2xl bg-gray-200/70 rounded-lg mx-auto" />
                </div>
                
                {/* Search bar skeleton */}
                <div className="max-w-2xl mx-auto mb-10">
                  <div className="p-1 bg-gradient-to-r from-tufts-blue/40 via-tufts-blue/30 to-amber-400/40 rounded-2xl">
                    <div className="bg-white rounded-xl p-4">
                      <div className="h-12 w-full bg-gray-100 rounded-lg" />
                    </div>
                  </div>
                </div>
                
                {/* Subtitle skeleton */}
                <div className="space-y-2 mb-8 max-w-2xl mx-auto">
                  <div className="h-5 w-full bg-gray-100/80 rounded" />
                  <div className="h-5 w-3/4 bg-gray-100/80 rounded mx-auto" />
                </div>

                {/* Trust indicators skeleton */}
                <div className="flex flex-wrap items-center gap-6 sm:gap-10 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-tufts-blue/20 rounded" />
                    <div className="h-4 w-24 bg-gray-100 rounded" />
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-tufts-blue/20 rounded" />
                    <div className="h-4 w-28 bg-gray-100 rounded" />
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-tufts-blue/20 rounded" />
                    <div className="h-4 w-26 bg-gray-100 rounded" />
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hero-section relative min-h-[85vh] flex flex-col" dir={direction} lang={detectedLanguage}>
      {/* Gradient Orbs - Fixed positioning to prevent CLS */}
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] rounded-full blur-[50px] opacity-60 pointer-events-none" style={{ backgroundColor: 'rgba(83, 116, 205, 0.2)', contain: 'layout paint' }} aria-hidden="true" />
      <div className="absolute w-[500px] h-[500px] bg-white/40 rounded-full blur-[60px] pointer-events-none" style={{ top: 'calc(50% - 250px)', left: 'calc(50% - 250px)', contain: 'layout paint' }} aria-hidden="true" />
      
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
        
        {/* Main Content */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-16 lg:py-20">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl text-center">

              {/* Badge - Links to App Store (auto-detects platform) */}
              <div className="flex mb-6 justify-center">
                <a
                  href={getPlatformAppStoreLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleDownloadApp}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm hover:border-tufts-blue hover:shadow-md transition-all group"
                >
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-base font-medium text-gray-700 group-hover:text-tufts-blue transition-colors">
                    {t('hero.badge', 'Now available on iOS & Android')}
                  </span>
                  <ArrowRightIcon className={`w-4 h-4 text-gray-400 group-hover:text-tufts-blue transition-all ${direction === 'rtl' ? 'rotate-180' : ''}`} />
                </a>
              </div>
              
              {/* Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-eerie-black mb-8">
                {t('hero.stayConnected', 'The easiest way to get mobile data anywhere in the world')}
              </h1>
              
              {/* Search Bar - Main CTA */}
              <div className="relative z-50 max-w-2xl mx-auto mb-10 p-1 bg-gradient-to-r from-tufts-blue via-tufts-blue/80 to-white rounded-2xl shadow-xl">
                <div className="bg-white rounded-xl p-2">
                  <CountrySearchBar showCountryCount={true} onCountrySelect={onCountrySelect} />
                </div>
              </div>
              
              {/* Subtitle */}
              <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
                {t('hero.subtitle', 'Activate your eSIM in minutes and stay connected in 200+ destinations worldwide. Fast 4G/5G networks, simple setup, and plans designed for travelers — not roaming fees.')}
              </p>
              
              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center gap-6 sm:gap-10 text-sm text-gray-500 justify-center">
                {trustIndicators.map(({ Icon, label, key }, index) => (
                  <React.Fragment key={key}>
                    <div className="flex items-center gap-2 text-eerie-black">
                      <Icon className="w-5 h-5 text-eerie-black" />
                      <span className="text-eerie-black">{label}</span>
                    </div>
                    {/* Vertical separator between items */}
                    {index < trustIndicators.length - 1 && (
                      <div className="hidden sm:block w-px h-4 bg-gray-300" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
