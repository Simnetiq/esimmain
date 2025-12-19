'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import { usePathname } from 'next/navigation';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import Link from 'next/link';
import { Shield, BarChart, Settings, Globe, AlertCircle, ExternalLink } from 'lucide-react';

const CookiePolicy = () => {
  const pathname = usePathname();
  const { locale, t } = useI18n();
  
  const detectedLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(detectedLanguage) === 'rtl';

  const cookieTypes = [
    {
      IconComponent: Shield,
      title: t('cookies.essential.title', 'Essential Cookies'),
      description: t('cookies.essential.description', 'Required for basic website functionality and security'),
      examples: [
        t('cookies.essential.example1', 'Authentication and login sessions'),
        t('cookies.essential.example2', 'Security and fraud prevention (Stripe payment processing)'),
        t('cookies.essential.example3', 'Shopping cart and checkout process'),
        t('cookies.essential.example4', 'Language and region preferences')
      ],
      canDisable: false,
      legalBasis: 'Contract performance (GDPR Art. 6(1)(b))'
    },
    {
      IconComponent: BarChart,
      title: t('cookies.analytics.title', 'Analytics Cookies'),
      description: t('cookies.analytics.description', 'Help us understand how visitors use our website'),
      examples: [
        t('cookies.analytics.example1', 'Google Analytics for traffic analysis'),
        t('cookies.analytics.example2', 'Google Tag Manager for tag management'),
        t('cookies.analytics.example3', 'Performance monitoring and optimization'),
        t('cookies.analytics.example4', 'User behavior tracking and conversion analysis')
      ],
      canDisable: true,
      legalBasis: 'Consent (GDPR Art. 6(1)(a))',
      providers: ['Google Analytics', 'Google Tag Manager']
    },
    {
      IconComponent: Settings,
      title: t('cookies.functional.title', 'Functional Cookies'),
      description: t('cookies.functional.description', 'Enhance your experience with personalized features'),
      examples: [
        t('cookies.functional.example1', 'Remember your preferences and settings'),
        t('cookies.functional.example2', 'Personalized content recommendations'),
        t('cookies.functional.example3', 'Customer support chat widget'),
        t('cookies.functional.example4', 'Social media integration features')
      ],
      canDisable: true,
      legalBasis: 'Consent (GDPR Art. 6(1)(a))'
    },
    {
      IconComponent: Globe,
      title: t('cookies.marketing.title', 'Marketing Cookies'),
      description: t('cookies.marketing.description', 'Used to deliver relevant advertisements'),
      examples: [
        t('cookies.marketing.example1', 'Meta Pixel (Facebook/Instagram) for targeted advertising'),
        t('cookies.marketing.example2', 'Conversion tracking and attribution'),
        t('cookies.marketing.example3', 'Retargeting and remarketing campaigns'),
        t('cookies.marketing.example4', 'Cross-device tracking for ad personalization')
      ],
      canDisable: true,
      legalBasis: 'Consent (GDPR Art. 6(1)(a))',
      providers: ['Meta Pixel', 'Facebook', 'Instagram']
    }
  ];

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="relative">
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
                {t('cookies.intro', 'This Cookie Policy explains how Simnetiq Ltd ("we", "us", or "our") uses cookies and similar technologies when you visit our website and use our services. This policy complies with GDPR and other applicable privacy laws.')}
              </p>
              <p className={`text-sm text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('cookies.lastUpdated', 'Last updated')}: January 1, 2025
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
                  {t('cookies.whatAreCookies.p2', 'Simnetiq uses cookies and similar technologies (such as URL tracking, local storage, and pixel tags). Throughout this Cookie Policy, we refer to all of these technologies as "cookies".')}
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
                        
                        <ul className="space-y-2 mb-3">
                          {type.examples.map((example, exIndex) => (
                            <li key={exIndex} className={`flex items-start gap-2 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                              <div className="w-1.5 h-1.5 bg-tufts-blue rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{example}</span>
                            </li>
                          ))}
                        </ul>

                        {type.legalBasis && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              <strong>Legal Basis:</strong> {type.legalBasis}
                            </p>
                          </div>
                        )}

                        {type.providers && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">
                              <strong>Providers:</strong> {type.providers.join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="pointer-events-none absolute inset-px rounded-lg ring-1 ring-black/5" />
                    </div>
                  );
                })}
              </div>

              {/* Detailed Third-Party Cookie Information */}
              <div className="bg-gray-50 rounded-lg p-6 lg:p-8 mb-8">
                <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Detailed Third-Party Cookie Information
                </h2>

                {/* Meta Pixel */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className={`text-lg font-semibold text-eerie-black mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Meta Pixel (Facebook/Instagram)
                  </h3>
                  <div className="space-y-2 text-gray-600 text-sm">
                    <p><strong>Purpose:</strong> Advertising, conversion tracking, ad targeting, and measurement</p>
                    <p><strong>Data Collected:</strong> Page views, purchases, events, device information, IP addresses, cookie IDs, browser information</p>
                    <p><strong>Retention:</strong> Up to 2 years (as per Meta&apos;s data retention policy)</p>
                    <p><strong>Location:</strong> Data processed in Ireland (EU) and United States</p>
                    <p><strong>Legal Basis:</strong> Consent (GDPR Art. 6(1)(a)) - <strong>Opt-in required</strong></p>
                    <p><strong>Consent Management:</strong> We require explicit opt-in consent before loading Meta Pixel. If you do not consent, Meta Pixel will not be loaded (GDPR-compliant). You can revoke consent at any time.</p>
                    <p><strong>CCPA Notice:</strong> California residents: Meta Pixel may constitute a sale of personal information under CCPA. You have the right to opt-out.</p>
                    <p>
                      <strong>More Information:</strong>{' '}
                      <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline inline-flex items-center gap-1">
                        Meta Privacy Policy <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* Google Analytics */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <h3 className={`text-lg font-semibold text-eerie-black mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Google Analytics & Google Tag Manager
                  </h3>
                  <div className="space-y-2 text-gray-600 text-sm">
                    <p><strong>Purpose:</strong> Website analytics, performance monitoring, user behavior analysis, conversion tracking</p>
                    <p><strong>Data Collected:</strong> IP addresses (anonymized), device IDs, user behavior, page views, events, session duration, referrer information, cookies</p>
                    <p><strong>Retention:</strong> 26 months (default, configurable)</p>
                    <p><strong>Location:</strong> Data processed in United States (with EU entities)</p>
                    <p><strong>Legal Basis:</strong> Consent (GDPR Art. 6(1)(a)) for non-essential analytics</p>
                    <p><strong>IP Anonymization:</strong> IP addresses are anonymized before processing</p>
                    <p><strong>Restricted Data Processing:</strong> We enable restricted data processing mode where available</p>
                    <p><strong>Consent Management:</strong> Non-essential Google Tags require your consent. You can manage consent through cookie preferences.</p>
                    <p><strong>International Transfer:</strong> Data transferred to US under Data Privacy Framework or Standard Contractual Clauses</p>
                    <p>
                      <strong>More Information:</strong>{' '}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline inline-flex items-center gap-1">
                        Google Privacy Policy <ExternalLink className="w-3 h-3" />
                      </a>
                      {' '}|{' '}
                      <a href="https://business.safety.google/adsprocessorterms/" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline inline-flex items-center gap-1">
                        Google Data Processing Terms <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>

                {/* Stripe Cookies */}
                <div className="mb-6">
                  <h3 className={`text-lg font-semibold text-eerie-black mb-3 ${isRTL ? 'text-right' : 'text-left'}`}>
                    Stripe (Payment Processing)
                  </h3>
                  <div className="space-y-2 text-gray-600 text-sm">
                    <p><strong>Purpose:</strong> Secure payment processing, fraud prevention, checkout functionality</p>
                    <p><strong>Data Collected:</strong> Payment information, device fingerprinting, IP addresses, transaction data</p>
                    <p><strong>Retention:</strong> As required by Stripe&apos;s legal and regulatory obligations</p>
                    <p><strong>Location:</strong> Data processed in United States (with EU entities)</p>
                    <p><strong>Legal Basis:</strong> Contract performance (GDPR Art. 6(1)(b)) - Essential for payment processing</p>
                    <p><strong>Security:</strong> PCI DSS Level 1 compliant</p>
                    <p>
                      <strong>More Information:</strong>{' '}
                      <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline inline-flex items-center gap-1">
                        Stripe Privacy Policy <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Consent Management */}
              <div className="bg-blue-50 rounded-lg p-6 lg:p-8 mb-8">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-6 h-6 text-tufts-blue mr-3" />
                  <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>
                    Consent Management (GDPR Compliance)
                  </h2>
                </div>
                <div className={`space-y-3 text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p>
                    <strong>Opt-In Required:</strong> We require your explicit opt-in consent before loading non-essential 
                    cookies and tracking technologies (Meta Pixel, Google Analytics, marketing cookies).
                  </p>
                  <p>
                    <strong>Consent Withdrawal:</strong> You can withdraw your consent at any time through:
                  </p>
                  <ul className="space-y-1 ml-4">
                    <li>• Cookie preferences in your account settings</li>
                    <li>• Browser cookie settings</li>
                    <li>• Cookie consent banner (if available)</li>
                  </ul>
                  <p>
                    <strong>No Consent Impact:</strong> If you do not consent to non-essential cookies, they will not 
                    be loaded. Essential cookies (required for basic functionality) cannot be disabled.
                  </p>
                  <p>
                    <strong>Granular Control:</strong> You can choose which types of cookies to accept (analytics, marketing, functional).
                  </p>
                </div>
              </div>

              {/* Managing Cookies */}
              <div className="bg-gray-50 rounded-lg p-6 lg:p-8 mb-8">
                <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.managing.title', 'Managing Your Cookie Preferences')}
                </h2>
                <p className={`text-gray-600 leading-relaxed mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.managing.p1', 'You can control cookies through your browser settings or our cookie preferences. Here\'s how to manage cookies in popular browsers:')}
                </p>
                <ul className={`space-y-2 text-gray-600 text-sm mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <li>• <strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                  <li>• <strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
                  <li>• <strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                  <li>• <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
                  <li>• <strong>Opera:</strong> Settings → Privacy & Security → Cookies</li>
                </ul>
                <p className={`text-gray-600 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('cookies.managing.note', 'Note: Disabling cookies may affect the functionality of our website and services. Essential cookies are required for basic functionality and cannot be disabled.')}
                </p>
              </div>

              {/* Cookie Retention */}
              <div className="bg-gray-50 rounded-lg p-6 lg:p-8 mb-8">
                <h2 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  Cookie Retention Periods
                </h2>
                <div className={`space-y-3 text-gray-600 text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p><strong>Session Cookies:</strong> Deleted when you close your browser</p>
                  <p><strong>Persistent Cookies:</strong> Remain on your device for a set period:</p>
                  <ul className="space-y-1 ml-4">
                    <li>• Essential cookies: Up to 1 year</li>
                    <li>• Analytics cookies: Up to 26 months (Google Analytics default)</li>
                    <li>• Marketing cookies: Up to 2 years (Meta Pixel)</li>
                    <li>• Functional cookies: Up to 1 year</li>
                  </ul>
                  <p>You can delete cookies at any time through your browser settings.</p>
                </div>
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
                  <p>Germany</p>
                  <p>
                    Email:{' '}
                    <a href="mailto:support@simnetiq.store" className="text-tufts-blue hover:underline">
                      support@simnetiq.store
                    </a>
                  </p>
                </div>
                <div className={`mt-6 flex gap-4 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
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
                  <Link 
                    href="/return-policy" 
                    className="text-tufts-blue hover:text-tufts-blue/80 text-sm font-medium underline-offset-2 hover:underline"
                  >
                    Return Policy
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
