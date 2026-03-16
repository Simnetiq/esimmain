'use client';

import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

const CheckIcon = () => (
  <svg className="w-3 h-3 text-tufts-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

/** Doppler logo — wave SVG, theme-aware black/white */
const DopplerLogo = ({ className = 'w-12 h-12' }) => (
  <svg className={className} viewBox="0 0 1024 593" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g clipPath="url(#doppler-clip)">
      <path d="M1024.96 564.158C1001.2 564.158 981.198 210.5 944.313 210.5C907.428 210.5 891.799 564.158 868.667 564.158C845.536 564.158 826.156 210.5 789.271 210.5C752.386 210.5 750.511 564.158 715.501 564.158C680.492 564.158 681.117 210.5 634.229 210.5C587.342 210.5 595.469 564.158 556.083 564.158C516.698 564.158 455.431 210.5 359.78 210.5C264.129 210.5 262.879 564.158 169.104 564.158C75.3289 564.158 72.8282 210.5 -25.3232 210.5" className="stroke-[#1F1F1F] dark:stroke-white" strokeWidth="57"/>
    </g>
    <defs>
      <clipPath id="doppler-clip">
        <rect width="1024" height="593" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const DOPPLER_IOS = 'https://apps.apple.com/at/app/doppler-vpn-fast-secure/id6757091773';
const DOPPLER_ANDROID = 'https://play.google.com/store/apps/details?id=org.dopplervpn.android';

export default function DopplerCrossSell() {
  const { t } = useI18n();

  const features = [
    t('dopplerCrossSell.feature1', 'No-registration VPN — no email, no phone'),
    t('dopplerCrossSell.feature2', 'VLESS-Reality anti-censorship encryption'),
    t('dopplerCrossSell.feature3', 'Built-in ad blocker & private DNS'),
    t('dopplerCrossSell.feature4', 'Strict no-logs policy by design'),
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
      <Reveal>
        <div className="overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
          <div className="flex flex-col md:flex-row rtl-native-flex">

            {/* Image — left half on desktop, full width on mobile */}
            <div className="relative h-56 sm:h-64 md:h-auto md:w-1/2 overflow-hidden">
              <Image
                src="/images/dopplerdownload.avif"
                alt="Doppler VPN app"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
                loading="lazy"
              />
              {/* Platform pill overlay */}
              <div className="absolute bottom-4 start-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rtl-native-flex" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                {t('dopplerCrossSell.platforms', 'iOS, Android & all platforms')}
              </div>
            </div>

            {/* Content — right half */}
            <div className="relative flex-1 p-6 lg:p-10 flex flex-col justify-center">
              {/* Watermark — gray-300 light, gray-700 dark */}
              <span className="absolute top-4 end-4 lg:end-8 text-[5rem] md:text-[7rem] lg:text-[9rem] font-semibold leading-none select-none pointer-events-none text-gray-300 dark:text-gray-700" aria-hidden="true">
                VPN
              </span>

              <div className="relative">
                {/* App SVG icon + name */}
                <div className="flex items-center gap-3 mb-4 rtl-native-flex">
                  <div className="flex-shrink-0 w-12 h-12 rounded-[12px] shadow flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                    <DopplerLogo className="w-10 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-2xl font-semibold text-text-primary tracking-tight text-start">
                      Doppler VPN
                    </h3>
                    <p className="text-xs text-text-muted text-start">
                      {t('dopplerCrossSell.badge', 'By Simnetiq')}
                    </p>
                  </div>
                </div>

                {/* Feature list */}
                <ul className="space-y-2.5 mb-5">
                  {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2.5 rtl-native-flex">
                      <span className="flex-shrink-0 w-5 h-5 inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(73, 117, 212, 0.1)' }}>
                        <CheckIcon />
                      </span>
                      <span className="text-sm text-text-primary">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Promo badge */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rtl-native-flex" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                  <svg className="w-3 h-3 text-accent-success flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                  <span className="text-xs font-semibold text-accent-success">
                    {t('dopplerCrossSell.promo', 'Launch offer: use code LAUNCH20 for 20% off')}
                  </span>
                </div>

                {/* Divider */}
                <div className="w-full h-px mb-5" style={{ backgroundColor: 'var(--divider)' }} />

                {/* CTA Buttons */}
                <div className="flex flex-col sm:flex-row gap-2.5 rtl-native-flex-sm">
                  <a
                    href={DOPPLER_IOS}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full ps-5 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex"
                    style={{ backgroundColor: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}
                  >
                    <span className="flex-1 text-center">{t('dopplerCrossSell.appStore', 'App Store')}</span>
                    <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8" style={{ backgroundColor: 'var(--cta-primary-circle-bg)' }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                      </svg>
                    </span>
                  </a>
                  <a
                    href={DOPPLER_ANDROID}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center rounded-full ps-5 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex"
                    style={{ backgroundColor: 'var(--cta-secondary-bg)', color: 'var(--cta-secondary-text)', border: '1px solid var(--cta-secondary-border)' }}
                  >
                    <span className="flex-1 text-center">{t('dopplerCrossSell.googlePlay', 'Google Play')}</span>
                    <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8" style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/>
                      </svg>
                    </span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
