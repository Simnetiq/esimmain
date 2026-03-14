'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';
import AnimatedCounter from '../ui/AnimatedCounter';

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
      description: t('featuresBento.globalCoverageDesc', 'Access reliable data in over 200 countries and regions through our partner network of top-tier carriers.'),
      large: true,
      gradient: true,
      counter: true,
      delay: 0,
    },
    {
      key: 'instantActivation',
      Icon: ZapIcon,
      title: t('featuresBento.instantActivation', 'Instant Activation'),
      description: t('featuresBento.instantActivationDesc', 'Your eSIM is ready in under 2 minutes. Purchase, scan, connect — no waiting.'),
      delay: 100,
    },
    {
      key: 'topUp',
      Icon: RefreshIcon,
      title: t('featuresBento.topUp', 'Top-Up Anytime'),
      description: t('featuresBento.topUpDesc', 'Running low on data? Add more directly from the app without reinstalling your eSIM.'),
      delay: 200,
    },
    {
      key: 'securePayments',
      Icon: LockIcon,
      title: t('featuresBento.securePayments', 'Secure Payments'),
      description: t('featuresBento.securePaymentsDesc', 'All transactions are encrypted and processed via Stripe — PCI-DSS compliant.'),
      delay: 300,
    },
    {
      key: 'multiLanguage',
      Icon: LanguagesIcon,
      title: t('featuresBento.multiLanguage', 'Multi-Language'),
      description: t('featuresBento.multiLanguageDesc', 'Shop in your language. We support English, Arabic, Hebrew, Russian, German, and more.'),
      delay: 400,
    },
    {
      key: 'support',
      Icon: HeadsetIcon,
      title: t('featuresBento.support', 'Dedicated Support'),
      description: t('featuresBento.supportDesc', 'Real humans available via email and chat to help you get connected wherever you are.'),
      delay: 500,
    },
  ];

  return (
    <section
      className="bg-bg-primary"
      aria-labelledby="features-bento-heading"
    >
      <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">

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
              {t('featuresBento.title', 'All the features you need in one place')}
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

                {/* AnimatedCounter for the large global coverage card */}
                {card.counter && (
                  <div className="relative flex flex-col items-start lg:items-end justify-center flex-shrink-0 lg:ps-8">
                    <p
                      className="text-5xl lg:text-7xl font-bold text-tufts-blue leading-none tabular-nums"
                      aria-label={t('featuresBento.countriesLabel', '200+ countries')}
                    >
                      <AnimatedCounter value={200} suffix="+" duration={1200} />
                    </p>
                    <p className="text-sm text-text-muted mt-1">
                      {t('featuresBento.countriesSubLabel', 'countries & regions')}
                    </p>
                  </div>
                )}
              </article>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
