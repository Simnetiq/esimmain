'use client';

import React from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';
import CountrySearchBar from '../CountrySearchBar';
import { Download } from 'lucide-react';


export default function HeroSection({ onCountrySelect }) {
  const { t, translations } = useI18n();
  
  const handleDownloadApp = () => {
    // Track with Facebook Pixel - Download App CTA
    trackCustomFacebookEvent('DownloadAppCTA', {
      source: 'hero_section',
      content_type: 'download_button',
      button_location: 'hero_cta',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
    
    // Placeholder - no app store link
    // Button disabled or shows coming soon message
  };

  // Check if translations are loaded
  // For SSR and initial client render, translations will be empty
  const hasTranslations = translations && Object.keys(translations).length > 0 && translations.hero;
  
  // Show skeleton while translations are loading
  // Skeleton matches exact dimensions of final content to prevent CLS
  if (!hasTranslations) {
    return (
      <div className="bg-white lg:min-h-screen flex flex-col">
        <div className="relative isolate flex-1 flex flex-col">
          {/* Horizontal Line - Top */}
          <div className="hidden lg:block absolute top-20 left-0 right-0 h-px bg-gray-200/70"></div>
          
          {/* Horizontal Line - Bottom */}
          <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200/70"></div>

          {/* Grid Pattern - Left Side */}
          <div 
            className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
            style={{
              backgroundSize: '10px 10px',
              backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
            }}
          ></div>

          {/* Grid Pattern - Right Side */}
          <div 
            className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
            style={{
              backgroundSize: '10px 10px',
              backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
            }}
          ></div>
          
          {/* Hero Section Skeleton - Fixed dimensions to match content */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-6">
              <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                {/* Description skeleton - matches hidden sm:block mt-10 */}
                <div className="hidden sm:block mt-10 h-5 bg-gray-100 rounded w-3/4 max-w-3xl"></div>
                {/* Title skeleton - matches mt-4 text sizes */}
                <div className="mt-4 h-10 sm:h-10 lg:h-12 xl:h-14 bg-gray-100 rounded w-full max-w-4xl"></div>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100"></div>
          </div>

          {/* Download Section Skeleton - Fixed height */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-6 items-start mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="flex flex-col sm:flex-row items-end gap-4">
                  <div className="h-12 bg-gray-100 rounded w-full sm:w-48"></div>
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100"></div>
          </div>

          {/* Search Section Skeleton - Fixed height */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                  <div className="flex-1 w-full h-12 bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Gradient Blob - Fixed position */}
          <div 
            aria-hidden="true" 
            className="absolute inset-x-0 -z-10 opacity-30 transform-gpu overflow-hidden blur-2xl pointer-events-none"
            style={{ 
              top: 'calc(100% - 3rem)',
              contain: 'layout paint',
            }}
          >
            <div 
              style={{ 
                clipPath: 'polygon(72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
                background: 'linear-gradient(to top right, #4975D4, #D4BD49 )',
                willChange: 'transform',
              }} 
              className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 opacity-45 sm:left-[calc(50%+16rem)] sm:w-[72.1875rem]"
            ></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white lg:min-h-screen flex flex-col">
      <div className="relative isolate flex-1 flex flex-col">
        {/* Horizontal Line - Top */}
        <div className="hidden lg:block absolute top-20 left-0 right-0 h-px bg-gray-200/70 "></div>
        
        {/* Horizontal Line - Bottom */}
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200/70 "></div>

        {/* Grid Pattern - Left Side */}
        <div 
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>

        {/* Grid Pattern - Right Side */}
        <div 
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
          style={{
            backgroundSize: '10px 10px',
            backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
          }}
        ></div>
        {/* Hero Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-6">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="hidden sm:block mt-10 text-sm max-w-3xl sm:text-base font-light tracking-widest uppercase text-cool-black rtl:font-light rtl:tracking-tight">
                {t('hero.description')}
              </p>
              <h1 className="mt-4 text-3xl sm:text-3xl lg:text-4xl xl:text-5xl tracking-tight font-semibold text-pretty text-eerie-black max-w-4xl">
                {t('hero.stayConnected')}
                <span className="text-tufts-blue ml-2 sm:ml-3 font-light tracking-widest">{t('hero.Online')}</span>
              </h1>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Download Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-6 items-start mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="flex flex-col sm:flex-row items-end gap-4">
                <button
                  onClick={handleDownloadApp}
                  className="btn-primary flex items-center justify-center gap-3 w-full sm:w-auto"
                >
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                  {t('hero.downloadApp')}
                </button>
              </div>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Search Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
                {/* Search Bar */}
                <div className="flex-1 w-full">
                  <CountrySearchBar showCountryCount={true} onCountrySelect={onCountrySelect} />
                </div>

                
              </div>
            </div>
          </div>
        </div>
        

        {/* Bottom Gradient Blob - Fixed position to prevent CLS */}
        <div 
          aria-hidden="true" 
          className="absolute inset-x-0 -z-10 opacity-30 transform-gpu overflow-hidden blur-2xl pointer-events-none"
          style={{ 
            top: 'calc(100% - 3rem)',
            contain: 'layout paint',
          }}
        >
          <div 
            style={{ 
              clipPath: 'polygon(72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
              background: 'linear-gradient(to top right, #4975D4, #D4BD49 )',
              willChange: 'transform',
            }} 
            className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 opacity-45 sm:left-[calc(50%+16rem)] sm:w-[72.1875rem]"
          ></div>
        </div>
      </div>
    </div>
  );
}