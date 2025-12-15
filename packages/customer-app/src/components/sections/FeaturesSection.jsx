'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image'; 

// Inline SVG icons to avoid lucide-react bundle overhead for these 4 icons
const ZapIcon = () => (
  <svg className="w-5 h-5 text-eerie-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-5 h-5 text-eerie-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5 text-eerie-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

const SmartphoneIcon = () => (
  <svg className="w-5 h-5 text-eerie-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);

// Lazy load toast for clipboard functionality
const copyToClipboard = async (text, successMsg, errorMsg) => {
  try {
    await navigator.clipboard.writeText(text);
    const { toast } = await import('react-hot-toast');
    toast.success(successMsg, { duration: 4000, icon: '🎉' });
  } catch {
    const { toast } = await import('react-hot-toast');
    toast.error(errorMsg);
  }
};

export const handleCopyDiscountCode = async (t) => {
  await copyToClipboard(
    'OCTOBER35',
    t('discount.copied', 'Discount code OCTOBER35 copied! 35% off your purchase!'),
    t('discount.copyFailed', 'Failed to copy code. Please try again.')
  );
};

export default function FeaturesSection() {
  const { t, locale } = useI18n();

  // Grid pattern style
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };

  if (locale === 'he' || locale === 'ar') {
    return null;
  }

  // Features data - 4 cards with visual images
  // Using inline icon components instead of lucide-react for smaller bundle
  const features = [
    {
      IconComponent: ZapIcon,
      tag: t('features.instantActivation.tag', 'INSTANT ACTIVATION'),
      title: t('features.instantActivation.title', 'Ready in seconds'),
      description: t('features.instantActivation.description', 'Get connected instantly with our digital eSIM. No waiting for delivery, no physical SIM cards needed.'),
      image: '/images/instant.avif',
      // First two images are LCP candidates - load with priority
      priority: true,
    },
    {
      IconComponent: GlobeIcon,
      tag: t('features.globalCoverage.tag', 'GLOBAL COVERAGE'),
      title: t('features.globalCoverage.title', '200+ countries'),
      description: t('features.globalCoverage.description', 'Stay connected anywhere in the world with our extensive network of partner carriers.'),
      image: '/images/global.avif',
      priority: true,
    },
    {
      IconComponent: ShieldIcon,
      tag: t('features.securePayment.tag', 'SECURE PAYMENT'),
      title: t('features.securePayment.title', 'Protected transactions'),
      description: t('features.securePayment.description', 'Your payment data is secured with industry-leading encryption and trusted payment providers.'),
      image: '/images/secure.avif',
      priority: false,
    },
    {
      IconComponent: SmartphoneIcon,
      tag: t('features.easySetup.tag', 'EASY SETUP'),
      title: t('features.easySetup.title', 'Simple QR activation'),
      description: t('features.easySetup.description', 'Scan a QR code, follow the steps, and you\'re connected. It takes less than 2 minutes.'),
      image: '/images/easy.avif',
      priority: false,
    },
  ];

  return (
    <div className="features-section bg-white flex flex-col overflow-hidden">
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
              {/* CSS-only fade-in animation using animation-timeline when supported, fallback to visible */}
              <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 mb-4 animate-fade-in-up">
                {t('features.title', 'Why Choose Us')}
              </p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl animate-fade-in-up animation-delay-100">
                {t('features.subtitle', 'Everything you need to stay connected abroad')}
              </h2>
            </div>
          </div>
          {/* Full width gray line */}
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* Features Grid Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => {
                  const IconComponent = feature.IconComponent;
                  return (
                    <div
                      key={index}
                      className="group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Visual/Image Area */}
                      <div className="relative h-44 sm:h-52 lg:h-60 overflow-hidden">
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, 50vw"
                          priority={feature.priority}
                          loading={feature.priority ? 'eager' : 'lazy'}
                        />
                        
                        {/* Floating icon */}
                        <div className="absolute top-4 right-4 w-11 h-11 rounded-lg bg-white/75 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <IconComponent />
                        </div>
                      </div>
                      
                      {/* Content Area */}
                      <div className="p-5 lg:p-6">
                        {/* Description first */}
                        <p className="text-gray-500 text-sm leading-relaxed mb-3">
                          {feature.description}
                        </p>
                        
                        {/* Title */}
                        <h3 className="text-lg lg:text-xl font-semibold text-eerie-black mb-3">
                          {feature.title}
                        </h3>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
