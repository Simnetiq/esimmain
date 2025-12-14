'use client';

import React, { useEffect, useState } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import CountrySearchBar from '../CountrySearchBar';
import { Globe, Zap, Shield, ArrowRight } from 'lucide-react';

export default function HeroSection({ onCountrySelect }) {
  const { t, translations } = useI18n();
  const [isVisible, setIsVisible] = useState(false);
  
  // Trigger animations on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
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
  
  // Trust indicators data
  const trustIndicators = [
    { icon: Globe, label: t('hero.countries', '200+ Countries'), key: 'countries' },
    { icon: Zap, label: t('hero.instantActivation', 'Instant Activation'), key: 'activation' },
    { icon: Shield, label: t('hero.securePayment', 'Secure Payment'), key: 'secure' },
  ];
  
  // Grid pattern style (matching FeaturesSection)
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };
  
  // Skeleton loader
  if (!hasTranslations) {
    return (
      <div className="hero-section relative min-h-[85vh] flex flex-col" style={{ background: 'linear-gradient(to bottom right, rgba(83, 116, 205, 0.25), rgba(240, 249, 255, 0.4), rgba(239, 246, 255, 1))' }}>
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
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl text-center">
                
                {/* Badge skeleton */}
                <div className="flex justify-center mb-6">
                  <div className="h-10 w-52 bg-white/60 rounded-full animate-pulse shadow-sm" />
                </div>
                
                {/* Headline skeleton */}
                <div className="space-y-3 mb-8">
                  <div className="h-12 sm:h-16 lg:h-20 w-full max-w-2xl bg-gray-200/70 rounded-lg mx-auto animate-pulse" />
                </div>
                
                {/* Search bar skeleton */}
                <div className="max-w-2xl mx-auto mb-10">
                  <div className="p-1 bg-gradient-to-r from-tufts-blue/40 via-tufts-blue/30 to-amber-400/40 rounded-2xl">
                    <div className="bg-white rounded-xl p-4">
                      <div className="h-12 w-full bg-gray-100 rounded-lg animate-pulse" />
                    </div>
                  </div>
                </div>
                
                {/* Subtitle skeleton */}
                <div className="space-y-2 mb-8 max-w-2xl mx-auto">
                  <div className="h-5 w-full bg-gray-100/80 rounded animate-pulse" />
                  <div className="h-5 w-3/4 bg-gray-100/80 rounded mx-auto animate-pulse" />
                </div>
                
                {/* Trust indicators skeleton */}
                <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-tufts-blue/20 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-tufts-blue/20 rounded animate-pulse" />
                    <div className="h-4 w-28 bg-gray-100 rounded animate-pulse" />
                  </div>
                  <div className="hidden sm:block w-px h-4 bg-gray-200" />
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-tufts-blue/20 rounded animate-pulse" />
                    <div className="h-4 w-26 bg-gray-100 rounded animate-pulse" />
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
    <div className="hero-section relative min-h-[85vh] flex flex-col" >
      {/* Gradient Orbs - Using #5374CD - Large to bleed into navbar and features */}

      <div className="absolute bottom-0 right-0 w-[700px] h-[700px] rounded-full blur-[100px] translate-x-1/4 translate-y-1/4" style={{ backgroundColor: 'rgba(83, 116, 205, 0.2)' }} />
      <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] rounded-full blur-[80px]" style={{ backgroundColor: 'rgba(83, 116, 205, 0.15)' }} />
      <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-white/50 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
      
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
              
              {/* Badge - Links to App Store */}
              <a
                href="https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262"
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleDownloadApp}
                className={`inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full shadow-sm mb-6 hover:border-tufts-blue hover:shadow-md transition-all group transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'} duration-700 ease-out`}
              >
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-700 group-hover:text-tufts-blue transition-colors">
                  {t('hero.badge', 'Now available on iOS')}
                </span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-tufts-blue group-hover:translate-x-0.5 transition-all" />
              </a>
              
              {/* Headline */}
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-eerie-black mb-8 transform transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                {t('hero.stayConnected', 'Stay Connected')}{' '}
                <span className="text-tufts-blue">{t('hero.worldwide', 'Worldwide.')}</span>
              </h1>
              
              {/* Search Bar - Main CTA - Right under headline */}
              <div className={`relative z-50 max-w-2xl mx-auto mb-10 p-1 bg-gradient-to-r from-tufts-blue via-tufts-blue/80 to-white rounded-2xl shadow-xl transform transition-all duration-700 delay-200 ${isVisible ? 'opacity-80 scale-100' : 'opacity-0 scale-95'}`}>
                <div className="bg-white rounded-xl p-2">
                  <CountrySearchBar showCountryCount={true} onCountrySelect={onCountrySelect} />
                </div>
              </div>
              
              {/* Subtitle - Now under search */}
              <p className={`text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-8 transform transition-all duration-700 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
                {t('hero.subtitle', 'Get instant mobile data in 200+ countries. No physical SIM needed. Activate your eSIM in seconds.')}
              </p>
              
              {/* Trust Indicators - At bottom */}
              <div className={`flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-sm text-gray-500 transform transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {trustIndicators.map(({ icon: Icon, label, key }, index) => (
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
