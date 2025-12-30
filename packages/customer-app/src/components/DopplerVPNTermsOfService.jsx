"use client";

import React from 'react';
import { FileText, Shield, Smartphone, CreditCard, Ban, AlertTriangle, Scale, Globe, RefreshCw, UserX, Lock, Server } from 'lucide-react';
import Link from 'next/link';

const DopplerVPNTermsOfService = () => {
  const sections = [
    {
      icon: Shield,
      title: "1. Acceptance of Terms",
      content: [
        "By downloading, installing, or using Doppler VPN, you agree to be bound by these Terms of Service",
        "Doppler VPN is a product of Simnetiq Ltd. These VPN-specific terms supplement and are subject to the main Simnetiq Terms of Service",
        "If there is any conflict between these VPN-specific terms and the main Simnetiq Terms of Service, these VPN-specific terms shall prevail for matters relating to the VPN service",
        "If you do not agree to these terms, you must not download, install, or use Doppler VPN",
        "We may update these terms from time to time. Continued use of the app constitutes acceptance of updated terms"
      ]
    },
    {
      icon: Server,
      title: "2. Service Description",
      content: [
        "Doppler VPN provides virtual private network (VPN) services to encrypt your internet connection and mask your IP address",
        "The service is designed to enhance your online privacy and security when using public or private networks",
        "VPN service is provided on a best-effort basis with no guarantees of specific speeds, uptime, or availability",
        "Server locations and availability may change without notice",
        "The service does not guarantee complete anonymity or protection against all forms of tracking or surveillance"
      ]
    },
    {
      icon: CreditCard,
      title: "3. Subscription, Free Trial, and Billing",
      content: [
        "Doppler VPN is available as a subscription service through the Apple App Store",
        "New users are eligible for a 1-week (7-day) free trial period before being charged",
        "After the free trial ends, your subscription will automatically renew at the then-current subscription price unless cancelled",
        "All payments, billing, renewals, and cancellations are processed exclusively through Apple via RevenueCat",
        "We do not have access to your payment card details or Apple ID payment information",
        "To cancel your subscription, you must do so through your Apple ID account settings at least 24 hours before the end of the current billing period",
        "Refund requests must be submitted directly to Apple in accordance with their refund policies",
        "We cannot process refunds directly as all billing is handled by Apple",
        "Subscription prices may change with notice; price changes will not affect your current billing period"
      ]
    },
    {
      icon: Smartphone,
      title: "4. Device Limits and Account Management",
      content: [
        "Each subscription allows use on up to 10 (ten) devices simultaneously",
        "One device will be designated as your primary device for account management purposes",
        "We collect a device identifier solely to enforce these device limits and prevent abuse",
        "Attempting to circumvent device limits through any technical means is prohibited",
        "We reserve the right to suspend or terminate accounts that show patterns of device limit abuse",
        "You are responsible for all activity that occurs on devices connected to your subscription"
      ]
    },
    {
      icon: Ban,
      title: "5. Acceptable Use Policy",
      content: [
        "You may only use Doppler VPN for lawful purposes and in compliance with all applicable laws",
        "You must not use the service to engage in illegal activities, including but not limited to hacking, fraud, or distribution of malware",
        "You must not use the service to infringe on intellectual property rights or distribute copyrighted material without authorization",
        "You must not use the service to send spam, conduct phishing attacks, or engage in any form of harassment",
        "You must not attempt to overload, disrupt, or attack our servers or network infrastructure",
        "You must not resell, redistribute, or share your subscription access with others outside permitted device limits",
        "You must not use the service to access geo-restricted content in violation of the content provider's terms",
        "We reserve the right to suspend or terminate service for any user who violates these acceptable use policies"
      ]
    },
    {
      icon: AlertTriangle,
      title: "6. Service Limitations and Disclaimers",
      content: [
        "VPN service is provided 'AS IS' and 'AS AVAILABLE' without warranties of any kind",
        "We do not guarantee any specific connection speeds, latency, or bandwidth",
        "We do not guarantee 100% uptime or uninterrupted service availability",
        "We do not guarantee that the service will work with all websites, apps, or streaming services",
        "Some services may block or restrict VPN connections; we are not responsible for such restrictions",
        "We do not guarantee complete anonymity or protection against all forms of surveillance or tracking",
        "Network conditions, server load, and your local internet connection will affect performance",
        "We are not responsible for any data charges incurred from your mobile carrier while using the VPN"
      ]
    },
    {
      icon: Lock,
      title: "7. Privacy and No-Logs Policy",
      content: [
        "We are committed to protecting your privacy while using Doppler VPN",
        "We do NOT log your browsing activity, connection timestamps, or bandwidth usage",
        "We do NOT collect your email address, name, or personal profile information",
        "We collect only a device identifier to enforce device limits (up to 10 devices per account)",
        "For complete details on our data practices, please see our Doppler VPN Privacy Policy",
        "Our privacy practices are also subject to the main Simnetiq Privacy Policy for general company matters"
      ]
    },
    {
      icon: Scale,
      title: "8. Limitation of Liability",
      content: [
        "To the maximum extent permitted by law, Simnetiq Ltd shall not be liable for any indirect, incidental, special, consequential, or punitive damages",
        "We are not liable for any loss of data, privacy breaches by third parties, or unauthorized access to your information",
        "We are not liable for service interruptions, connection failures, or performance degradation",
        "Our total liability shall not exceed the amount you paid for the subscription in the 12 months preceding the claim",
        "Some jurisdictions do not allow limitation of liability; these limitations may not apply to you"
      ]
    },
    {
      icon: UserX,
      title: "9. Termination and Suspension",
      content: [
        "You may cancel your subscription at any time through your Apple ID account settings",
        "Cancellation will take effect at the end of your current billing period; no prorated refunds are provided",
        "We may suspend or terminate your access immediately if you violate these Terms of Service",
        "We may suspend or terminate service if required by law or legal process",
        "Upon termination, your right to use the service will immediately cease",
        "We may delete your device identifier data in accordance with our data retention policies"
      ]
    },
    {
      icon: Globe,
      title: "10. Geographic Restrictions",
      content: [
        "Doppler VPN is not available in all countries or regions",
        "You are responsible for ensuring that using a VPN is legal in your jurisdiction",
        "Some countries restrict or prohibit VPN usage; using Doppler VPN in such jurisdictions is at your own risk",
        "We are not responsible for any legal consequences arising from your use of the service in jurisdictions where VPNs are restricted"
      ]
    },
    {
      icon: RefreshCw,
      title: "11. Changes to Service",
      content: [
        "We reserve the right to modify, suspend, or discontinue the service at any time with or without notice",
        "We may add, remove, or change server locations without prior notice",
        "We may update the app to improve functionality, security, or compliance",
        "Continued use of the service after changes constitutes acceptance of those changes"
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
              Doppler VPN Terms of Service
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-cool-black">
              These Terms of Service govern your use of Doppler VPN. Please read them carefully
              before using our VPN service.
            </p>
            <div className="flex items-center justify-center mt-8">
              <FileText className="w-8 h-8 text-tufts-blue mr-2" />
              <p className="text-sm text-cool-black">
                Effective Date: January 1, 2025 | Last Updated: January 1, 2025
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
                  These Terms of Service (&quot;Terms&quot;) govern your use of the Doppler VPN application
                  and services provided by Simnetiq Ltd (&quot;Simnetiq&quot;, &quot;Company&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;).
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  Doppler VPN is part of the Simnetiq product ecosystem. These VPN-specific terms work together
                  with and are supplementary to the main Simnetiq Terms of Service. By using Doppler VPN, you
                  agree to both these VPN-specific terms and the main Simnetiq Terms of Service.
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  Subscriptions and billing are handled exclusively through the Apple App Store. We use RevenueCat
                  to manage subscription status. We do not collect payment information directly.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-4">
                  <p className="text-blue-800 text-sm">
                    <strong>Important:</strong> By using Doppler VPN, you acknowledge that you have read and agree to both
                    these VPN-specific terms and the main{' '}
                    <Link href="/terms-of-service" className="underline">Simnetiq Terms of Service</Link>.
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

          {/* Governing Law */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">12. Governing Law and Dispute Resolution</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    <strong>Governing Law:</strong> These Terms are governed by and construed in accordance with
                    the laws of the United Kingdom, without regard to conflict of law principles.
                  </p>
                  <p>
                    <strong>Jurisdiction:</strong> The courts of the United Kingdom shall have exclusive jurisdiction
                    over any disputes arising from these Terms or the Doppler VPN service, subject to mandatory
                    consumer protection laws in your jurisdiction.
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
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Apple App Store Terms */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">13. Apple App Store Terms</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    The following terms apply to your use of Doppler VPN downloaded from the Apple App Store:
                  </p>
                  <ul className="space-y-2 ml-4">
                    <li>• These Terms are between you and Simnetiq Ltd, not Apple Inc.</li>
                    <li>• Simnetiq Ltd, not Apple, is solely responsible for Doppler VPN and its content</li>
                    <li>• Apple has no obligation to provide maintenance or support services for Doppler VPN</li>
                    <li>• In the event of any failure to conform to applicable warranties, you may notify Apple for a refund; Apple has no other warranty obligation</li>
                    <li>• Apple is not responsible for any claims relating to Doppler VPN, including product liability, legal compliance, or intellectual property claims</li>
                    <li>• Apple and its subsidiaries are third-party beneficiaries of these Terms and may enforce them against you</li>
                  </ul>
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
                    Doppler VPN, please reach out through the following channels:
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
                        <strong>Product:</strong> Doppler VPN
                      </div>
                      <div className="pt-2">
                        <strong>Response Time:</strong> We aim to respond to all inquiries within 24-48 hours
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Related Documents */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Related Legal Documents</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    These Terms of Service should be read in conjunction with our other legal documents:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <Link
                      href="/doppler-vpn-privacy-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-tufts-blue text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>VPN Privacy Policy</span>
                    </Link>
                    <Link
                      href="/terms-of-service"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Simnetiq Terms</span>
                    </Link>
                    <Link
                      href="/privacy-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Simnetiq Privacy</span>
                    </Link>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mt-6">
                    <p className="text-blue-800 text-sm">
                      <strong>Legal Notice:</strong> By using Doppler VPN, you acknowledge that you have read,
                      understood, and agree to be bound by these Terms and all related legal documents.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

        </div>
      </section>
    </div>
  );
};

export default DopplerVPNTermsOfService;
