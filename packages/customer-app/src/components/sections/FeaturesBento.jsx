'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import FlagImage from '@esim/shared/components/FlagImage';
import Reveal from '../ui/Reveal';
import AnimatedCounter from '../ui/AnimatedCounter';

// Flags for the Global Coverage card — picked for visual diversity & small file size
const COVERAGE_FLAGS = [
  'us', 'jp', 'de', 'br', 'sa', 'in', 'fr', 'kr',
  'au', 'il', 'th', 'gb', 'it', 'sg', 'za', 'ae',
];

// Inline SVG icons — no lucide-react imports
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

const RefreshIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

const LockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const LanguagesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 8 6 6" />
    <path d="m4 14 6-6 2-3" />
    <path d="M2 5h12" />
    <path d="M7 2h1" />
    <path d="m22 22-5-10-5 10" />
    <path d="M14 18h6" />
  </svg>
);

const HeadsetIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z" />
    <path d="M21 16v2a4 4 0 0 1-4 4h-5" />
  </svg>
);

export default function FeaturesBento() {
  const { t } = useI18n();

  const cards = [
    {
      key: 'globalCoverage',
      Icon: GlobeIcon,
      title: t('featuresBento.globalCoverage', 'Global Coverage'),
      description: t('featuresBento.globalCoverageDesc', '200+ countries, 400+ carriers. One app.'),
      large: true,
      gradient: true,
      counter: true,
      delay: 0,
    },
    {
      key: 'instantActivation',
      Icon: ZapIcon,
      title: t('featuresBento.instantActivation', 'Instant Activation'),
      description: t('featuresBento.instantActivationDesc', 'From purchase to connected in under 2 minutes'),
      delay: 100,
    },
    {
      key: 'topUp',
      Icon: RefreshIcon,
      title: t('featuresBento.topUp', 'Top-Up Anytime'),
      description: t('featuresBento.topUpDesc', 'Running low? Add more data without reinstalling your eSIM'),
      delay: 200,
    },
    {
      key: 'securePayments',
      Icon: LockIcon,
      title: t('featuresBento.securePayments', 'Secure Payments'),
      description: t('featuresBento.securePaymentsDesc', 'Stripe-powered checkout. Apple Pay, Google Pay, all major cards.'),
      delay: 300,
    },
    {
      key: 'multiLanguage',
      Icon: LanguagesIcon,
      title: t('featuresBento.multiLanguage', 'Multi-Language'),
      description: t('featuresBento.multiLanguageDesc', 'Full support in 18 languages including Arabic, Hebrew, Japanese, and more'),
      delay: 400,
    },
    {
      key: 'support',
      Icon: HeadsetIcon,
      title: t('featuresBento.support', 'Dedicated Support'),
      description: t('featuresBento.supportDesc', 'Real human support via email and in-app. No chatbots.'),
      delay: 500,
    },
  ];

  return (
    <section
      className="relative"
      aria-labelledby="features-bento-heading"
    >
      <div className="max-w-7xl mx-auto px-4 pt-16 lg:pt-24 pb-6 lg:pb-8">

        {/* Section header */}
        <div className="mb-12 text-start">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-3">
              {t('featuresBento.label', 'Everything included')}
            </p>
            <h2
              id="features-bento-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary max-w-xl"
            >
              {t('featuresBento.title', 'Why Choose Simnetiq')}
            </h2>
          </Reveal>
        </div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" role="list">
          {cards.map((card) => (
            <Reveal key={card.key} delay={card.delay} className={card.large ? 'md:col-span-2' : ''}>
              <article
                role="listitem"
                className={`
                  glass-card h-full flex flex-col gap-4 relative overflow-hidden
                  hover:border-tufts-blue/30 transition-colors duration-300
                  ${card.large ? 'lg:flex-row lg:items-start lg:gap-8' : ''}
                `}
                aria-label={card.title}
                style={card.large ? { borderColor: 'rgba(73,117,212,0.15)' } : {}}
              >
                {/* Gradient overlay for the large card */}
                {card.gradient && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    aria-hidden="true"
                    style={{
                      background: 'linear-gradient(135deg, rgba(73,117,212,0.05) 0%, transparent 60%)',
                    }}
                  />
                )}

                {/* Card content wrapper (above gradient) */}
                <div className={`relative flex flex-col gap-4 ${card.large ? 'lg:flex-1' : ''}`}>
                  {/* Icon circle */}
                  <div className="w-12 h-12 rounded-xl bg-tufts-blue/10 flex items-center justify-center flex-shrink-0">
                    <card.Icon className="w-6 h-6 text-tufts-blue" />
                  </div>

                  <div>
                    <h3 className={`font-bold text-text-primary mb-2 ${card.large ? 'text-xl' : 'text-base'}`}>
                      {card.title}
                    </h3>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>

                {/* Flag grid + counter for the large global coverage card */}
                {card.counter && (
                  <div className="relative flex flex-col items-start lg:items-end justify-center flex-shrink-0 lg:ps-8 gap-4">
                    <div className="grid grid-cols-8 gap-1.5" aria-hidden="true">
                      {COVERAGE_FLAGS.map((code, i) => (
                        <div
                          key={code}
                          className="w-7 h-7 rounded-full overflow-hidden ring-1 ring-[var(--card-border)] animate-fade-in-up"
                          style={{ animationDelay: `${i * 60}ms` }}
                        >
                          <FlagImage code={code} className="w-7 h-7 rounded-full object-cover" />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p
                        className="text-4xl lg:text-5xl font-bold text-tufts-blue leading-none tabular-nums"
                        aria-label={t('featuresBento.countriesLabel', '200+ countries')}
                      >
                        <AnimatedCounter value={200} suffix="+" duration={1200} />
                      </p>
                      <p className="text-sm text-text-muted">
                        {t('featuresBento.countriesSubLabel', 'countries & regions')}
                      </p>
                    </div>
                  </div>
                )}
              </article>
            </Reveal>
          ))}

          {/* Download app card — sits in the grid, 2/3 width on desktop */}
          <Reveal delay={600} className="md:col-span-2">
            <div className="relative overflow-hidden h-full" style={{ border: '1px solid var(--card-border)' }}>
              <img src="/images/fd.avif" alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative px-6 py-6 flex flex-col justify-center h-full gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">
                    {t('featuresBento.downloadTitle', 'Get the Simnetiq app')}
                  </h3>
                  <p className="text-sm text-white/70">
                    {t('featuresBento.downloadDesc', 'Manage your eSIMs, top up data, and stay connected — all from your phone.')}
                  </p>
                </div>
                {/* App Store rating */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-3.5 h-3.5 text-amber-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                    ))}
                  </div>
                  <span className="text-sm font-bold text-white">5.0</span>
                  <span className="text-xs text-white/50">App Store</span>
                </div>
                <div className="flex gap-3">
                  <a
                    href={appStoreLinks.ios}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold bg-white text-black hover:bg-white/90 transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/></svg>
                    App Store
                  </a>
                  <a
                    href={appStoreLinks.android}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                    style={{ border: '1px solid rgba(255,255,255,0.3)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/></svg>
                    Google Play
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>

      </div>
    </section>
  );
}
