'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

// Inline SVG icons — avoid lucide-react bundle overhead
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" />
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
  </svg>
);

const UsersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const HeartIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

export default function About() {
  const pathname = usePathname();
  const { t, locale, isLoading: i18nLoading } = useI18n();

  const detectedLanguage = useMemo(() => {
    if (i18nLoading) {
      if (typeof window !== 'undefined') {
        const savedLanguage = localStorage.getItem('Simnetiq-language');
        if (savedLanguage) return savedLanguage;
      }
      return detectLanguageFromPath(pathname) || 'en';
    }
    return locale || 'en';
  }, [locale, pathname, i18nLoading]);

  const direction = getLanguageDirection(detectedLanguage);
  const isRTL = direction === 'rtl';

  const values = [
    {
      Icon: GlobeIcon,
      title: t('about.value1Title', 'Global Connectivity'),
      desc: t('about.value1Desc', 'Instant eSIMs for 200+ countries. Travel without borders, stay connected everywhere.'),
    },
    {
      Icon: ZapIcon,
      title: t('about.value2Title', 'Instant Activation'),
      desc: t('about.value2Desc', 'Your eSIM is ready in seconds. No physical SIM, no waiting, no roaming fees.'),
    },
    {
      Icon: ShieldIcon,
      title: t('about.value3Title', 'Secure & Reliable'),
      desc: t('about.value3Desc', 'Enterprise-grade encryption and fraud protection for every transaction.'),
    },
    {
      Icon: UsersIcon,
      title: t('about.value4Title', 'Built for Travelers'),
      desc: t('about.value4Desc', 'Designed for digital nomads, frequent flyers, and everyone in between.'),
    },
  ];

  const stats = [
    { value: '200+', label: t('about.statCountries', 'Countries') },
    { value: '24/7', label: t('about.statSupport', 'Support') },
    { value: '<2', label: t('about.statMinutes', 'Min activation') },
    { value: '100%', label: t('about.statDigital', 'Digital') },
  ];

  return (
    <div className="bg-[var(--bg-primary)] flex flex-col overflow-hidden" dir={direction} lang={detectedLanguage}>
      <div className="relative flex-1 flex flex-col">

        {/* Hero Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 animate-fade-in-up ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('about.sectionLabel', 'About Us')}
              </p>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl tracking-tight font-semibold text-eerie-black max-w-4xl animate-fade-in-up animation-delay-100 leading-[1.15] ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('about.heroTitle', 'Connectivity freedom for everyone')}
              </h1>
            </div>
          </div>
          <div className="w-full h-px bg-[var(--subtle-bg)]" />
        </div>

        {/* Mission */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-12 lg:py-16 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 ${isRTL ? 'lg:grid-flow-dense' : ''}`}>
                <div className={`animate-fade-in-up animation-delay-200 ${isRTL ? 'text-right lg:col-start-2' : ''}`}>
                  <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-tufts-blue mb-3">
                    {t('about.missionLabel', 'Our Mission')}
                  </p>
                  <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold text-eerie-black mb-4 tracking-tight">
                    {t('about.missionTitle', 'Bridging the world through seamless connectivity')}
                  </h2>
                </div>
                <div className={`animate-fade-in-up animation-delay-300 ${isRTL ? 'text-right lg:col-start-1 lg:row-start-1' : ''}`}>
                  <p className="text-text-muted text-sm sm:text-base leading-relaxed mb-4">
                    {t('about.missionDesc1', 'We believe connectivity is a fundamental right. Whether you\'re a backpacker, expat, or digital nomad — you deserve fast, affordable internet without the friction of physical SIM cards or surprise roaming charges.')}
                  </p>
                  <p className="text-text-muted text-sm sm:text-base leading-relaxed">
                    {t('about.missionDesc2', 'Simnetiq was built to make staying connected abroad as simple as scanning a QR code. No contracts, no stores, no hassle — just instant data wherever you land.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl bg-[var(--bg-secondary)]">
            <div className="px-4 py-10 lg:py-12 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <div
                    key={index}
                    className={`animate-fade-in-up text-center`}
                    style={{ animationDelay: `${(index + 1) * 100}ms` }}
                  >
                    <p className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-eerie-black tracking-tight">
                      {stat.value}
                    </p>
                    <p className="text-xs sm:text-sm font-medium tracking-widest uppercase text-text-muted mt-2">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Values Section Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 animate-fade-in-up ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('about.valuesLabel', 'Why Choose Us')}
              </p>
              <h2 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl animate-fade-in-up animation-delay-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('about.valuesTitle', 'Built from the ground up for travelers')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px bg-[var(--subtle-bg)]" />
        </div>

        {/* Values Grid */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {values.map(({ Icon, title, desc }, index) => (
                  <div
                    key={index}
                    className="group relative bg-[var(--bg-secondary)] overflow-hidden hover:bg-[var(--bg-primary)] transition-all duration-500 animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="p-6 lg:p-8">
                      <div className={`w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${isRTL ? 'ml-auto' : ''}`}>
                        <Icon className="w-5 h-5 text-tufts-blue" />
                      </div>
                      <h3 className={`text-lg lg:text-xl font-semibold text-eerie-black mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {title}
                      </h3>
                      <p className={`text-text-muted text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
                        {desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Our Story Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 animate-fade-in-up ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('about.storyLabel', 'Our Story')}
              </p>
              <h2 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl animate-fade-in-up animation-delay-100 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('about.storyTitle', 'From frustration to innovation')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px bg-[var(--subtle-bg)]" />
        </div>

        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 lg:py-12 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className={`max-w-3xl animate-fade-in-up animation-delay-200 ${isRTL ? 'mr-0 ml-auto text-right' : ''}`}>
                <div className={`flex gap-4 items-start mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-tufts-blue/10 flex items-center justify-center mt-0.5">
                    <HeartIcon className="w-5 h-5 text-tufts-blue" />
                  </div>
                  <p className="text-text-muted text-sm sm:text-base leading-relaxed">
                    {t('about.storyPara1', 'Simnetiq started with a simple problem: getting connected abroad shouldn\'t be this hard. Between hunting for local SIM shops, dealing with language barriers, and paying outrageous roaming fees — we knew there had to be a better way.')}
                  </p>
                </div>
                <p className={`text-text-muted text-sm sm:text-base leading-relaxed mb-6 ${isRTL ? '' : 'pl-14'}`}>
                  {t('about.storyPara2', 'Today, Simnetiq serves travelers in over 200 countries with instant digital eSIMs. Purchase online, scan a QR code, and you\'re connected — all before you even leave the airport.')}
                </p>
                <p className={`text-text-muted text-sm sm:text-base leading-relaxed ${isRTL ? '' : 'pl-14'}`}>
                  {t('about.storyPara3', 'We\'re a small team of travelers and technologists who believe the best connectivity is the kind you don\'t have to think about. No contracts, no stores, no friction.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl bg-[var(--bg-secondary)]">
            <div className="px-4 py-16 lg:py-20 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="text-center animate-fade-in-up">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-eerie-black tracking-tight mb-4">
                  {t('about.ctaTitle', 'Ready to go global?')}
                </h2>
                <p className="text-text-muted text-sm sm:text-base mb-8 max-w-xl mx-auto leading-relaxed">
                  {t('about.ctaDesc', 'Get your eSIM in minutes. Works on any unlocked device.')}
                </p>
                <Link
                  href="/esim-plans"
                  className={`group inline-flex items-center gap-2 px-8 py-3 bg-[var(--login-bg)] text-[var(--login-text)] font-medium rounded-full hover:opacity-90 transition-colors text-sm sm:text-base ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {t('about.ctaButton', 'Browse Plans')}
                  <ArrowRightIcon className={`w-4 h-4 group-hover:translate-x-1 transition-transform ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
