'use client';

import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import Reveal from '../ui/Reveal';

const CheckIcon = () => (
  <svg className="w-3 h-3 text-tufts-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const StarIcon = () => (
  <svg className="w-3.5 h-3.5 text-accent-highlight" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

/** Simnetiq logo — same SVG as navbar, theme-aware black/white */
const SimnetiqLogo = ({ className = 'w-12 h-12' }) => (
  <svg className={className} viewBox="0 0 665 831" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g>
      <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="fill-[#1F1F1F] dark:fill-white" />
      <path d="M137.5 133.5V689C289.804 689 527.5 689 527.5 689V267L405 133.5H137.5Z" className="stroke-[#1F1F1F] dark:stroke-white" strokeWidth="131" strokeLinejoin="round" />
    </g>
    <path d="M242.302 649.7C226.102 649.7 211.802 646.8 199.402 641C187.002 635.2 177.302 626.9 170.302 616.1C163.302 605.3 159.802 592.3 159.802 577.1V568.7H198.802V577.1C198.802 589.7 202.702 599.2 210.502 605.6C218.302 611.8 228.902 614.9 242.302 614.9C255.902 614.9 266.002 612.2 272.602 606.8C279.402 601.4 282.802 594.5 282.802 586.1C282.802 580.3 281.102 575.6 277.702 572C274.502 568.4 269.702 565.5 263.302 563.3C257.102 560.9 249.502 558.7 240.502 556.7L233.602 555.2C219.202 552 206.802 548 196.402 543.2C186.202 538.2 178.302 531.7 172.702 523.7C167.302 515.7 164.602 505.3 164.602 492.5C164.602 479.7 167.602 468.8 173.602 459.8C179.802 450.6 188.402 443.6 199.402 438.8C210.602 433.8 223.702 431.3 238.702 431.3C253.702 431.3 267.002 433.9 278.602 439.1C290.402 444.1 299.602 451.7 306.202 461.9C313.002 471.9 316.402 484.5 316.402 499.7V508.7H277.402V499.7C277.402 491.7 275.802 485.3 272.602 480.5C269.602 475.5 265.202 471.9 259.402 469.7C253.602 467.3 246.702 466.1 238.702 466.1C226.702 466.1 217.802 468.4 212.002 473C206.402 477.4 203.602 483.5 203.602 491.3C203.602 496.5 204.902 500.9 207.502 504.5C210.302 508.1 214.402 511.1 219.802 513.5C225.202 515.9 232.102 518 240.502 519.8L247.402 521.3C262.402 524.5 275.402 528.6 286.402 533.6C297.602 538.6 306.302 545.2 312.502 553.4C318.702 561.6 321.802 572.1 321.802 584.9C321.802 597.7 318.502 609 311.902 618.8C305.502 628.4 296.302 636 284.302 641.6C272.502 647 258.502 649.7 242.302 649.7ZM352.535 645.5V496.7H389.735V516.2H395.135C397.535 511 402.035 506.1 408.635 501.5C415.235 496.7 425.235 494.3 438.635 494.3C450.235 494.3 460.335 497 468.935 502.4C477.735 507.6 484.535 514.9 489.335 524.3C494.135 533.5 496.535 544.3 496.535 556.7V645.5H458.735V559.7C458.735 548.5 455.935 540.1 450.335 534.5C444.935 528.9 437.135 526.1 426.935 526.1C415.335 526.1 406.335 530 399.935 537.8C393.535 545.4 390.335 556.1 390.335 569.9V645.5H352.535ZM399.635 479.9L421.835 435.5H464.435L432.635 479.9H399.635Z" className="fill-[#EDEDED] dark:fill-[#1F1F1F]" />
  </svg>
);

/** Doppler logo — wave SVG, theme-aware black/white */
const DopplerLogo = ({ className = 'w-10 h-5' }) => (
  <svg className={className} viewBox="0 0 1024 593" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <g clipPath="url(#doppler-clip-dl)">
      <path d="M1024.96 564.158C1001.2 564.158 981.198 210.5 944.313 210.5C907.428 210.5 891.799 564.158 868.667 564.158C845.536 564.158 826.156 210.5 789.271 210.5C752.386 210.5 750.511 564.158 715.501 564.158C680.492 564.158 681.117 210.5 634.229 210.5C587.342 210.5 595.469 564.158 556.083 564.158C516.698 564.158 455.431 210.5 359.78 210.5C264.129 210.5 262.879 564.158 169.104 564.158C75.3289 564.158 72.8282 210.5 -25.3232 210.5" className="stroke-[#1F1F1F] dark:stroke-white" strokeWidth="57"/>
    </g>
    <defs>
      <clipPath id="doppler-clip-dl">
        <rect width="1024" height="593" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const DOPPLER_IOS = 'https://apps.apple.com/at/app/doppler-vpn-fast-secure/id6757091773';
const DOPPLER_ANDROID = 'https://play.google.com/store/apps/details?id=org.dopplervpn.android';

export default function AppDownload() {
  const { t } = useI18n();

  const esimFeatures = [
    t('appDownload.bullet1', 'Buy and activate eSIMs'),
    t('appDownload.bullet2', 'Monitor data usage in real-time'),
    t('appDownload.bullet3', 'Top up with one tap'),
    t('appDownload.bullet4', 'Get QR codes instantly'),
  ];

  const vpnFeatures = [
    t('dopplerCrossSell.feature1', 'No-registration VPN — no email, no phone'),
    t('dopplerCrossSell.feature2', 'VLESS-Reality anti-censorship encryption'),
    t('dopplerCrossSell.feature3', 'Built-in ad blocker & private DNS'),
    t('dopplerCrossSell.feature4', 'Strict no-logs policy by design'),
  ];

  return (
    <div className="flex flex-col overflow-hidden relative">
      <div className="relative flex-1 flex flex-col">

        {/* Section Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 animate-fade-in-up text-start">
                {t('appDownload.sectionLabel', 'Made by us')}
              </p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-text-primary max-w-5xl animate-fade-in-up animation-delay-100 text-start">
                {t('appDownload.sectionTitle', 'Our apps, built for travellers')}
              </h2>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl space-y-4">

              {/* ── Simnetiq eSIM ── */}
              <Reveal>
                <div className="overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="flex flex-col md:flex-row rtl-native-flex">
                    <div className="relative h-56 sm:h-64 md:h-auto md:w-1/2 overflow-hidden">
                      <Image src="/images/instant.avif" alt="Simnetiq eSIM app" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" loading="lazy" />
                      <div className="absolute bottom-4 start-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rtl-native-flex" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                        {t('appDownload.badgeBoth', 'AVAILABLE ON IOS & ANDROID')}
                      </div>
                    </div>
                    <div className="relative flex-1 p-6 lg:p-10 flex flex-col justify-center">
                      <span className="absolute top-4 end-4 lg:end-8 text-[5rem] md:text-[7rem] lg:text-[9rem] font-semibold leading-none select-none pointer-events-none text-gray-300 dark:text-gray-700" aria-hidden="true">eSIM</span>
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-4 rtl-native-flex">
                          <SimnetiqLogo className="w-12 h-12 flex-shrink-0" />
                          <div>
                            <h3 className="text-xl lg:text-2xl font-semibold text-text-primary tracking-tight text-start">Simnetiq eSIM</h3>
                            <p className="text-xs text-text-muted text-start">{t('appDownload.tagline', 'Manage everything from your phone')}</p>
                          </div>
                        </div>
                        <ul className="space-y-2.5 mb-5">
                          {esimFeatures.map((f, i) => (
                            <li key={i} className="flex items-center gap-2.5 rtl-native-flex">
                              <span className="flex-shrink-0 w-5 h-5 inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(73, 117, 212, 0.1)' }}><CheckIcon /></span>
                              <span className="text-sm text-text-primary">{f}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="flex items-center gap-2 mb-5 rtl-native-flex">
                          <div className="flex items-center gap-0.5 rtl-native-flex" aria-label="5 star rating">
                            {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
                          </div>
                          <span className="text-xs font-semibold text-text-primary">5.0</span>
                          <span className="text-xs text-text-muted">{t('appDownload.rating', 'on App Store')}</span>
                        </div>
                        <div className="w-full h-px mb-5" style={{ backgroundColor: 'var(--divider)' }} />
                        <div className="flex flex-col sm:flex-row gap-2.5 rtl-native-flex-sm">
                          <a href={appStoreLinks.ios} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full ps-5 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex" style={{ backgroundColor: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}>
                            <span className="flex-1 text-center">{t('appDownload.appStore', 'App Store')}</span>
                            <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8" style={{ backgroundColor: 'var(--cta-primary-circle-bg)' }}>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/></svg>
                            </span>
                          </a>
                          <a href={appStoreLinks.android} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full ps-5 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex" style={{ backgroundColor: 'var(--cta-secondary-bg)', color: 'var(--cta-secondary-text)', border: '1px solid var(--cta-secondary-border)' }}>
                            <span className="flex-1 text-center">{t('appDownload.googlePlay', 'Google Play')}</span>
                            <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8" style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/></svg>
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

              {/* ── Doppler VPN ── */}
              <Reveal delay={100}>
                <div className="overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                  <div className="flex flex-col md:flex-row rtl-native-flex">
                    <div className="relative h-56 sm:h-64 md:h-auto md:w-1/2 overflow-hidden">
                      <Image src="/images/dopplerdownload.avif" alt="Doppler VPN app" fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" loading="lazy" />
                      <div className="absolute bottom-4 start-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white rtl-native-flex" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                        {t('dopplerCrossSell.platforms', 'iOS, Android & all platforms')}
                      </div>
                    </div>
                    <div className="relative flex-1 p-6 lg:p-10 flex flex-col justify-center">
                      <span className="absolute top-4 end-4 lg:end-8 text-[5rem] md:text-[7rem] lg:text-[9rem] font-semibold leading-none select-none pointer-events-none text-gray-300 dark:text-gray-700" aria-hidden="true">VPN</span>
                      <div className="relative">
                        <div className="flex items-center gap-3 mb-4 rtl-native-flex">
                          <div className="flex-shrink-0 w-12 h-12 rounded-[12px] shadow flex items-center justify-center overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                            <DopplerLogo className="w-12 h-12" />
                          </div>
                          <div>
                            <a href="https://www.dopplervpn.org" target="_blank" rel="noopener noreferrer" className="text-xl lg:text-2xl font-semibold text-text-primary tracking-tight text-start hover:text-tufts-blue transition-colors">Doppler VPN</a>
                            <p className="text-xs text-text-muted text-start">{t('dopplerCrossSell.badge', 'By Simnetiq')}</p>
                          </div>
                        </div>
                        <ul className="space-y-2.5 mb-5">
                          {vpnFeatures.map((f, i) => (
                            <li key={i} className="flex items-center gap-2.5 rtl-native-flex">
                              <span className="flex-shrink-0 w-5 h-5 inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(73, 117, 212, 0.1)' }}><CheckIcon /></span>
                              <span className="text-sm text-text-primary">{f}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rtl-native-flex" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                          <svg className="w-3 h-3 text-accent-success flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                          <span className="text-xs font-semibold text-accent-success">{t('dopplerCrossSell.promo', 'Launch offer: use code LAUNCH20 for 20% off')}</span>
                        </div>
                        <div className="w-full h-px mb-5" style={{ backgroundColor: 'var(--divider)' }} />
                        <div className="flex flex-col sm:flex-row gap-2.5 rtl-native-flex-sm">
                          <a href={DOPPLER_IOS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full ps-5 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex" style={{ backgroundColor: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}>
                            <span className="flex-1 text-center">{t('dopplerCrossSell.appStore', 'App Store')}</span>
                            <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8" style={{ backgroundColor: 'var(--cta-primary-circle-bg)' }}>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/></svg>
                            </span>
                          </a>
                          <a href={DOPPLER_ANDROID} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-full ps-5 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex" style={{ backgroundColor: 'var(--cta-secondary-bg)', color: 'var(--cta-secondary-text)', border: '1px solid var(--cta-secondary-border)' }}>
                            <span className="flex-1 text-center">{t('dopplerCrossSell.googlePlay', 'Google Play')}</span>
                            <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full w-8 h-8" style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}>
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/></svg>
                            </span>
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
