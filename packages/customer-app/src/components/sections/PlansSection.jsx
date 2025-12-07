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
      <section className="py-12 lg:py-16 bg-white lg:mt-20 mt-10 relative overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="container mx-auto px-4 relative z-10">
          <div className="animate-pulse space-y-8">
            <div className="text-center">
              <div className="h-8 bg-gray-200 rounded w-1/3 mx-auto mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </section>
    );
  }
  
  return (
    <div className="bg-white lg:min-h-screen flex flex-col">
      <div className="relative isolate flex-1 flex flex-col">
        {/* Horizontal Line - Top */}
        <div className="hidden sm:block absolute top-0 left-0 right-0 h-px bg-gray-200"></div>
        
        {/* Horizontal Line - Bottom */}
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>

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
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-bold rtl:tracking-tight">
                  {t('plans.title')}
              </p>
              <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">{t('plans.subtitle')}</h2>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Plans Component */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl ">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <Suspense fallback={
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full bg-gray-100/10 h-14 w-14 border border-gray-200/70 mx-auto"></div>                                                                                         
                  <p className={`mt-4 text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`} style={{
                    fontSize: '16px',
                    fontWeight: '400',
                    lineHeight: '160%',
                    letterSpacing: '0px'
                  }}>{t('plans.loadingPlans')}</p>
                </div>
              }>
                <EsimPlansSection selectedCountryFromHero={selectedCountry} />
              </Suspense>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Blob */}
        <div aria-hidden="true" className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]">                                                           
          <div 
            style={{ 
              clipPath: 'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',                                                                                         
              background: 'linear-gradient(to top right, #1A5798, #93BFEE)'
            }} 
            className="relative right-[calc(50%-36rem)] aspect-[1155/678] w-[12.125rem] translate-x-1/2 opacity-30 sm:right-[calc(50%+36rem)] sm:w-[72.1875rem]"                                                        
          ></div>
        </div>
      </div>
    </div>
  );
}
