'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';
import { trackCustomFacebookEvent } from '@esim/shared/utils/facebookPixel';

// Inline SVG icons to avoid lucide-react bundle overhead
const ChevronDownIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const ChevronUpIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6"/>
  </svg>
);



export default function ActivationSection() {
  const { t } = useI18n();
  const [openFaq, setOpenFaq] = useState(null);

  // Track iOS download
  const handleIOSDownload = () => {
    trackCustomFacebookEvent('DownloadIOSApp', {
      platform: 'iOS',
      source: 'activation_section',
      content_type: 'app_download',
      button_location: 'activation_ios_button',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  // Track Android download
  const handleAndroidDownload = () => {
    trackCustomFacebookEvent('DownloadAndroidApp', {
      platform: 'Android',
      source: 'activation_section',
      content_type: 'app_download',
      button_location: 'activation_android_button',
      event_category: 'engagement',
      timestamp: new Date().toISOString()
    });
  };

  // FAQ data
  const faqItems = [
    {
      question: t('faq.whatIsEsim', 'What is an eSIM and how does it work?'),
      answer: t('faq.whatIsEsimAnswer', "An eSIM (embedded SIM) is a digital SIM card that's built into your device. Instead of inserting a physical SIM card, you can download and activate a cellular plan directly onto your device. This allows you to switch between carriers and plans without needing to swap physical cards.")
    },
    {
      question: t('faq.deviceSupport', 'Which devices support eSIM?'),
      answer: t('faq.deviceSupportAnswer', 'Most modern smartphones support eSIM, including iPhone XS and newer, Google Pixel 3 and newer, Samsung Galaxy S20 and newer, and many others. Check your device settings or contact us to confirm compatibility.')
    },
    {
      question: t('faq.howToActivate', 'How do I activate my eSIM?'),
      answer: t('faq.howToActivateAnswer', "After purchase, you'll receive a QR code via email. Simply scan this code with your device's camera in the cellular settings, and your eSIM will be activated automatically. Detailed instructions are provided for each device type.")
    },
    {
      question: t('faq.paymentMethods', 'What payment methods do you accept?'),
      answer: t('faq.paymentMethodsAnswer', 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay, and various local payment methods depending on your region.')
    },
    {
      question: t('faq.refundPolicy', "Can I get a refund if I'm not satisfied?"),
      answer: t('faq.refundPolicyAnswer', "Yes, we offer a 7-day money-back guarantee for unused data plans. If you haven't activated your eSIM or used any data, you can request a full refund within 7 days of purchase.")
    },
    {
      question: t('faq.notConnecting', "My eSIM isn't connecting to the network. What should I do?"),
      answer: t('faq.notConnectingAnswer', "First, ensure you're in an area with network coverage. Try restarting your device, toggling airplane mode on/off, or manually selecting the network in your cellular settings. If issues persist, contact our support team.")
    },
    {
      question: t('faq.callsSms', 'Can I use my eSIM for calls and SMS?'),
      answer: t('faq.callsSmsAnswer', 'Our eSIM plans are primarily data-only. However, you can use VoIP services like WhatsApp, Skype, or FaceTime for calls and messaging over your data connection.')
    },
    {
      question: t('faq.checkUsage', 'How do I check my data usage?'),
      answer: t('faq.checkUsageAnswer', "You can monitor your data usage through your device's settings or our mobile app. We also send notifications when you're approaching your data limit.")
    }
  ];

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <div className="flex flex-col overflow-hidden relative" id="how-it-works">
      <div className="relative flex-1 flex flex-col">
        {/* Our Apps — Section Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 animate-fade-in-up text-start">
                {t('activation.sectionLabel', 'Our Apps')}
              </p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-text-primary max-w-5xl animate-fade-in-up animation-delay-100 text-start">
                {t('activation.sectionTitle', 'Everything you need, in your pocket')}
              </h2>
            </div>
          </div>
        </div>

        {/* App Cards */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* ── Simnetiq eSIM App ── */}
                <div className="relative overflow-hidden animate-fade-in-up" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

                  {/* Image area */}
                  <div className="relative h-52 sm:h-60 overflow-hidden">
                    <Image
                      src="/images/instant.avif"
                      alt="Simnetiq eSIM app"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="lazy"
                    />
                    {/* Platform pill overlay */}
                    <div className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white rtl-native-flex" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                      {t('activation.platforms', 'iOS & Android')}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative p-5 lg:p-6">
                    {/* Watermark */}
                    <span className="absolute -top-8 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-300 dark:text-gray-700 select-none pointer-events-none" aria-hidden="true">
                      eSIM
                    </span>

                    {/* App icon + name */}
                    <div className="flex items-center gap-3 mb-4 rtl-native-flex">
                      <img
                        src="/images/logo_icon/ioslogo.png"
                        alt="Simnetiq"
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-[11px] shadow"
                      />
                      <div>
                        <h3 className="text-lg lg:text-xl font-semibold text-text-primary tracking-tight text-start">
                          Simnetiq eSIM
                        </h3>
                        <p className="text-xs text-text-muted text-start">
                          {t('activation.appTagline', 'Travel data, simplified')}
                        </p>
                      </div>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2.5 mb-5">
                      {[
                        t('activation.feature1', 'Buy and activate eSIMs instantly'),
                        t('activation.feature2', 'Monitor data usage in real-time'),
                        t('activation.feature3', 'Top up with one tap'),
                        t('activation.feature4', 'Get QR codes instantly'),
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 rtl-native-flex">
                          <span className="flex-shrink-0 w-5 h-5 inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(73, 117, 212, 0.1)' }}>
                            <svg className="w-3 h-3 text-tufts-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          </span>
                          <span className="text-sm text-text-primary">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Rating */}
                    <div className="flex items-center gap-2 mb-5 rtl-native-flex">
                      <div className="flex items-center gap-0.5 rtl-native-flex" aria-label="5 star rating">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className="w-3.5 h-3.5 text-accent-highlight" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-text-primary">5.0</span>
                      <span className="text-xs text-text-muted">{t('activation.appStoreRating', 'on App Store')}</span>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px mb-5" style={{ backgroundColor: 'var(--divider)' }} />

                    {/* Download Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 rtl-native-flex-sm">
                      <a
                        href={appStoreLinks.ios}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleIOSDownload}
                        className="inline-flex items-center rounded-full ps-4 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex"
                        style={{ backgroundColor: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}
                      >
                        <span className="flex-1 text-center">{t('activation.appStore', 'App Store')}</span>
                        <span className="ms-2 flex-shrink-0 inline-flex items-center justify-center rounded-full w-7 h-7" style={{ backgroundColor: 'var(--cta-primary-circle-bg)' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                          </svg>
                        </span>
                      </a>
                      <a
                        href={appStoreLinks.android}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleAndroidDownload}
                        className="inline-flex items-center rounded-full ps-4 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex"
                        style={{ backgroundColor: 'var(--cta-secondary-bg)', color: 'var(--cta-secondary-text)', border: '1px solid var(--cta-secondary-border)' }}
                      >
                        <span className="flex-1 text-center">{t('activation.googlePlay', 'Google Play')}</span>
                        <span className="ms-2 flex-shrink-0 inline-flex items-center justify-center rounded-full w-7 h-7" style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/>
                          </svg>
                        </span>
                      </a>
                    </div>
                  </div>
                </div>

                {/* ── Doppler VPN ── */}
                <div className="relative overflow-hidden animate-fade-in-up animation-delay-100" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>

                  {/* Image area */}
                  <div className="relative h-52 sm:h-60 overflow-hidden">
                    <Image
                      src="/images/secure.avif"
                      alt="Doppler VPN app"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="lazy"
                    />
                    {/* Platform pill overlay */}
                    <div className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-white rtl-native-flex" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
                      {t('activation.doppler.platforms', 'iOS & All platforms')}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="relative p-5 lg:p-6">
                    {/* Watermark */}
                    <span className="absolute -top-8 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-gray-300 dark:text-gray-700 select-none pointer-events-none" aria-hidden="true">
                      VPN
                    </span>

                    {/* App icon + name */}
                    <div className="flex items-center gap-3 mb-4 rtl-native-flex">
                      <img
                        src="/images/doppler-icon.jpg"
                        alt="Doppler VPN"
                        width={44}
                        height={44}
                        className="w-11 h-11 rounded-[11px] shadow"
                      />
                      <div>
                        <h3 className="text-lg lg:text-xl font-semibold text-text-primary tracking-tight text-start">
                          Doppler VPN
                        </h3>
                        <p className="text-xs text-text-muted text-start">
                          {t('activation.doppler.tagline', 'By Simnetiq')}
                        </p>
                      </div>
                    </div>

                    {/* Feature list */}
                    <ul className="space-y-2.5 mb-5">
                      {[
                        t('activation.doppler.feature1', 'WireGuard protocol — blazing fast'),
                        t('activation.doppler.feature2', 'Strict no-logs policy'),
                        t('activation.doppler.feature3', 'Up to 10 devices simultaneously'),
                        t('activation.doppler.feature4', 'VLESS-Reality via Telegram bot'),
                      ].map((feature, i) => (
                        <li key={i} className="flex items-center gap-2.5 rtl-native-flex">
                          <span className="flex-shrink-0 w-5 h-5 inline-flex items-center justify-center" style={{ backgroundColor: 'rgba(73, 117, 212, 0.1)' }}>
                            <svg className="w-3 h-3 text-tufts-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                          </span>
                          <span className="text-sm text-text-primary">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Promo badge */}
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-5 rtl-native-flex" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                      <svg className="w-3 h-3 text-accent-success flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/></svg>
                      <span className="text-xs font-semibold text-accent-success">
                        {t('activation.doppler.promo', 'Launch offer: use code LAUNCH20 for 20% off')}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="w-full h-px mb-5" style={{ backgroundColor: 'var(--divider)' }} />

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 rtl-native-flex-sm">
                      <a
                        href="https://apps.apple.com/at/app/doppler-vpn-fast-secure/id6757091773"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full ps-4 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex"
                        style={{ backgroundColor: 'var(--cta-primary-bg)', color: 'var(--cta-primary-text)' }}
                      >
                        <span className="flex-1 text-center">{t('activation.doppler.appStore', 'App Store')}</span>
                        <span className="ms-2 flex-shrink-0 inline-flex items-center justify-center rounded-full w-7 h-7" style={{ backgroundColor: 'var(--cta-primary-circle-bg)' }}>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                          </svg>
                        </span>
                      </a>
                      <a
                        href="https://dopplervpn.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center rounded-full ps-4 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:opacity-90 w-full sm:w-auto rtl-native-flex"
                        style={{ backgroundColor: 'var(--cta-secondary-bg)', color: 'var(--cta-secondary-text)', border: '1px solid var(--cta-secondary-border)' }}
                      >
                        <span className="flex-1 text-center">{t('activation.doppler.learnMore', 'Learn More')}</span>
                        <span className="ms-2 flex-shrink-0 inline-flex items-center justify-center rounded-full w-7 h-7" style={{ backgroundColor: 'var(--cta-secondary-circle-bg)' }}>
                          <svg className="w-3 h-3 rtl:-scale-x-100" style={{ color: 'var(--cta-secondary-circle-text)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M7 17 17 7"/><path d="M7 7h10v10"/>
                          </svg>
                        </span>
                      </a>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>

        {/* FAQ Section Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 animate-fade-in-up text-start">
                {t('faq.title', 'Frequently Asked Questions')}
              </p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-text-primary max-w-5xl animate-fade-in-up animation-delay-100 text-start">
                {t('faq.subtitle', 'Everything you need to know about eSIM')}
              </h2>
            </div>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {faqItems.map((faq, index) => {
                  const isOpen = openFaq === index;
                  return (
                    <div 
                      key={index} 
                      className="group relative overflow-hidden transition-all duration-300" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full p-5 lg:p-6 flex items-start justify-between gap-4 text-start rtl-native-flex"
                        aria-expanded={isOpen}
                      >
                        <span className="font-medium text-text-primary text-sm lg:text-base leading-relaxed">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUpIcon className="w-5 h-5 text-tufts-blue flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-text-muted flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                      
                      {/* Answer - CSS transition for smooth animation */}
                      <div 
                        className={`overflow-hidden transition-all duration-300 ease-out ${
                          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-5 pb-5 lg:px-6 lg:pb-6">
                          <p className="text-text-muted text-sm leading-relaxed text-start">
                            {faq.answer}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pointer-events-none absolute inset-px ring-1 ring-black/5" />
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
