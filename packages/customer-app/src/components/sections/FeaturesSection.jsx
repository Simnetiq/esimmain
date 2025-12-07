'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image'; 
import { ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

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
export default function FeaturesSection() {
  const { t, locale } = useI18n();  

  if (locale === 'he' || locale === 'ar') {
    return null;
  }
  return (
    <div className="features-section bg-white lg:min-h-screen flex flex-col">
      <div className="relative isolate flex-1 flex flex-col">        
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
              <p className="text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-semibold rtl:tracking-tight">
                {t('features.title')}
              </p>
              <h2 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">{t('features.subtitle')}</h2>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100"></div>
        </div>

        {/* Features Grid Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid gap-4 lg:grid-cols-2 lg:grid-rows-2">
          {/* Global Coverage - Large left card with Static Image */}
          <div className="relative lg:row-span-2 ">
            <div className="absolute inset-0 overflow-hidden flex items-center justify-center ">
              <Image
                src="/images/logo_icon/features.avif"
                alt="Global Coverage Network"
                className="w-full h-full object-cover"
                width={800}
                height={800}
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                unoptimized
              />
            </div>
            <div className="relative flex h-full min-h-[20rem] sm:min-h-[26rem] lg:min-h-[30rem] flex-col justify-between p-6">
              <div>
                {/* Optional: Add title/description overlay if needed */}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Instant Activation - Top right */}
          <div className="relative max-lg:row-start-1">
            <div className="absolute inset-px bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden">
              <div className="px-4 py-4 ">
                <p className="mt-2 text-base sm:text-lg lg:text-xl font-medium tracking-tight text-gray-950 text-start flex items-center gap-2">
                  <ArrowRight className="w-6 h-6 text-jordy-blue transform -rotate-45" />{t('features.instantActivation.title')}
                </p>
                <p className="mt-2 max-w-lg text-sm/6 lg:text-base font-light text-cool-black text-start">
                {t('features.instantActivation.description')} 
                </p>
              </div>
              
            </div>
            <div className="pointer-events-none absolute inset-px shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Secure Payment - Bottom middle */}
          <div className="relative max-lg:row-start-3 lg:col-start-2 lg:row-start-2">
            <div className="absolute inset-px bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden">
                  <div className="px-4 py-4">
                <p className="mt-2 text-base sm:text-lg font-medium tracking-tight text-cool-black text-start flex items-center gap-2">
                  <ArrowRight className="w-6 h-6 text-jordy-blue transform -rotate-45" />
                  {t('features.securePayment.title')}
                </p>
                <p className="mt-2 max-w-lg text-sm/6 lg:text-base font-light text-cool-black text-start">
                  {t('features.securePayment.description')}
                </p>
              </div>
                <div className="flex flex-1 items-center justify-center">
                {/* Payment Icons - Mobile Responsive */}
                <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap justify-center gap-2">
                  <Image 
                    src="/images/frontend/home/visa.png" 
                    alt="Visa" 
                    width={48}
                    height={48}
                    className="h-8 sm:h-10 lg:h-12 w-auto"
                    loading="lazy"
                    quality={75}
                  />
                  <Image 
                    src="/images/frontend/home/card.png" 
                    alt="Mastercard" 
                    width={48}
                    height={48}
                    className="h-8 sm:h-10 lg:h-12 w-auto"
                    loading="lazy"
                    quality={75}
                  />
                  <Image 
                    src="/images/frontend/home/paypal.png" 
                    alt="PayPal" 
                    width={48}
                    height={48}
                    className="h-8 sm:h-10 lg:h-12 w-auto"
                    loading="lazy"
                    quality={75}
                  />
                  <Image 
                    src="/images/frontend/home/apple-pay.png" 
                    alt="Apple Pay" 
                    width={48}
                    height={48}
                    className="h-8 sm:h-10 lg:h-12 w-auto"
                    loading="lazy"
                    quality={75}
                  />
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px shadow-sm ring-1 ring-black/5"></div>
          </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
