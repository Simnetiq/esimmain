'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
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

const AppleIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const AndroidIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396z"/>
  </svg>
);

export default function ActivationSection() {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [openFaq, setOpenFaq] = useState(null);

  // Language detection with fallback
  const detectedLanguage = useMemo(() => {
    if (i18nLoading) {
      if (typeof window !== 'undefined') {
        const savedLanguage = localStorage.getItem('Simnetiq-language');
        if (savedLanguage) return savedLanguage;
      }
      return 'en';
    }
    return locale || 'en';
  }, [locale, i18nLoading]);

  const direction = getLanguageDirection(detectedLanguage);
  const isRTL = direction === 'rtl';
  
  // Grid pattern style
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };

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
    <div className="bg-white flex flex-col overflow-hidden" id="how-it-works" dir={direction} lang={detectedLanguage}>
      <div className="relative flex-1 flex flex-col">
        {/* Grid Pattern - Left Side */}
        <div 
          className="hidden xl:block absolute left-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />

        {/* Grid Pattern - Right Side */}
        <div 
          className="hidden xl:block absolute right-0 top-0 bottom-0 w-32"
          style={gridPatternStyle}
        />

        {/* App Download CTA - BlogAppDownload style */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              
              {/* App Download Card with gradient background */}
              <div className="relative isolate overflow-hidden  animate-fade-in-up">
                {/* Blurry gradient background */}
                <div className="absolute inset-0 -z-10">
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'linear-gradient(135deg, #5374CD 0%, #7B93DB 30%, #A8B8E8 50%,rgb(204, 215, 239) 85%, #FFFFFF 100%)'
                    }}
                  />
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: 'radial-gradient(ellipse at 30% 20%, rgba(83, 116, 205, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 255, 255, 0.8) 0%, transparent 50%)'
                    }}
                  />
                </div>

                <div className="px-6 py-16 md:px-12 md:py-20">
                  <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-2xl font-semibold tracking-tight text-white  md:text-3xl lg:text-4xl animate-fade-in-up animation-delay-100 drop-shadow-[0_2px_16px_rgba(225, 225, 225, 0.22)]">
                      {t('activation.appTitle', 'Stay connected wherever you travel')}
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-base font-normal text-pretty text-gray-700 md:text-lg animate-fade-in-up animation-delay-200">
                      {t('activation.appDescription', 'Get instant eSIM data plans for 200+ countries. No physical SIM needed, activate in minutes.')}
                    </p>
                    
                    {/* Download Buttons */}
                    <div className={`mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up animation-delay-300 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                      {/* iOS Download */}
                      <a
                        href={appStoreLinks.ios}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleIOSDownload}
                        className={`group inline-flex items-center gap-3 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:scale-105 `}
                      >
                        <AppleIcon />
                        <span className="text-base">{t('activation.appStore', 'App Store')}</span>
                      </a>

                      {/* Android Download */}
                      <a
                        href={appStoreLinks.android}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleAndroidDownload}
                        className={`group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-900 ring-1 ring-gray-200 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:scale-105 `}
                      >
                        <AndroidIcon />
                        <span className="text-base">{t('activation.googlePlay', 'Google Play')}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Doppler VPN Promo */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl mt-6">
            <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 backdrop-blur-sm animate-fade-in-up">
                <div className="px-6 py-8 md:px-10 md:py-10">
                  <div className={`flex flex-col md:flex-row items-center gap-6 md:gap-10 ${isRTL ? 'md:flex-row-reverse' : ''}`}>
                    {/* App Icon */}
                    <div className="flex-shrink-0">
                      <img
                        src="/images/doppler-icon.jpg"
                        alt="Doppler VPN"
                        width={80}
                        height={80}
                        className="w-[72px] h-[72px] md:w-20 md:h-20 rounded-[18px] md:rounded-[22px] shadow-lg"
                      />
                    </div>

                    {/* Text */}
                    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                      <span className="text-xs font-semibold tracking-widest uppercase text-tufts-blue mb-1 block">
                        {t('activation.doppler.badge', 'By Simnetiq')}
                      </span>
                      <h3 className="text-xl md:text-2xl font-semibold text-gray-900 mb-2">
                        {t('activation.doppler.title', 'Doppler VPN')}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed max-w-lg mb-3">
                        {t('activation.doppler.description', 'Fast, no-logs VPN powered by WireGuard on mobile and advanced VLESS via Telegram bot. All major platforms, up to 10 devices.')}
                      </p>
                      <div className={`inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-semibold text-emerald-700">
                          {t('activation.doppler.promo', 'Launch offer: use code 20 for 20% off')}
                        </span>
                      </div>
                    </div>

                    {/* CTA Buttons */}
                    <div className={`flex flex-col sm:flex-row gap-3 flex-shrink-0 ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
                      <a
                        href="https://apps.apple.com/at/app/doppler-vpn-fast-secure/id6757091773"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2.5 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-150 hover:bg-gray-800 hover:scale-[1.02] ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <AppleIcon />
                        <span>{t('activation.doppler.appStore', 'Get on App Store')}</span>
                      </a>
                      <a
                        href="https://dopplervpn.org/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-2.5 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-gray-900 ring-1 ring-gray-200 shadow-sm transition-all duration-150 hover:bg-gray-50 hover:scale-[1.02] ${isRTL ? 'flex-row-reverse' : ''}`}
                      >
                        <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/>
                        </svg>
                        <span>{t('activation.doppler.learnMore', 'Learn More')}</span>
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
              <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 mb-4 animate-fade-in-up ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('faq.title', 'Frequently Asked Questions')}
              </p>
              <h2 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black max-w-5xl animate-fade-in-up animation-delay-100 ${isRTL ? 'text-right' : 'text-left'}`}>
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
                        className={`w-full p-5 lg:p-6 flex items-start justify-between gap-4 ${isRTL ? 'text-right' : 'text-left'}`}
                        aria-expanded={isOpen}
                      >
                        <span className={`font-medium text-eerie-black text-sm lg:text-base leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
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
                          <p className={`text-gray-600 text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
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
