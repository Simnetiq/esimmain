'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import toast from 'react-hot-toast';

const EsimPlansSection = dynamic(() => import('../EsimPlansSection'), {
  loading: () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-gray-100 rounded-md h-32 animate-pulse" />
      ))}
    </div>
  ),
});

export const handleCopyDiscountCode = async (t) => {
  const discountCode = 'OCTOBER35';
  try {
    await navigator.clipboard.writeText(discountCode);
    toast.success(t('discount.copied', 'Discount code OCTOBER35 copied! 35% off your purchase!'), {
      duration: 4000,
      icon: '🎉',
    });
  } catch {
    toast.error(t('discount.copyFailed', 'Failed to copy code. Please try again.'));
  }
};

export default function PlansSection({ selectedCountry }) {
  const { t, locale, isLoading } = useI18n();
  const pathname = usePathname();
  
  // Get current language for RTL detection
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';
  
  if (isLoading) {
    return (
      <div className="bg-white flex flex-col overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="relative flex-1 flex flex-col">
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
              <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
                <div className="h-10 w-96 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="w-full h-px bg-gray-100" />
          </div>
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 sm:w-16 aspect-[4/3] bg-gray-200 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-5 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Grid pattern style
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };

  return (
    <div className="bg-white flex flex-col overflow-hidden">
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

        {/* Header Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-semibold rtl:tracking-tight">
                {t('plans.title')}
              </p>
              <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
                {t('plans.subtitle')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* Plans Component */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <Suspense fallback={
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-14 aspect-[4/3] bg-gray-200 rounded-lg" />
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                          <div className="h-3 bg-gray-200 rounded w-1/2" />
                        </div>
                      </div>
                      <div className="h-5 bg-gray-200 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              }>
                <EsimPlansSection selectedCountryFromHero={selectedCountry} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
