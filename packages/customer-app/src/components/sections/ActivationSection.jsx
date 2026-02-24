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
    <div className="bg-white flex flex-col overflow-hidden" id="how-it-works">
      <div className="relative flex-1 flex flex-col">
        {/* Simnetiq App Download — FeaturesSection style */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="relative bg-gray-50 overflow-hidden animate-fade-in-up">
                <div className="flex flex-col md:flex-row rtl-native-flex">
                  {/* Image — left half on desktop, full width on mobile */}
                  <div className="relative h-56 sm:h-64 md:h-auto md:w-1/2 overflow-hidden">
                    <Image
                      src="/images/blog.avif"
                      alt="Simnetiq eSIM"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      priority={false}
                    />
                  </div>

                  {/* Content — right half */}
                  <div className="relative flex-1 p-6 lg:p-10 flex flex-col justify-end">
                    {/* Large decorative watermark */}
                    <span className="absolute top-4 end-4 lg:end-8 text-[5rem] md:text-[7rem] lg:text-[9rem] font-semibold leading-none text-gray-500/10 select-none pointer-events-none" aria-hidden="true">
                      eSIM
                    </span>

                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3 rtl-native-flex">
                        <img
                          src="/images/logo_icon/ioslogo.png"
                          alt="Simnetiq"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-[12px] shadow"
                        />
                        <div>
                          <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mb-1 text-start">
                            {t('activation.appBadge', 'DOWNLOAD THE APP')}
                          </p>
                          <h3 className="text-xl lg:text-2xl font-semibold text-eerie-black tracking-tight text-start">
                            {t('activation.appTitle', 'Stay connected wherever you travel')}
                          </h3>
                        </div>
                      </div>

                      <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-md mb-4 text-start">
                        {t('activation.appDescription', 'Get instant eSIM data plans for 200+ countries. No physical SIM needed, activate in minutes.')}
                      </p>

                      {/* Download Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 rtl-native-flex">
                        <a
                          href={appStoreLinks.ios}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleIOSDownload}
                          className="inline-flex items-center rounded-full bg-gray-900 ps-5 pe-1 py-1 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-gray-800 hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
                        >
                          <span className="flex-1 text-center">{t('activation.appStore', 'App Store')}</span>
                          <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white/20 w-8 h-8">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                            </svg>
                          </span>
                        </a>
                        <a
                          href={appStoreLinks.android}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={handleAndroidDownload}
                          className="inline-flex items-center rounded-full bg-white ps-5 pe-1 py-1 text-sm font-semibold text-gray-900 ring-1 ring-gray-200 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
                        >
                          <span className="flex-1 text-center">{t('activation.googlePlay', 'Google Play')}</span>
                          <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-gray-100 w-8 h-8">
                            <svg className="w-4 h-4 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                              <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z"/>
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
        </div>

        {/* Doppler VPN Promo — FeaturesSection style */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl mt-6">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="relative bg-gray-50 overflow-hidden animate-fade-in-up">
                <div className="flex flex-col md:flex-row rtl-native-flex">
                  {/* Image — left half on desktop, full width on mobile */}
                  <div className="relative h-56 sm:h-64 md:h-auto md:w-1/2 overflow-hidden">
                    <Image
                      src="/images/logo_icon/doppler.avif"
                      alt="Doppler VPN"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                      loading="lazy"
                    />
                  </div>

                  {/* Content — right half */}
                  <div className="relative flex-1 p-6 lg:p-10 flex flex-col justify-end">
                    {/* Large decorative watermark */}
                    <span className="absolute top-4 end-4 lg:end-8 text-[5rem] md:text-[7rem] lg:text-[9rem] font-semibold leading-none text-gray-500/10 select-none pointer-events-none" aria-hidden="true">
                      VPN
                    </span>

                    <div className="relative">
                      <div className="flex items-center gap-3 mb-3 rtl-native-flex">
                        <img
                          src="/images/doppler-icon.jpg"
                          alt="Doppler VPN"
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-[12px] shadow"
                        />
                        <div>
                          <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mb-1 text-start">
                            {t('activation.doppler.badge', 'By Simnetiq')}
                          </p>
                          <h3 className="text-xl lg:text-2xl font-semibold text-eerie-black tracking-tight text-start">
                            {t('activation.doppler.title', 'Doppler VPN')}
                          </h3>
                        </div>
                      </div>

                      <p className="text-gray-500 text-sm sm:text-base leading-relaxed max-w-md mb-3 text-start">
                        {t('activation.doppler.description', 'Fast, no-logs VPN powered by WireGuard on mobile and advanced VLESS via Telegram bot. All major platforms, up to 10 devices.')}
                      </p>

                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 mb-4 rtl-native-flex">
                        <span className="text-xs font-semibold text-emerald-700">
                          {t('activation.doppler.promo', 'Launch offer: use code LAUNCH20 for 20% off')}
                        </span>
                      </div>

                      {/* CTA Buttons */}
                      <div className="flex flex-col sm:flex-row gap-3 rtl-native-flex">
                        <a
                          href="https://apps.apple.com/at/app/doppler-vpn-fast-secure/id6757091773"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-full bg-gray-900 ps-5 pe-1 py-1 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-gray-800 hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
                        >
                          <span className="flex-1 text-center">{t('activation.doppler.appStore', 'App Store')}</span>
                          <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white/20 w-8 h-8">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="21" y1="17" x2="18" y2="17"/><line x1="20" y1="21" x2="14.29" y2="10.72"/><line x1="12" y1="6.6" x2="10" y2="3"/><line x1="14" y1="3" x2="4" y2="21"/><line x1="13" y1="17" x2="3" y2="17"/>
                            </svg>
                          </span>
                        </a>
                        <a
                          href="https://dopplervpn.org/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center rounded-full bg-white ps-5 pe-1 py-1 text-sm font-semibold text-gray-900 ring-1 ring-gray-200 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
                        >
                          <span className="flex-1 text-center">{t('activation.doppler.learnMore', 'Learn More')}</span>
                          <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-gray-100 w-8 h-8">
                            <svg className="w-3.5 h-3.5 text-gray-900 rtl:-scale-x-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        </div>

        {/* FAQ Section Header */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 mb-4 animate-fade-in-up text-start">
                {t('faq.title', 'Frequently Asked Questions')}
              </p>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl animate-fade-in-up animation-delay-100 text-start">
                {t('faq.subtitle', 'Everything you need to know about eSIM')}
              </h2>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
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
                      className="group relative bg-white overflow-hidden border border-white transition-all duration-300"
                    >
                      <button
                        onClick={() => toggleFaq(index)}
                        className="w-full p-5 lg:p-6 flex items-start justify-between gap-4 text-start rtl-native-flex"
                        aria-expanded={isOpen}
                      >
                        <span className="font-medium text-eerie-black text-sm lg:text-base leading-relaxed text-start">
                          {faq.question}
                        </span>
                        {isOpen ? (
                          <ChevronUpIcon className="w-5 h-5 text-tufts-blue flex-shrink-0 mt-0.5" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                      </button>
                      
                      {/* Answer - CSS transition for smooth animation */}
                      <div 
                        className={`overflow-hidden transition-all duration-300 ease-out ${
                          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="px-5 pb-5 lg:px-6 lg:pb-6">
                          <p className="text-gray-600 text-sm leading-relaxed text-start">
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
