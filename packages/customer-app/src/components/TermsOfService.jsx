"use client";

import React from 'react';
import { FileText, Users, CreditCard, Shield, Scale, RefreshCw, Smartphone, Globe, Lock, UserCheck, MessageSquare, Mail } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import BlogAppDownload from './BlogAppDownload';

const TermsOfService = () => {
  const pathname = usePathname();
  const { locale } = useI18n();
  
  // Get current language for RTL detection
  const getCurrentLanguage = () => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname);
  };

  const currentLanguage = getCurrentLanguage();
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  const sections = [
    {
      icon: UserCheck,
      title: "1. Acceptance and Scope",
      content: [
        "By creating an account, downloading our app, or using our services, you agree to be bound by these Terms of Service",
        "These terms apply to all users of Simnetiq services, including website visitors, app users, and customers",
        "If you do not agree to these terms, you must not use our services",
        "We may update these terms from time to time. Continued use constitutes acceptance of updated terms",
        "You must be at least 18 years old or have parental consent to use our services"
      ]
    },
    {
      icon: Smartphone,
      title: "2. Service Description",
      content: [
        "Simnetiq provides eSIM data plans and mobile connectivity solutions for international travel",
        "Our services include eSIM profile downloads, data plan activation, and customer support",
        "Service availability varies by destination and is subject to local network coverage",
        "We partner with mobile network operators worldwide to provide connectivity services",
        "Data plans are delivered digitally and activated on compatible eSIM-enabled devices"
      ]
    },
    {
      icon: Users,
      title: "3. Account Registration and Management",
      content: [
        "You must provide accurate, current, and complete information during registration",
        "You are responsible for maintaining the security of your account credentials",
        "You must notify us immediately of any unauthorized use of your account",
        "One account per person - sharing accounts is prohibited",
        "We reserve the right to suspend or terminate accounts that violate these terms"
      ]
    },
    {
      icon: CreditCard,
      title: "4. Pricing, Payments, and Billing",
      content: [
        "All prices are displayed in USD and may include applicable taxes and fees",
        "Payment is required in full before service activation",
        "We accept major credit cards, debit cards, and other payment methods as displayed",
        "All sales are final - no refunds or exchanges (see Section 8 for details)",
        "We reserve the right to change prices with 30 days notice to existing customers",
        "Failed payments may result in service suspension or account termination"
      ]
    },
    {
      icon: Shield,
      title: "5. Acceptable Use Policy",
      content: [
        "You may only use our services for lawful purposes and in compliance with local laws",
        "Prohibited activities include: illegal content, spam, hacking, or network abuse",
        "You may not resell, redistribute, or share eSIM profiles with others",
        "Excessive usage that impacts network performance may result in service limitation",
        "You are responsible for all activity that occurs under your account"
      ]
    },
    {
      icon: Globe,
      title: "6. Service Availability and Performance",
      content: [
        "Service coverage depends on local network infrastructure and may vary by location",
        "Data speeds are subject to network conditions and local operator limitations",
        "We do not guarantee specific data speeds or uninterrupted service",
        "Service may be temporarily unavailable due to maintenance or technical issues",
        "Emergency services (911, etc.) may not be available through our eSIM services"
      ]
    },
    {
      icon: Lock,
      title: "7. Privacy and Data Protection",
      content: [
        "Your privacy is important to us - see our Privacy Policy for detailed information",
        "We collect and process personal data necessary to provide our services",
        "We implement appropriate security measures to protect your information",
        "We may share data with network partners as necessary to provide connectivity",
        "You have rights regarding your personal data as outlined in our Privacy Policy"
      ]
    },
    {
      icon: RefreshCw,
      title: "8. Refunds and Cancellations",
      content: [
        "All eSIM purchases are final sale with no refunds or exchanges",
        "Due to the digital nature of eSIM products, all sales are considered final upon purchase",
        "Unused data does not roll over and expires according to plan terms",
        "Technical support is available for activation issues, but no monetary refunds are provided",
        "In exceptional circumstances, we may provide service credits at our sole discretion"
      ]
    },
    {
      icon: MessageSquare,
      title: "9. SMS and Text Message Communications",
      content: [
        "By providing your phone number, you consent to receive SMS/text messages from Simnetiq",
        "Message frequency varies based on your account activity and service updates",
        "Message and data rates may apply based on your mobile carrier's plan",
        "Text STOP to opt-out of SMS communications at any time",
        "Text HELP for customer support assistance via SMS",
        "We may send transactional messages (order confirmations, eSIM activation codes) even if you opt-out of marketing",
        "Carriers are not liable for delayed or undelivered messages",
        "We reserve the right to modify or discontinue SMS services with notice"
      ]
    },
    {
      icon: Mail,
      title: "10. Email Marketing and Communications",
      content: [
        "By providing your email address, you consent to receive promotional and marketing emails from Simnetiq",
        "We may send you newsletters, special offers, product updates, and travel tips",
        "Email frequency may vary but typically ranges from weekly to monthly communications",
        "You can unsubscribe from marketing emails at any time by clicking the 'Unsubscribe' link in any email",
        "Transactional emails (receipts, eSIM delivery, account notifications) cannot be opted out of",
        "We will not sell, rent, or share your email address with third parties for their marketing purposes",
        "Your email preferences can be managed in your account settings",
        "Even after unsubscribing from marketing emails, we may still send service-related communications"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-white py-24">
      {/* Header Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="text-center">
            <h2 className="text-center text-xl font-semibold text-tufts-blue">
              <span>{'{ '}</span>
              Legal Information
              <span>{' }'}</span>
            </h2>
            <p className="mx-auto mt-12 max-w-4xl text-center text-4xl font-semibold tracking-tight text-eerie-black sm:text-5xl">
              Terms of Service
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-cool-black">
              These Terms of Service govern your use of Simnetiq&apos;s eSIM services and platform. 
              Please read them carefully as they contain important information about your rights and obligations.
            </p>
            <div className="flex items-center justify-center mt-8">
              <FileText className="w-8 h-8 text-tufts-blue mr-2" />
              <p className="text-sm text-cool-black">
                Effective Date: January 1, 2025 | Last Updated: October 8, 2025
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8 mt-6">
          
          {/* Introduction */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Agreement Overview</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  These Terms of Service (&quot;Terms&quot;, &quot;Agreement&quot;) govern your use of the eSIM services, 
                  website, and mobile applications provided by Holylabs Ltd, a company incorporated in England and Wales 
                  (&quot;Simnetiq&quot;, &quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  By accessing our website at Simnetiq.com, using our mobile application, or purchasing our eSIM services, 
                  you (&quot;User&quot;, &quot;Customer&quot;, &quot;you&quot;) agree to be bound by these Terms and our Privacy Policy, 
                  which is incorporated herein by reference.
                </p>
                <p className="text-cool-black leading-relaxed">
                  Our services include digital eSIM profiles, international data plans, mobile connectivity solutions, 
                  customer support, and related telecommunications services for travelers and mobile users worldwide.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Main Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {sections.map((section, index) => {
              const IconComponent = section.icon;
              return (
                <div
                  key={index}
                  className="relative"
                >
                  <div className="absolute inset-px rounded-xl bg-white"></div>
                  <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
                    <div className="px-8 pt-8 pb-8">
                      <div className="flex items-center mb-6">
                        <div className="w-12 h-12 bg-tufts-blue/10 rounded-xl flex items-center justify-center mr-4">
                          <IconComponent className="w-6 h-6 text-tufts-blue" />
                        </div>
                        <h2 className="text-xl font-medium tracking-tight text-eerie-black">{section.title}</h2>
                      </div>
                      <ul className="space-y-3">
                        {section.content.map((item, itemIndex) => (
                          <li key={itemIndex} className="flex items-start">
                            <div className="w-2 h-2 bg-tufts-blue rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <span className="text-cool-black leading-relaxed">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
                </div>
              );
            })}
          </div>

          {/* Intellectual Property */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Intellectual Property Rights</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  All content, features, and functionality of our services, including but not limited to 
                  text, graphics, logos, images, and software, are owned by Holylabs Ltd or our licensors 
                  and are protected by copyright, trademark, and other intellectual property laws.
                </p>
                <ul className="space-y-2 text-cool-black">
                  <li>• You may not reproduce, distribute, or create derivative works without permission</li>
                  <li>• Our trademarks and service marks may not be used without prior written consent</li>
                  <li>• Any feedback or suggestions you provide may be used by us without compensation</li>
                </ul>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Device Compatibility */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">11. Device Compatibility and Technical Requirements</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    Our eSIM services require compatible devices and software. You are responsible for ensuring 
                    your device meets the following requirements:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• eSIM-enabled smartphone or tablet with carrier unlock capability</li>
                    <li>• Compatible operating system (iOS 12.1+ or Android 9+)</li>
                    <li>• Active internet connection for eSIM profile download and activation</li>
                    <li>• Device must not be reported as lost, stolen, or blocked by any carrier</li>
                  </ul>
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg">
                    <p className="text-amber-800 text-sm">
                      <strong>Note:</strong> We are not responsible for compatibility issues or technical problems 
                      arising from device limitations, software conflicts, or network restrictions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Limitation of Liability */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-4">
                  <Scale className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">12. Limitation of Liability and Disclaimers</h2>
                </div>
                <div className="space-y-4 text-cool-black">
                  <p>
                    <strong>Service Disclaimers:</strong> Our services are provided &quot;as is&quot; without warranties of any kind. 
                    We do not guarantee uninterrupted service, specific data speeds, or coverage in all areas.
                  </p>
                  <p>
                    <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, Holylabs Ltd&apos;s 
                    total liability shall not exceed the amount you paid for the specific service giving rise to the claim.
                  </p>
                  <p>
                    <strong>Excluded Damages:</strong> We shall not be liable for indirect, incidental, special, 
                    consequential, or punitive damages, including loss of profits, data, or business opportunities.
                  </p>
                </div>
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg mt-4">
                  <p className="text-red-800 text-sm">
                    <strong>Important:</strong> Emergency services (911, 112, etc.) may not be available through 
                    our eSIM services. Always ensure you have alternative means to contact emergency services when traveling.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Governing Law */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">13. Governing Law and Dispute Resolution</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    <strong>Governing Law:</strong> These Terms are governed by and construed in accordance with 
                    the laws of England and Wales, without regard to conflict of law principles.
                  </p>
                  <p>
                    <strong>Jurisdiction:</strong> The courts of England and Wales shall have exclusive jurisdiction 
                    over any disputes arising from these Terms or our services.
                  </p>
                  <p>
                    <strong>Dispute Resolution:</strong> Before initiating any legal proceedings, you agree to first 
                    contact our customer support team to attempt resolution. We are committed to resolving disputes 
                    fairly and efficiently.
                  </p>
                  <p>
                    <strong>Consumer Rights:</strong> Nothing in these Terms affects your statutory consumer rights 
                    under applicable consumer protection laws.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Contact Information */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">14. Contact Information</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    If you have any questions about these Terms of Service or need to contact us regarding 
                    our services, please reach out through the following channels:
                  </p>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <strong>Company:</strong> Holylabs Ltd<br />
                        <strong>Address:</strong> London, United Kingdom<br />
                        <strong>Email:</strong> legal@Simnetiq.com<br />
                        <strong>Customer Support:</strong> support@Simnetiq.com
                      </div>
                      <div className="pt-2">
                        <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM GMT<br />
                        <strong>Response Time:</strong> We aim to respond to all inquiries within 24-48 hours
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Related Policies */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Related Legal Documents</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    These Terms of Service should be read in conjunction with our other legal documents. 
                    Together, they form the complete legal framework governing your use of Simnetiq services:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <Link 
                      href="/privacy-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-tufts-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Privacy Policy</span>
                    </Link>
                    <Link 
                      href="/return-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <RefreshCw className="w-5 h-5" />
                      <span>Return Policy</span>
                    </Link>
                    <Link 
                      href="/cookie-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Cookie Policy</span>
                    </Link>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-6">
                    <p className="text-blue-800 text-sm">
                      <strong>Legal Notice:</strong> By using our services, you acknowledge that you have read, 
                      understood, and agree to be bound by all of these legal documents. If you have any questions 
                      about these terms, please contact our legal team before using our services.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* App Download CTA */}
          <BlogAppDownload 
            language={currentLanguage}
            isRTL={isRTL}
            location="terms_of_service"
            context={{
              page: 'terms_of_service'
            }}
          />

        </div>
      </section>
    </div>
  );
};

export default TermsOfService;
