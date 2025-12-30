import React from 'react';
import { Shield, Lock, Eye, Database, UserCheck, Mail, MessageSquare, Globe, AlertCircle, FileText, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const PrivacyPolicy = () => {
  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        "Personal information you provide when creating an account (name, email, phone number)",
        "Payment information processed securely through Stripe (we do not store payment card details)",
        "Device information and eSIM activation data",
        "Usage data and analytics to improve our services",
        "Communication preferences and support interactions",
        "IP addresses and location data for fraud prevention and service delivery",
        "Cookies and tracking data (with your consent) for analytics and advertising"
      ]
    },
    {
      icon: Eye,
      title: "How We Use Your Information",
      content: [
        "Provide and maintain our eSIM services through Airalo integration",
        "Process transactions and send service notifications",
        "Improve our products and customer experience",
        "Comply with legal obligations and prevent fraud",
        "Send marketing communications (with your explicit consent)",
        "Analyze website usage and optimize user experience",
        "Deliver targeted advertising (with your consent)"
      ]
    },
    {
      icon: Lock,
      title: "Data Protection & Security",
      content: [
        "Industry-standard encryption for all data transmission (TLS/SSL)",
        "Secure data centers with 24/7 monitoring",
        "Regular security audits and vulnerability assessments",
        "Limited access to personal data on a need-to-know basis",
        "Compliance with GDPR, CCPA, and other privacy regulations",
        "Data breach notification procedures (within 72 hours as required by GDPR)",
        "Secure payment processing through PCI DSS compliant Stripe"
      ]
    },
    {
      icon: UserCheck,
      title: "Your Rights Under GDPR and Other Privacy Laws",
      content: [
        "Right of Access: Request a copy of your personal information we hold",
        "Right to Rectification: Request correction of inaccurate data",
        "Right to Erasure: Request deletion of your account and associated data",
        "Right to Restrict Processing: Request limitation of data processing",
        "Right to Data Portability: Export your data in a machine-readable format",
        "Right to Object: Object to processing based on legitimate interests",
        "Right to Withdraw Consent: Revoke consent for marketing and tracking at any time",
        "Right to Lodge a Complaint: File a complaint with your local data protection authority"
      ]
    },
    {
      icon: Mail,
      title: "Email Marketing Communications",
      content: [
        "We use your email address to send promotional content, newsletters, and special offers",
        "You can opt-out of marketing emails via the unsubscribe link in each email",
        "We use email service providers to manage and send marketing campaigns",
        "We track email open rates and click-through rates to improve our communications",
        "Your email address will never be sold or shared with third parties for their marketing",
        "Transactional emails (receipts, eSIM delivery) are necessary and cannot be opted out",
        "We respect all opt-out requests and process them within 10 business days",
        "Legal basis: Consent (GDPR Art. 6(1)(a)) for marketing emails"
      ]
    },
    {
      icon: MessageSquare,
      title: "SMS and Text Messaging",
      content: [
        "By providing your phone number, you consent to receive SMS messages from us",
        "We send order confirmations, eSIM activation codes, and promotional offers via SMS",
        "Standard message and data rates may apply from your mobile carrier",
        "You can opt-out of SMS messages by replying STOP to any message",
        "We do not share your phone number with third parties for marketing purposes",
        "SMS messages are sent through secure third-party SMS gateway providers",
        "Message frequency varies based on your account activity and preferences",
        "Legal basis: Consent (GDPR Art. 6(1)(a)) for marketing SMS; Contract (Art. 6(1)(b)) for transactional SMS"
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
              Privacy & Security
              <span>{' }'}</span>
            </h2>
            <p className="mx-auto mt-12 max-w-4xl text-center text-4xl font-semibold tracking-tight text-eerie-black sm:text-5xl">
              Privacy Policy
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-cool-black">
              Learn how we collect, use, and protect your information. 
              We&apos;re committed to transparency and data security in compliance with GDPR.
            </p>
            <div className="flex items-center justify-center mt-8">
              <Shield className="w-8 h-8 text-tufts-blue mr-2" />
              <p className="text-sm text-cool-black">
                Last updated: January 1, 2025
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
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Introduction</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  At Simnetiq Ltd (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;), a German-based company, we are committed to protecting 
                  your privacy and ensuring the security of your personal information. This Privacy Policy explains 
                  how we collect, use, disclose, and safeguard your information when you use our eSIM services and website.
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  As a data controller under the General Data Protection Regulation (GDPR), we are responsible for 
                  ensuring that your personal data is processed lawfully, fairly, and transparently. This policy 
                  complies with GDPR requirements and other applicable data protection laws.
                </p>
                <p className="text-cool-black leading-relaxed">
                  By using our services, you agree to the collection and use of information in accordance with 
                  this Privacy Policy. If you do not agree with our policies and practices, please do not use our services.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Data Controller:</strong> Simnetiq Ltd, Germany. Contact: support@simnetiq.store
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

          {/* Legal Basis for Processing */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Legal Basis for Processing (GDPR Art. 6)</h2>
                <div className="space-y-4 text-cool-black">
                  <div>
                    <h3 className="font-semibold mb-2">Consent (Art. 6(1)(a))</h3>
                    <p>
                      We process your data for marketing communications, analytics cookies, and advertising 
                      (Meta Pixel, Google Tags) based on your explicit consent. You can withdraw consent at any time.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Contract Performance (Art. 6(1)(b))</h3>
                    <p>
                      We process your data to fulfill our contract with you, including eSIM delivery, 
                      payment processing, and customer support.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Legal Obligation (Art. 6(1)(c))</h3>
                    <p>
                      We process data to comply with legal obligations, including tax records, fraud prevention, 
                      and data retention requirements.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Legitimate Interests (Art. 6(1)(f))</h3>
                    <p>
                      We process data for legitimate business interests such as security, fraud prevention, 
                      and service improvement, balanced against your privacy rights.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Third-Party Service Providers */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-4">
                  <Globe className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">Third-Party Service Providers and Data Processors</h2>
                </div>
                <p className="text-cool-black leading-relaxed mb-4">
                  We share your personal data with trusted third-party service providers who act as data processors 
                  on our behalf. All processors are contractually bound to protect your data and comply with GDPR.
                </p>

                {/* Airalo */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-eerie-black mb-3">Airalo API (eSIM Services)</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-cool-black">
                    <p><strong>Role:</strong> Data Processor</p>
                    <p><strong>Location:</strong> Singapore</p>
                    <p><strong>Data Shared:</strong> User profiles, purchase details, contact information, device information</p>
                    <p><strong>Purpose:</strong> eSIM profile delivery, activation, and service management</p>
                    <p><strong>Legal Basis:</strong> Contract performance (GDPR Art. 6(1)(b))</p>
                    <p><strong>Retention:</strong> As required for service delivery and legal obligations</p>
                    <p><strong>International Transfer:</strong> Data transferred to Singapore under Standard Contractual Clauses (SCCs)</p>
                    <p><strong>Your Consent:</strong> By purchasing an eSIM, you consent to this data sharing as necessary for service delivery</p>
                    <p className="mt-2">
                      <strong>More Information:</strong> See Airalo&apos;s Terms of Service and Privacy Policy for details on their data handling practices.
                    </p>
                  </div>
                </div>

                {/* Stripe */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-eerie-black mb-3">Stripe (Payment Processing)</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-cool-black">
                    <p><strong>Role:</strong> Data Processor (we are the Controller)</p>
                    <p><strong>Location:</strong> United States (with EU entities)</p>
                    <p><strong>Data Processed:</strong> Payment card details, billing information, IP addresses, transaction data</p>
                    <p><strong>Purpose:</strong> Secure payment processing, fraud prevention, chargeback management</p>
                    <p><strong>Legal Basis:</strong> Contract performance (GDPR Art. 6(1)(b))</p>
                    <p><strong>Retention:</strong> As required by Stripe&apos;s legal and regulatory obligations (typically 7 years for financial records)</p>
                    <p><strong>International Transfer:</strong> Data transferred to US under Data Privacy Framework (DPF) or Standard Contractual Clauses</p>
                    <p><strong>Security:</strong> PCI DSS Level 1 compliant; we do not store payment card information on our servers</p>
                    <p className="mt-2">
                      <strong>Links:</strong>{' '}
                      <a href="https://stripe.com/legal/dpa" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline">
                        Stripe Data Processing Agreement
                      </a>{' '}
                      |{' '}
                      <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline">
                        Stripe Privacy Policy
                      </a>
                    </p>
                  </div>
                </div>

                {/* Meta Pixel */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-eerie-black mb-3">Meta Pixel (Facebook/Instagram)</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-cool-black">
                    <p><strong>Role:</strong> Data Controller (joint with us for some data)</p>
                    <p><strong>Location:</strong> Ireland (EU) and United States</p>
                    <p><strong>Data Collected:</strong> Page views, purchases, events, device information, IP addresses, cookie IDs</p>
                    <p><strong>Purpose:</strong> Advertising, conversion tracking, ad targeting, measurement, and optimization</p>
                    <p><strong>Legal Basis:</strong> Consent (GDPR Art. 6(1)(a)) - <strong>Opt-in required</strong></p>
                    <p><strong>Retention:</strong> As per Meta&apos;s data retention policy (typically up to 2 years)</p>
                    <p><strong>International Transfer:</strong> Data transferred to US under Data Privacy Framework or SCCs</p>
                    <p><strong>Consent Management:</strong> We require explicit opt-in consent before loading Meta Pixel. If you do not consent, Meta Pixel will not be loaded (GDPR-compliant).</p>
                    <p><strong>CCPA Notice:</strong> California residents: Meta Pixel may constitute a sale of personal information under CCPA. You have the right to opt-out.</p>
                    <p className="mt-2">
                      <strong>More Information:</strong>{' '}
                      <a href="https://www.facebook.com/privacy/policy" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline">
                        Meta Privacy Policy
                      </a>
                    </p>
                  </div>
                </div>

                {/* Google Tags */}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-eerie-black mb-3">Google Tags (Analytics/Tag Manager)</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-cool-black">
                    <p><strong>Role:</strong> Data Processor</p>
                    <p><strong>Location:</strong> United States (with EU entities)</p>
                    <p><strong>Data Collected:</strong> IP addresses (anonymized), device IDs, user behavior, page views, events, cookies</p>
                    <p><strong>Purpose:</strong> Website analytics, performance monitoring, user experience optimization</p>
                    <p><strong>Legal Basis:</strong> Consent (GDPR Art. 6(1)(a)) for non-essential tags</p>
                    <p><strong>Retention:</strong> As per Google Analytics data retention settings (default: 26 months)</p>
                    <p><strong>International Transfer:</strong> Data transferred to US under Data Privacy Framework or Standard Contractual Clauses</p>
                    <p><strong>Restricted Data Processing:</strong> We enable restricted data processing mode where available</p>
                    <p><strong>IP Anonymization:</strong> IP addresses are anonymized before processing</p>
                    <p><strong>Consent Management:</strong> Non-essential Google Tags require your consent. You can manage consent through cookie preferences.</p>
                    <p className="mt-2">
                      <strong>More Information:</strong>{' '}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline">
                        Google Privacy Policy
                      </a>{' '}
                      |{' '}
                      <a href="https://business.safety.google/adsprocessorterms/" target="_blank" rel="noopener noreferrer" className="text-tufts-blue underline">
                        Google Data Processing Terms
                      </a>
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg mt-4">
                  <p className="text-amber-800 text-sm">
                    <strong>Sub-Processors:</strong> Our data processors may use sub-processors. We maintain a list of 
                    sub-processors and will notify you of significant changes. You can request this list by contacting us.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Data Sharing */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Data Sharing and Disclosure</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  We do not sell your personal information. We share data only in the following circumstances:
                </p>
                <ul className="space-y-3 mb-4">
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-tufts-blue rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-cool-black">
                      <strong>Service Providers:</strong> Third-party processors (Airalo, Stripe, Meta, Google) who assist 
                      in our operations under strict data processing agreements
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-tufts-blue rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-cool-black">
                      <strong>Legal Compliance:</strong> When required by law, court order, or government regulation
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-tufts-blue rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-cool-black">
                      <strong>Law Enforcement:</strong> In response to valid legal requests or to protect our rights
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-tufts-blue rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-cool-black">
                      <strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales 
                      (with notice to affected users)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <div className="w-2 h-2 bg-tufts-blue rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <span className="text-cool-black">
                      <strong>With Your Consent:</strong> When you explicitly consent to sharing data with third parties
                    </span>
                  </li>
                </ul>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Data Retention */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Data Retention</h2>
                <div className="space-y-3 text-cool-black">
                  <p>
                    We retain your personal data only for as long as necessary to fulfill the purposes outlined in this 
                    Privacy Policy, unless a longer retention period is required or permitted by law.
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• <strong>Account Data:</strong> Retained while your account is active and for 3 years after account closure</li>
                    <li>• <strong>Transaction Data:</strong> Retained for 7 years for tax and legal compliance</li>
                    <li>• <strong>Marketing Data:</strong> Retained until you withdraw consent or unsubscribe</li>
                    <li>• <strong>Analytics Data:</strong> Retained according to service provider policies (typically 26 months for Google Analytics)</li>
                    <li>• <strong>Support Communications:</strong> Retained for 2 years after resolution</li>
                  </ul>
                  <p>
                    After the retention period, we securely delete or anonymize your data unless we are legally required 
                    to retain it longer.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Data Breach Notification */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-4">
                  <AlertCircle className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">Data Breach Notification</h2>
                </div>
                <div className="space-y-3 text-cool-black">
                  <p>
                    In the event of a personal data breach that is likely to result in a high risk to your rights 
                    and freedoms, we will notify you and the relevant supervisory authority (GDPR Art. 33-34) without 
                    undue delay and, where feasible, within 72 hours of becoming aware of the breach.
                  </p>
                  <p>
                    We have implemented appropriate technical and organizational measures to prevent data breaches, 
                    including encryption, access controls, and regular security audits.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Exercising Your Rights */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Exercising Your Data Subject Rights</h2>
                <div className="space-y-3 text-cool-black">
                  <p>
                    To exercise any of your rights under GDPR or other applicable privacy laws, please contact us at:
                  </p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p><strong>Email:</strong> support@simnetiq.store</p>
                    <p><strong>Subject Line:</strong> &quot;Data Subject Rights Request&quot;</p>
                  </div>
                  <p>
                    We will respond to your request within one month (may be extended to two months for complex requests). 
                    We may ask you to verify your identity before processing your request.
                  </p>
                  <p>
                    If you are not satisfied with our response, you have the right to lodge a complaint with your local 
                    data protection authority. For German residents, this is the Bundesbeauftragte für den Datenschutz 
                    und die Informationsfreiheit (BfDI).
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Cookie Management */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Cookie Management</h2>
                <div className="space-y-3 text-cool-black">
                  <p>
                    We use cookies and similar tracking technologies. For detailed information about our use of cookies, 
                    please see our{' '}
                    <Link href="/cookie-policy" className="text-tufts-blue underline">
                      Cookie Policy
                    </Link>.
                  </p>
                  <p>
                    You can manage your cookie preferences at any time through your account settings or browser settings. 
                    Essential cookies cannot be disabled as they are necessary for basic website functionality.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* International Data Transfers */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">International Data Transfers</h2>
                <div className="space-y-3 text-cool-black">
                  <p>
                    Your personal data may be transferred to and processed in countries outside the European Economic Area (EEA), 
                    including the United States and Singapore. We ensure appropriate safeguards are in place:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• <strong>Standard Contractual Clauses (SCCs):</strong> Approved by the European Commission</li>
                    <li>• <strong>Data Privacy Framework:</strong> For transfers to US entities certified under the EU-US DPF</li>
                    <li>• <strong>Adequacy Decisions:</strong> For transfers to countries with adequate data protection laws</li>
                  </ul>
                  <p>
                    All transfers are made in compliance with GDPR Chapter V requirements for international transfers.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Children's Privacy */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Children&apos;s Privacy</h2>
                <div className="space-y-3 text-cool-black">
                  <p>
                    Our services are not intended for children under 13 years of age. We do not knowingly collect 
                    personal information from children under 13. If you are a parent or guardian and believe your child 
                    has provided us with personal information, please contact us immediately.
                  </p>
                  <p>
                    If we become aware that we have collected personal information from a child under 13, we will 
                    delete such information promptly.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Changes to Privacy Policy */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Changes to This Privacy Policy</h2>
                <div className="space-y-3 text-cool-black">
                  <p>
                    We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
                    We will notify you of any material changes by:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• Posting the updated policy on our website with a new &quot;Last updated&quot; date</li>
                    <li>• Sending an email notification to registered users</li>
                    <li>• Displaying a prominent notice on our website or app</li>
                  </ul>
                  <p>
                    Your continued use of our services after changes become effective constitutes acceptance of the updated policy.
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
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Contact Us</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                    please contact us:
                  </p>
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <strong>Data Controller:</strong> Simnetiq Ltd<br />
                        <strong>Address:</strong> Germany<br />
                        <strong>Email:</strong> support@simnetiq.store<br />
                        <strong>Data Protection Inquiries:</strong> support@simnetiq.store
                      </div>
                      <div className="pt-2">
                        <strong>Response Time:</strong> We aim to respond to all privacy inquiries within 30 days as required by GDPR
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Supervisory Authority:</strong> If you are located in Germany and wish to file a complaint, 
                      you can contact the Bundesbeauftragte für den Datenschutz und die Informationsfreiheit (BfDI) 
                      at <a href="https://www.bfdi.bund.de" target="_blank" rel="noopener noreferrer" className="underline">www.bfdi.bund.de</a>
                    </p>
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
                    This Privacy Policy should be read in conjunction with our other legal documents:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <Link 
                      href="/terms-of-service"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Terms of Service</span>
                    </Link>
                    <Link 
                      href="/cookie-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-tufts-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Cookie Policy</span>
                    </Link>
                    <Link 
                      href="/return-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Return Policy</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Doppler VPN Card */}
          <div className="relative isolate overflow-hidden rounded-2xl mb-8">
            {/* Blurry gradient background - indigo/purple theme for VPN */}
            <div className="absolute inset-0 -z-10">
              {/* Base gradient */}
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, #5374CD 0%, #7B93DB 30%, #A8B8E8 50%, #D4DCF4 70%, #F0F3FA 85%, #FFFFFF 100%)'
                }}
              />
              {/* Blur overlay for softer effect */}
              <div
                className="absolute inset-0 backdrop-blur-3xl"
                style={{
                  background: 'radial-gradient(ellipse at 30% 20%, rgba(79, 70, 229, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(255, 255, 255, 0.6) 0%, transparent 50%)'
                }}
              />
            </div>

            <div className="px-6 py-12 md:px-12 md:py-16">
              <div className="mx-auto max-w-2xl text-center">
                {/* Logo */}
                <div className="mx-auto mb-6 w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                  <img
                    src="/WhiteLogoDoppler.png"
                    alt="Doppler VPN"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-balance text-gray-900 md:text-3xl">
                  Doppler VPN
                </h2>
                
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/doppler-vpn-privacy-policy"
                    className="group inline-flex items-center gap-3 rounded-full bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:bg-gray-800 hover:scale-105"
                  >
                    <Shield className="h-5 w-5" />
                    <span className="text-base">VPN Privacy Policy</span>
                  </Link>
                  <Link
                    href="/doppler-vpn-terms-of-service"
                    className="group inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-medium text-gray-900 ring-1 ring-gray-200 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:scale-105"
                  >
                    <FileText className="h-5 w-5" />
                    <span className="text-base">VPN Terms of Service</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;
