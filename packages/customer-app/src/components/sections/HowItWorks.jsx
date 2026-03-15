'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

// Inline SVG icons — no lucide-react imports
const MapPinIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
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

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <path d="M12 20h.01" />
  </svg>
);

export default function HowItWorks() {
  const { t } = useI18n();

  const steps = [
    {
      number: '01',
      Icon: MapPinIcon,
      title: t('howItWorks.step1Title', 'Choose your destination'),
      description: t('howItWorks.step1Desc', 'Browse plans for 200+ countries. Filter by region, duration, or data size to find the perfect fit.'),
      delay: 0,
    },
    {
      number: '02',
      Icon: QrCodeIcon,
      title: t('howItWorks.step2Title', 'Scan & install'),
      description: t('howItWorks.step2Desc', 'You get a QR code by email instantly. Scan it in your phone settings and the eSIM installs in seconds.'),
      delay: 150,
    },
    {
      number: '03',
      Icon: WifiIcon,
      title: t('howItWorks.step3Title', 'Connect and go'),
      description: t('howItWorks.step3Desc', 'Enable your eSIM at the airport or when you land. Full-speed data starts immediately — no setup needed.'),
      delay: 300,
    },
  ];

  return (
    <section
      className="relative"
      aria-labelledby="how-it-works-heading"
      id="how-it-works"
    >
      <div className="max-w-7xl mx-auto px-4 py-16 lg:py-24">

        {/* Section header */}
        <div className="mb-14 text-start">
          <Reveal>
            <p className="text-xs font-semibold tracking-widest uppercase text-text-muted mb-3">
              {t('howItWorks.label', 'Three simple steps')}
            </p>
            <h2
              id="how-it-works-heading"
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary"
            >
              {t('howItWorks.title', 'Up and running in minutes')}
            </h2>
            <p className="text-text-muted mt-3 max-w-lg text-base">
              {t('howItWorks.subtitle', 'No queues, no contracts, no physical cards. Just fast, reliable data wherever you go.')}
            </p>
          </Reveal>
        </div>

        {/* Steps grid — clean equal-width columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <Reveal key={step.number} delay={step.delay}>
              <article className="glass-card relative overflow-hidden h-full" aria-label={`Step ${step.number}: ${step.title}`}>
                {/* Faded step number */}
                <span className="absolute top-4 end-4 text-7xl font-bold leading-none select-none pointer-events-none text-white/[0.04]" aria-hidden="true">
                  {step.number}
                </span>

                {/* Icon circle */}
                <div className="w-12 h-12 rounded-xl bg-tufts-blue/10 flex items-center justify-center mb-5">
                  <step.Icon className="w-6 h-6 text-tufts-blue" />
                </div>

                {/* Step label */}
                <p className="text-xs font-bold tracking-widest uppercase text-tufts-blue mb-2">
                  {t('howItWorks.stepLabel', 'Step')} {step.number}
                </p>

                <h3 className="text-lg font-bold text-text-primary mb-2">{step.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
              </article>
            </Reveal>
          ))}
        </div>

      </div>
    </section>
  );
}
