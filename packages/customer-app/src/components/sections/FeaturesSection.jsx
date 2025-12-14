'use client';

import { useEffect, useState, useRef } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image'; 
import { Zap, Shield, Globe, Smartphone } from 'lucide-react';
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
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Grid pattern style
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };

  if (locale === 'he' || locale === 'ar') {
    return null;
  }

  // Features data - 4 cards with visual images
  const features = [
    {
      icon: Zap,
      tag: t('features.instantActivation.tag', 'INSTANT ACTIVATION'),
      title: t('features.instantActivation.title', 'Ready in seconds'),
      description: t('features.instantActivation.description', 'Get connected instantly with our digital eSIM. No waiting for delivery, no physical SIM cards needed.'),
      image: '/images/instant.avif',
      delay: 'delay-100',
    },
    {
      icon: Globe,
      tag: t('features.globalCoverage.tag', 'GLOBAL COVERAGE'),
      title: t('features.globalCoverage.title', '200+ countries'),
      description: t('features.globalCoverage.description', 'Stay connected anywhere in the world with our extensive network of partner carriers.'),
      image: '/images/global.avif',
      delay: 'delay-200',
    },
    {
      icon: Shield,
      tag: t('features.securePayment.tag', 'SECURE PAYMENT'),
      title: t('features.securePayment.title', 'Protected transactions'),
      description: t('features.securePayment.description', 'Your payment data is secured with industry-leading encryption and trusted payment providers.'),
      image: '/images/secure.avif',
      delay: 'delay-300',
    },
    {
      icon: Smartphone,
      tag: t('features.easySetup.tag', 'EASY SETUP'),
      title: t('features.easySetup.title', 'Simple QR activation'),
      description: t('features.easySetup.description', 'Scan a QR code, follow the steps, and you\'re connected. It takes less than 2 minutes.'),
      image: '/images/easy.avif',
      delay: 'delay-400',
    },
  ];

  return (
    <div ref={sectionRef} className="features-section bg-white flex flex-col overflow-hidden">
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
              <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 mb-4 transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {t('features.title', 'Why Choose Us')}
              </p>
              <h2 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl transform transition-all duration-700 delay-100 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
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
                  const Icon = feature.icon;
                  return (
                    <div
                      key={index}
                      className={`group relative bg-gray-50  overflow-hidden hover:bg-white transition-all duration-500 transform ${isVisible ? `opacity-100 translate-y-0 ${feature.delay}` : 'opacity-0 translate-y-8'}`}
                    >
                      {/* Visual/Image Area */}
                      <div className="relative h-44 sm:h-52 lg:h-60 overflow-hidden">
                        <Image
                          src={feature.image}
                          alt={feature.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-700"
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                       
                        
                        {/* Floating icon */}
                        <div className="absolute top-4 right-4 w-11 h-11 rounded-lg bg-white/75 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Icon className="w-5 h-5 text-eerie-black" />
                        </div>
                      </div>
                      
                      {/* Content Area */}
                      <div className="p-5 lg:p-6">
                        {/* Description first */}
                        <p className="text-gray-500 text-sm leading-relaxed mb-3 ">
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
