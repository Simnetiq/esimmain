'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

// Inline SVG icons — no lucide-react imports
const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

const QrCodeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect width="5" height="5" x="3" y="3" rx="1" />
    <rect width="5" height="5" x="16" y="3" rx="1" />
    <rect width="5" height="5" x="3" y="16" rx="1" />
    <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
    <path d="M21 21v.01" />
    <path d="M12 7v3a2 2 0 0 1-2 2H7" />
    <path d="M3 12h.01" />
    <path d="M12 3h.01" />
    <path d="M12 16v.01" />
    <path d="M16 12h1" />
    <path d="M21 12v.01" />
    <path d="M12 21v-1" />
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
    <path d="M2 12h20" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export default function TrustIndicators() {
  const { t } = useI18n();

  const cards = [
    {
      Icon: ShieldIcon,
      title: t('trust.noRoamingFees', 'No Roaming Fees'),
      description: t('trust.noRoamingFeesDesc', 'Say goodbye to bill shock. Pay a flat rate and use data freely at your destination.'),
      delay: 0,
    },
    {
      Icon: QrCodeIcon,
      title: t('trust.qrActivation', 'QR Activation'),
      description: t('trust.qrActivationDesc', 'Scan a QR code and your eSIM is live in under 2 minutes — no store visit required.'),
      delay: 100,
    },
    {
      Icon: GlobeIcon,
      title: t('trust.languages', 'Multi-Language'),
      description: t('trust.languagesDesc', 'Our platform supports 10+ languages so you can browse and buy in your native tongue.'),
      delay: 200,
    },
    {
      Icon: CheckCircleIcon,
      title: t('trust.moneyBack', '7-Day Money Back'),
      description: t('trust.moneyBackDesc', "Not happy? Get a full refund within 7 days if you haven't used your data."),
      delay: 300,
    },
  ];

  return (
    <section
      className="bg-bg-primary"
      aria-labelledby="trust-indicators-heading"
    >
      <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">

        {/* Section header */}
        <div className="mb-12 text-start">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-3">
              {t('trust.label', 'Why Simnetiq')}
            </p>
            <h2
              id="trust-indicators-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary max-w-lg"
            >
              {t('trust.title', 'Built for travellers who need it to just work')}
            </h2>
          </Reveal>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" role="list">
          {cards.map(({ Icon, title, description, delay }) => (
            <Reveal key={title} delay={delay}>
              <article
                role="listitem"
                className="glass-card h-full flex flex-col gap-4"
                aria-label={title}
              >
                {/* Icon circle */}
                <div className="w-11 h-11 rounded-xl bg-tufts-blue/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-tufts-blue" />
                </div>

                <div>
                  <h3 className="text-base font-bold text-text-primary mb-1.5">
                    {title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {description}
                  </p>
                </div>
              </article>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
