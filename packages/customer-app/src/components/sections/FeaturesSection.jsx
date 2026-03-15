'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image';

// Inline SVG icons to avoid lucide-react bundle overhead
const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

const SmartphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);

export default function FeaturesSection() {
  const { t } = useI18n();

  const features = [
    {
      Icon: ZapIcon,
      number: '01',
      tag: t('features.instantActivation.tag', 'INSTANT ACTIVATION'),
      title: t('features.instantActivation.title', 'Ready in seconds'),
      description: t('features.instantActivation.description', 'Get connected instantly with our digital eSIM. No waiting for delivery, no physical SIM cards needed.'),
      image: '/images/instant.avif',
      priority: true,
    },
    {
      Icon: GlobeIcon,
      number: '02',
      tag: t('features.globalCoverage.tag', 'GLOBAL COVERAGE'),
      title: t('features.globalCoverage.title', '200+ countries'),
      description: t('features.globalCoverage.description', 'Stay connected anywhere in the world with our extensive network of partner carriers.'),
      image: '/images/global.avif',
      priority: true,
    },
    {
      Icon: ShieldIcon,
      number: '03',
      tag: t('features.securePayment.tag', 'SECURE PAYMENT'),
      title: t('features.securePayment.title', 'Protected transactions'),
      description: t('features.securePayment.description', 'Your payment data is secured with industry-leading encryption and trusted payment providers.'),
      image: '/images/secure.avif',
      priority: false,
    },
    {
      Icon: SmartphoneIcon,
      number: '04',
      tag: t('features.topUp.tag', 'TOP UP ANYTIME'),
      title: t('features.topUp.title', 'Need more data?'),
      description: t('features.topUp.description', 'Running low? Top up your eSIM instantly from the app — no need to buy a new plan or reinstall.'),
      image: '/images/easy.avif',
      priority: false,
    },
  ];

  const heroFeature = features[0];
  const gridFeatures = features.slice(1);

  return (
    <div className="features-section flex flex-col overflow-hidden relative">
      <div className="relative flex-1 flex flex-col">
        {/* Header Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 animate-fade-in-up text-start">
                {t('features.title', 'Why Choose Us')}
              </p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-text-primary max-w-5xl animate-fade-in-up animation-delay-100 text-start">
                {t('features.subtitle', 'Everything you need to stay connected abroad')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px" style={{ backgroundColor: 'var(--divider)' }} />
        </div>

        {/* Features Grid */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">

              {/* Hero Feature Card — full width, horizontal on desktop */}
              <div className="relative overflow-hidden animate-fade-in-up mb-4" style={{ backgroundColor: 'var(--card-bg)' }}>
                <div className="flex flex-col md:flex-row rtl-native-flex">
                  {/* Image — left half on desktop, full width on mobile */}
                  <div className="relative h-56 sm:h-64 md:h-auto md:w-1/2 overflow-hidden">
                    <Image
                      src={heroFeature.image}
                      alt={heroFeature.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority
                      loading="eager"
                      fetchPriority="high"
                    />
                  </div>

                  {/* Content — right half */}
                  <div className="relative flex-1 p-6 lg:p-10 flex flex-col justify-center">
                    {/* Large step number */}
                    <span className="absolute top-4 end-4 lg:end-8 text-[5rem] md:text-[7rem] lg:text-[9rem] font-semibold leading-none text-text-primary/[0.04] select-none pointer-events-none" aria-hidden="true">
                      {heroFeature.number}
                    </span>

                    <div className="relative">
                      {/* Icon pill */}
                      <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 hidden md:flex items-center justify-center mb-5">
                        <heroFeature.Icon className="w-5 h-5 text-tufts-blue" />
                      </div>

                      <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 text-start">
                        {heroFeature.tag}
                      </p>
                      <h3 className="text-xl lg:text-2xl font-semibold text-text-primary mb-3 tracking-tight text-start">
                        {heroFeature.title}
                      </h3>
                      <p className="text-text-muted text-sm sm:text-base leading-relaxed max-w-md text-start">
                        {heroFeature.description}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom 3 Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {gridFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="relative overflow-hidden animate-fade-in-up content-visibility-auto"
                    style={{ backgroundColor: 'var(--card-bg)' }}
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    {/* Image Area */}
                    <div className="relative h-40 sm:h-48 overflow-hidden">
                      <Image
                        src={feature.image}
                        alt={feature.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                        priority={feature.priority}
                        loading={feature.priority ? 'eager' : 'lazy'}
                        fetchPriority={feature.priority ? 'high' : 'low'}
                      />
                    </div>

                    {/* Content */}
                    <div className="relative p-5 lg:p-6">
                      {/* Large step number */}
                      <span className="absolute -top-10 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-text-primary/[0.04] select-none pointer-events-none" aria-hidden="true">
                        {feature.number}
                      </span>

                      <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 text-start">
                        {feature.tag}
                      </p>
                      <h3 className="text-lg lg:text-xl font-semibold text-text-primary mb-2 text-start">
                        {feature.title}
                      </h3>
                      <p className="text-text-muted text-sm leading-relaxed text-start">
                        {feature.description}
                      </p>
                    </div>
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
