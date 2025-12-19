"use client";

import React from 'react';
import { FileText, Users, CreditCard, Shield, Scale, RefreshCw, Smartphone, Globe, Lock, UserCheck, MessageSquare, Mail, AlertTriangle, Ban, UserX } from 'lucide-react';
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
        "You must be at least 13 years old to use our services (as required by Stripe and other third-party providers)",
        "Users under 18 must have parental consent and supervision"
      ]
    },
    {
      icon: Smartphone,
      title: "2. Service Description",
      content: [
        "Simnetiq provides eSIM data plans and mobile connectivity solutions for international travel",
        "Our services include eSIM profile downloads, data plan activation, and customer support",
        "Service availability varies by destination and is subject to local network coverage",
        "We partner with Airalo and other mobile network operators worldwide to provide connectivity services",
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
      title: "4. Pricing, Payments, and Third-Party Payment Processing",
      content: [
        "All prices are displayed in USD and may include applicable taxes and fees",
        "Payment is required in full before service activation",
        "We use Stripe, Inc. ('Stripe') as our payment processor (https://stripe.com/legal). By using our services, you agree to Stripe's Terms of Service (https://stripe.com/legal/ssa) and Privacy Policy (https://stripe.com/privacy), and authorize data sharing for payment processing",
        "Stripe processes all payment card details, billing information, and IP addresses. We do not store payment card information",
        "Payment processing fees may apply and are non-refundable",
        "All sales are final - no refunds or exchanges (see Section 8 for details)",
        "We reserve the right to change prices with 30 days notice to existing customers",
        "Failed payments may result in service suspension or account termination",
        "We are not liable for payment processing failures, declined transactions, or issues arising from Stripe's services"
      ]
    },
    {
      icon: Shield,
      title: "5. Acceptable Use Policy and Third-Party Service Restrictions",
      content: [
        "You may only use our services for lawful purposes and in compliance with local laws",
        "Prohibited activities include: illegal content, spam, hacking, or network abuse",
        "You may not resell, redistribute, or share eSIM profiles with others",
        "Excessive usage that impacts network performance may result in service limitation",
        "You are responsible for all activity that occurs under your account",
        "You agree to comply with Airalo's Terms of Service when using eSIM services provided through their platform",
        "You agree to comply with Stripe's Acceptable Use Policy for payment processing",
        "Reverse engineering, decompiling, or attempting to extract API keys or service credentials is strictly prohibited",
        "You must not violate terms of our third-party providers, including Airalo (https://www.airalo.com/terms-conditions), Stripe (https://stripe.com/legal/ssa), Meta (https://www.facebook.com/legal/terms), and Google (https://policies.google.com/terms)"
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
        "Emergency services (911, etc.) may not be available through our eSIM services",
        "Service availability is subject to Airalo's network coverage and service terms"
      ]
    },
    {
      icon: Lock,
      title: "7. Privacy, Data Protection, and Tracking Consent",
      content: [
        "Your privacy is important to us - see our Privacy Policy for detailed information",
        "We collect and process personal data necessary to provide our services in compliance with GDPR",
        "We implement appropriate security measures to protect your information",
        "We share data with third-party service providers (Airalo, Stripe, Meta, Google) as necessary to provide services",
        "You have rights regarding your personal data as outlined in our Privacy Policy",
        "By using our services, you acknowledge our Privacy Policy, which details use of Meta Pixel and Google Tags for analytics/advertising. These require your explicit opt-in consent (Art. 6(1)(a) GDPR)",
        "Data shared with Airalo includes profiles/purchase details; with Stripe, payment/billing/IP data; with Meta/Google, event/behavior data for legitimate interests (Art. 6(1)(f) GDPR) where consented",
        "You may revoke tracking consent at any time through your account settings or cookie preferences",
        "We require explicit opt-in consent before loading non-essential tracking pixels and tags (GDPR-compliant)",
        "If you do not consent to tracking, certain features may be limited or unavailable",
        "Our Privacy Policy expands on processors, transfers (e.g., US via Data Privacy Framework), and your rights"
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
        "In exceptional circumstances, we may provide service credits at our sole discretion",
        "Refund requests related to payment processing issues should be directed to Stripe in accordance with their policies"
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
    },
    {
      icon: AlertTriangle,
      title: "11. Limitation of Liability",
      content: [
        "We are not liable for third-party service failures (Airalo networks, Stripe payments, Meta/Google tracking)",
        "Total liability limited to amount paid in last 12 months",
        "No liability for indirect damages or service interruptions"
      ]
    },
    {
      icon: UserX,
      title: "12. Termination",
      content: [
        "We may terminate for violations of these terms or provider policies",
        "You may terminate anytime; no refunds for digital eSIMs"
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
                Effective Date: August 1, 2025 | Last Updated: December 19, 2025
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
                  website, and mobile applications provided by Simnetiq Ltd, a company incorporated in the United Kingdom 
                  (&quot;Simnetiq&quot;, &quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  By accessing our website, using our mobile application, or purchasing our eSIM services, 
                  you (&quot;User&quot;, &quot;Customer&quot;, &quot;you&quot;) agree to be bound by these Terms and our Privacy Policy, 
                  which is incorporated herein by reference.
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  Our services include digital eSIM profiles, international data plans, mobile connectivity solutions, 
                  customer support, and related telecommunications services for travelers and mobile users worldwide.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Important:</strong> By using our services, you also agree to the terms and conditions 
                    of our third-party service providers, including but not limited to Airalo (eSIM services), 
                    Stripe (payment processing), Meta (advertising), and Google (analytics). These providers' 
                    terms are incorporated by reference.
                  </p>
                </div>
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

          {/* Third-Party Service Providers */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-4">
                  <Globe className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">11. Third-Party Service Providers</h2>
                </div>
                <div className="space-y-4 text-cool-black">
                  <div>
                    <p className="font-semibold mb-2">Airalo API Integration</p>
                    <p className="mb-2">
                      Our eSIM services are provided through integration with Airalo, a Singapore-based eSIM provider. 
                      By using our services, you agree to Airalo&apos;s Terms of Service and Privacy Policy. 
                      We share necessary user data (profiles, purchase details, contact information) with Airalo 
                      to facilitate eSIM delivery and activation.
                    </p>
                    <p>
                      <strong>Your consent:</strong> By purchasing an eSIM, you consent to this data sharing as 
                      required for service delivery. Airalo acts as a data processor for eSIM services.
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-semibold mb-2">Stripe Payment Processing</p>
                    <p className="mb-2">
                      We use Stripe, Inc. as our payment processor. Stripe handles all payment card details, 
                      billing information, and IP addresses in accordance with their Data Processing Agreement (DPA) 
                      and Privacy Policy. We do not store payment card information on our servers.
                    </p>
                    <p className="mb-2">
                      <strong>Data Controller/Processor:</strong> We are the data controller, and Stripe is the 
                      data processor for payment processing. Stripe processes payments in compliance with PCI DSS 
                      standards and applicable data protection laws.
                    </p>
                    <p>
                      <strong>Links:</strong> Stripe&apos;s DPA: <a href="https://stripe.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline">https://stripe.com/legal/dpa</a> | 
                      Privacy Policy: <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline">https://stripe.com/privacy</a>
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold mb-2">Meta Pixel (Facebook/Instagram)</p>
                    <p className="mb-2">
                      We use Meta Pixel for advertising and conversion tracking. Meta Pixel collects data about 
                      page views, purchases, and other events, which is sent to Meta (Ireland/US). 
                      This data is used for ad targeting, measurement, and optimization.
                    </p>
                    <p className="mb-2">
                      <strong>Consent Required:</strong> We require your explicit opt-in consent before loading 
                      Meta Pixel. If you do not consent, Meta Pixel will not be loaded (GDPR-compliant). 
                      You can revoke consent at any time through your cookie preferences.
                    </p>
                    <p>
                      <strong>CCPA Notice:</strong> California residents have the right to opt-out of the 
                      sale of personal information. Meta Pixel may constitute a sale under CCPA.
                    </p>
                  </div>

                  <div>
                      <p className="font-semibold mb-2">Google Tags (Analytics/Tag Manager)</p>
                    <p className="mb-2">
                      We use Google Analytics and Google Tag Manager for website analytics. These services collect 
                      data including IP addresses, device IDs, and user behavior. Google acts as a data processor.
                    </p>
                    <p className="mb-2">
                      <strong>Consent Required:</strong> Non-essential Google Tags require your consent. 
                      We enable restricted data processing mode where available. You can manage consent through 
                      cookie preferences.
                    </p>
                    <p>
                      <strong>Data Processing:</strong> Google processes data in accordance with their Data 
                      Processing Terms. Some data may be transferred to the United States under appropriate 
                      safeguards (Data Privacy Framework or Standard Contractual Clauses).
                    </p>
                  </div>

                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg mt-4">
                    <p className="text-amber-800 text-sm">
                      <strong>Limitation of Liability:</strong> We are not liable for failures, errors, or 
                      issues arising from third-party services (Airalo, Stripe, Meta, Google). Your use of 
                      these services is subject to their respective terms and conditions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Intellectual Property */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">12. Intellectual Property Rights</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  All content, features, and functionality of our services, including but not limited to 
                  text, graphics, logos, images, and software, are owned by Simnetiq Ltd or our licensors 
                  and are protected by copyright, trademark, and other intellectual property laws.
                </p>
                <ul className="space-y-2 text-cool-black">
                  <li>• You may not reproduce, distribute, or create derivative works without permission</li>
                  <li>• Our trademarks and service marks may not be used without prior written consent</li>
                  <li>• Any feedback or suggestions you provide may be used by us without compensation</li>
                  <li>• You may not reverse-engineer, decompile, or attempt to extract API keys or credentials from our services</li>
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
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">13. Device Compatibility and Technical Requirements</h2>
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
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">14. Limitation of Liability and Disclaimers</h2>
                </div>
                <div className="space-y-4 text-cool-black">
                  <p>
                    <strong>Service Disclaimers:</strong> Our services are provided &quot;as is&quot; without warranties of any kind. 
                    We do not guarantee uninterrupted service, specific data speeds, or coverage in all areas.
                  </p>
                  <p>
                    <strong>Third-Party Service Disclaimers:</strong> We are not liable for failures, errors, 
                    data breaches, or issues arising from third-party services including but not limited to Airalo, 
                    Stripe, Meta, or Google. Your use of these services is at your own risk.
                  </p>
                  <p>
                    <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, Simnetiq Ltd&apos;s 
                    total liability shall not exceed the amount you paid for the specific service giving rise to the claim.
                  </p>
                  <p>
                    <strong>Excluded Damages:</strong> We shall not be liable for indirect, incidental, special, 
                    consequential, or punitive damages, including loss of profits, data, or business opportunities.
                  </p>
                  <p>
                    <strong>Indemnification:</strong> You agree to indemnify and hold harmless Simnetiq Ltd, its 
                    officers, directors, employees, and agents from any claims, damages, losses, or expenses 
                    (including legal fees) arising from your violation of these Terms or any third-party service provider terms.
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

          {/* Termination */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-4">
                  <Ban className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">15. Termination</h2>
                </div>
                <div className="space-y-4 text-cool-black">
                  <p>
                    <strong>Termination by You:</strong> You may terminate your account at any time by contacting 
                    customer support or using account deletion features in your account settings.
                  </p>
                  <p>
                    <strong>Termination by Us:</strong> We reserve the right to suspend or terminate your account 
                    immediately, without prior notice, if you:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• Violate these Terms of Service or any third-party service provider terms</li>
                    <li>• Engage in fraudulent, illegal, or abusive activity</li>
                    <li>• Fail to comply with payment obligations</li>
                    <li>• Misuse our services or third-party integrations</li>
                    <li>• Reverse-engineer or attempt to extract API credentials</li>
                  </ul>
                  <p>
                    <strong>Effect of Termination:</strong> Upon termination, your right to use our services 
                    will immediately cease. We may delete your account data in accordance with our Privacy Policy 
                    and applicable data retention requirements.
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
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">16. Governing Law and Dispute Resolution</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    <strong>Governing Law:</strong> These Terms are governed by and construed in accordance with 
                    the laws of the United Kingdom, without regard to conflict of law principles. As a United Kingdom-based company, 
                    we are subject to United Kingdom data protection laws including GDPR.
                  </p>
                  <p>
                    <strong>Jurisdiction:</strong> The courts of the United Kingdom shall have exclusive jurisdiction 
                    over any disputes arising from these Terms or our services, subject to mandatory consumer 
                    protection laws in your jurisdiction.
                  </p>
                  <p>
                    <strong>Dispute Resolution:</strong> Before initiating any legal proceedings, you agree to first 
                    contact our customer support team to attempt resolution. We are committed to resolving disputes 
                    fairly and efficiently.
                  </p>
                  <p>
                    <strong>Consumer Rights:</strong> Nothing in these Terms affects your statutory consumer rights 
                    under applicable consumer protection laws, including EU consumer protection directives.
                  </p>
                  <p>
                    <strong>GDPR Rights:</strong> If you are located in the EEA, you have specific rights under GDPR 
                    regarding your personal data. See our Privacy Policy for details on exercising these rights.
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
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">17. Contact Information</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    If you have any questions about these Terms of Service or need to contact us regarding 
                    our services, please reach out through the following channels:
                  </p>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <strong>Company:</strong> Simnetiq Ltd<br />
                        <strong>Address:</strong> 2 Frederick Street, Kings Cross<br />
                                London<br />
                                WC1X 0ND<br />
                                United Kingdom <br />
                        <strong>Email:</strong> support@simnetiq.store<br />
                        <strong>Customer Support:</strong> support@simnetiq.store
                      </div>
                      <div className="pt-2">
                        <strong>Business Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM CET<br />
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
