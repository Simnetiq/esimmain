'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import { usePathname } from 'next/navigation';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import Link from 'next/link';

// Inline SVG icons to avoid lucide-react bundle overhead
const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

const BarChartIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h3"/>
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const CookiePolicy = () => {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  
  const detectedLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(detectedLanguage) === 'rtl';

  // Grid pattern style
  const gridPatternStyle = {
    backgroundSize: '10px 10px',
    backgroundImage: 'repeating-linear-gradient(315deg, rgba(229, 231, 235, 0.5) 0, rgba(229, 231, 235, 0.5) 1px, transparent 0, transparent 50%)'
  };

  const cookieTypes = [
    {
      IconComponent: ShieldIcon,
      title: t('cookies.essential.title', 'Essential Cookies'),
      description: t('cookies.essential.description', 'Required for basic website functionality and security'),
      examples: [
        t('cookies.essential.example1', 'Authentication and login sessions'),
        t('cookies.essential.example2', 'Security and fraud prevention (Stripe payment processing)'),
        t('cookies.essential.example3', 'Shopping cart and checkout process'),
        t('cookies.essential.example4', 'Language and region preferences')
      ],
      canDisable: false
    },
    {
      IconComponent: BarChartIcon,
      title: t('cookies.analytics.title', 'Analytics Cookies'),
      description: t('cookies.analytics.description', 'Help us understand how visitors use our website'),
      examples: [
        t('cookies.analytics.example1', 'Google Analytics for traffic analysis'),
        t('cookies.analytics.example2', 'Firebase Analytics for app performance'),
        t('cookies.analytics.example3', 'Performance monitoring and optimization'),
        t('cookies.analytics.example4', 'A/B testing and feature improvements')
      ],
      canDisable: true
    },
    {
      IconComponent: SettingsIcon,
      title: t('cookies.functional.title', 'Functional Cookies'),
      description: t('cookies.functional.description', 'Enhance your experience with personalized features'),
      examples: [
        t('cookies.functional.example1', 'Remember your preferences and settings'),
        t('cookies.functional.example2', 'Personalized content recommendations'),
        t('cookies.functional.example3', 'Customer support chat widget'),
        t('cookies.functional.example4', 'Social media integration features')
      ],
      canDisable: true
    },
    {
      IconComponent: GlobeIcon,
      title: t('cookies.marketing.title', 'Marketing Cookies'),
      description: t('cookies.marketing.description', 'Used to deliver relevant advertisements'),
      examples: [
        t('cookies.marketing.example1', 'Facebook Pixel for targeted advertising'),
        t('cookies.marketing.example2', 'Google Ads conversion tracking'),
        t('cookies.marketing.example3', 'Retargeting and remarketing campaigns'),
        t('cookies.marketing.example4', 'Attribution and conversion measurement')
      ],
      canDisable: true
    }
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative">
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

        {/* Header Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <p className={`text-sm sm:text-base font-medium tracking-widest uppercase text-gray-500 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cookies.pageTitle', 'Cookie Policy')}
              </p>
              <h1 className={`text-2xl sm:text-3xl lg:text-4xl xl:text-5xl tracking-tight font-semibold text-eerie-black max-w-4xl mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cookies.heading', 'How Simnetiq Uses Cookies')}
              </h1>
              <p className={`text-gray-600 text-base lg:text-lg max-w-3xl mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cookies.intro', 'This Cookie Policy explains how Simnetiq ("we", "us", or "our") uses cookies and similar technologies when you visit our website and use our services.')}
              </p>
              <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cookies.lastUpdated', 'Last updated')}: December 15, 2024
              </p>
            </div>
          </div>
          <div className="w-full h-px bg-gray-100" />
        </div>

        {/* What Are Cookies Section */}
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl">
            <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
              <div className="bg-gray-50 rounded-lg p-6 lg:p-8 mb-8">
                <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.whatAreCookies.title', 'What Are Cookies?')}
                </h2>
                <p className={`text-gray-600 leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.whatAreCookies.p1', 'Cookies are small text files that are stored in your browser\'s directory on your computer. They help website operators understand how visitors use their website, remember user login details, and store website preferences.')}
                </p>
                <p className={`text-gray-600 leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.whatAreCookies.p2', 'Simnetiq uses cookies and similar technologies (such as URL tracking and local storage). Throughout this Cookie Policy, we refer to all of these technologies as "cookies".')}
                </p>
              </div>

              {/* Cookie Types Grid */}
              <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-6 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cookies.typesTitle', 'Types of Cookies We Use')}
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                {cookieTypes.map((type, index) => {
                  const IconComponent = type.IconComponent;
                  return (
                    <div key={index} className="group relative bg-gray-50 rounded-lg overflow-hidden hover:bg-white transition-all duration-300">
                      <div className="p-5 lg:p-6">
                        <div className={`flex items-start justify-between mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <div className="w-10 h-10 bg-tufts-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <IconComponent className="w-5 h-5 text-tufts-blue" />
                            </div>
                            <div>
                              <h3 className={`text-base lg:text-lg font-semibold text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>
                                {type.title}
                              </h3>
                              <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                                {type.description}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                            type.canDisable 
                              ? 'bg-tufts-blue/10 text-tufts-blue' 
                              : 'bg-gray-200 text-gray-700'
                          }`}>
                            {type.canDisable 
                              ? t('cookies.optional', 'Optional') 
                              : t('cookies.required', 'Required')
                            }
                          </span>
                        </div>
                        
                        <ul className="space-y-2">
                          {type.examples.map((example, exIndex) => (
                            <li key={exIndex} className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                              <div className="w-1.5 h-1.5 bg-tufts-blue rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{example}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                    </div>
                  );
                })}
              </div>

              {/* Third-Party Cookies */}
              <div className="bg-gray-50 rounded-lg p-6 lg:p-8 mb-8">
                <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.thirdParty.title', 'Third-Party Cookies')}
                </h2>
                <p className={`text-gray-600 leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.thirdParty.description', 'We work with trusted partners who may set cookies on our behalf:')}
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className={`font-medium text-eerie-black mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('cookies.thirdParty.payment', 'Payment Processing')}
                    </h4>
                    <ul className={`space-y-1 text-gray-600 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <li>• Stripe (secure payment processing)</li>
                      <li>• PayPal</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className={`font-medium text-eerie-black mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                      {t('cookies.thirdParty.analytics', 'Analytics Partners')}
                    </h4>
                    <ul className={`space-y-1 text-gray-600 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                      <li>• Google Analytics</li>
                      <li>• Firebase Analytics</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Managing Cookies */}
              <div className="bg-gray-50 rounded-lg p-6 lg:p-8 mb-8">
                <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.managing.title', 'Managing Your Cookie Preferences')}
                </h2>
                <p className={`text-gray-600 leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.managing.p1', 'You can control cookies through your browser settings. Here\'s how to manage cookies in popular browsers:')}
                </p>
                <ul className={`space-y-2 text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <li>• <strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                  <li>• <strong>Firefox:</strong> Preferences → Privacy & Security → Cookies</li>
                  <li>• <strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                  <li>• <strong>Edge:</strong> Settings → Cookies and site permissions</li>
                </ul>
                <p className={`text-gray-600 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.managing.note', 'Note: Disabling cookies may affect the functionality of our website and services.')}
                </p>
              </div>

              {/* Contact Section */}
              <div className="bg-tufts-blue/5 rounded-lg p-6 lg:p-8">
                <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.contact.title', 'Contact Us')}
                </h2>
                <p className={`text-gray-600 leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.contact.description', 'If you have any questions about our Cookie Policy or how we use cookies, please contact us:')}
                </p>
                <div className={`space-y-2 text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p><strong>Simnetiq Ltd</strong></p>
                  <p>London, United Kingdom</p>
                  <p>
                    Email:{' '}
                    <a href="mailto:support@simnetiq.store" className="text-tufts-blue hover:underline">
                      support@simnetiq.store
                    </a>
                  </p>
                </div>
                <div className={`mt-6 flex gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <Link 
                    href="/privacy-policy" 
                    className="text-tufts-blue hover:text-tufts-blue/80 text-sm font-medium underline-offset-2 hover:underline"
                  >
                    {t('cookies.links.privacy', 'Privacy Policy')}
                  </Link>
                  <Link 
                    href="/terms-of-service" 
                    className="text-tufts-blue hover:text-tufts-blue/80 text-sm font-medium underline-offset-2 hover:underline"
                  >
                    {t('cookies.links.terms', 'Terms of Service')}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
