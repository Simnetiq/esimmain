import React from 'react';
import Link from 'next/link';
import {
  Shield,
  Lock,
  Globe,
  Zap,
  Server,
  Wifi,
  Eye,
  FileText,
  Mail,
  HelpCircle,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

export const metadata = {
  title: 'Doppler VPN - Secure Your Internet Connection',
  description: 'Doppler VPN encrypts your internet traffic and helps protect your online privacy. Secure browsing on public Wi-Fi and access content while traveling.',
};

const DopplerVPNPage = () => {
  const features = [
    {
      icon: Lock,
      title: "Privacy Protection",
      description: "Encrypts your internet traffic using industry-standard protocols. Helps reduce tracking by masking your IP address from websites you visit."
    },
    {
      icon: Shield,
      title: "Security Features",
      description: "Supports modern encryption standards (AES-256). Includes automatic connection protection on untrusted networks and a kill switch feature."
    },
    {
      icon: Zap,
      title: "Optimized Performance",
      description: "Servers in multiple regions designed for reliable connections. Optimized to minimize impact on browsing and streaming speeds."
    },
    {
      icon: Globe,
      title: "Global Server Network",
      description: "Access servers in multiple countries. Switch between server locations as needed. Servers maintained and monitored for uptime."
    }
  ];

  const keyBenefits = [
    {
      icon: Wifi,
      title: "Public Wi-Fi Protection",
      description: "Add a layer of security when using public networks at cafes, airports, and hotels"
    },
    {
      icon: Eye,
      title: "No-Logs Policy",
      description: "We do not store records of your browsing activity or connection logs"
    },
    {
      icon: Server,
      title: "One-Tap Connection",
      description: "Simple and quick connection process with an intuitive interface"
    }
  ];

  const platforms = [
    {
      icon: Smartphone,
      name: "iOS",
      requirement: "iOS 15.0 and later"
    },
    {
      icon: Tablet,
      name: "iPadOS",
      requirement: "iPadOS 15.0 and later"
    },
    {
      icon: Monitor,
      name: "macOS",
      requirement: "macOS 12.0 and later (where applicable)"
    }
  ];

  const privacyData = [
    { type: "Account email", collected: "Yes", purpose: "Account creation and support" },
    { type: "Payment information", collected: "Yes (via App Store)", purpose: "Subscription processing" },
    { type: "Browsing activity", collected: "No", purpose: "—" },
    { type: "Connection logs", collected: "No", purpose: "—" },
    { type: "Device identifiers", collected: "Limited", purpose: "App performance and crash reporting" }
  ];

  const faqs = [
    {
      question: "What is Doppler VPN?",
      answer: "Doppler VPN is a virtual private network application that encrypts your internet connection and helps protect your online privacy by routing your traffic through secure servers."
    },
    {
      question: "How does a VPN protect my privacy?",
      answer: "A VPN encrypts the data traveling between your device and our servers. This helps prevent unauthorized parties from viewing your internet activity on the network you are using."
    },
    {
      question: "Can I use Doppler VPN on public Wi-Fi?",
      answer: "Yes. Doppler VPN is designed to help secure your connection when using public Wi-Fi networks at locations such as cafes, airports, and hotels."
    },
    {
      question: "Does Doppler VPN store my browsing history?",
      answer: "No. We maintain a no-logs policy, which means we do not store records of your browsing activity or connection history."
    },
    {
      question: "Which devices are supported?",
      answer: "Doppler VPN supports iOS 15.0 and later, iPadOS 15.0 and later, and macOS 12.0 and later on compatible devices."
    },
    {
      question: "How do I contact support?",
      answer: "You can reach our support team by email. We aim to respond to all inquiries within 48 hours. Please include your device model and operating system version when reporting technical issues."
    }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* Header Section */}
      <section className="bg-[var(--bg-primary)] py-16">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="text-center">
            <h2 className="text-center text-xl font-semibold text-tufts-blue">
              <span>{'{ '}</span>
              Doppler VPN
              <span>{' }'}</span>
            </h2>
            <h1 className="mx-auto mt-12 max-w-4xl text-center text-4xl font-semibold tracking-tight text-eerie-black sm:text-5xl">
              Secure Your Internet Connection
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-cool-black">
              Doppler VPN encrypts your network traffic and helps protect your online privacy.
              Designed for individuals who want to secure their connection on public and private networks.
            </p>
            <div className="flex items-center justify-center mt-8">
              <Shield className="w-8 h-8 text-tufts-blue mr-2" />
              <p className="text-sm text-cool-black">
                Privacy protection for your digital life
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-[var(--bg-primary)]">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">

          {/* App Overview */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">App Overview</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  Doppler VPN is a virtual private network application designed to help users secure their
                  internet connection and protect their online privacy. The app encrypts network traffic
                  between your device and our servers, helping to shield your data from unauthorized access
                  on public and private networks.
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  Doppler VPN is designed for individuals who want to add a layer of privacy to their
                  internet browsing, secure their connection when using public Wi-Fi networks, and access
                  region-specific content while traveling.
                </p>
                <p className="text-cool-black leading-relaxed">
                  Our application uses industry-standard encryption protocols to help protect your data.
                  We are committed to providing a reliable and user-friendly VPN experience.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Key Features */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-6">Key Features</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {features.map((feature, index) => {
                    const IconComponent = feature.icon;
                    return (
                      <div key={index} className="flex">
                        <div className="w-12 h-12 bg-tufts-blue/10 rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-tufts-blue" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-eerie-black mb-2">{feature.title}</h3>
                          <p className="text-cool-black text-sm leading-relaxed">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Additional Benefits */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-6">Why Use Doppler VPN</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {keyBenefits.map((benefit, index) => {
                    const IconComponent = benefit.icon;
                    return (
                      <div key={index} className="text-center">
                        <div className="w-16 h-16 bg-tufts-blue/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <IconComponent className="w-8 h-8 text-tufts-blue" />
                        </div>
                        <h3 className="text-lg font-medium text-eerie-black mb-2">{benefit.title}</h3>
                        <p className="text-cool-black text-sm">{benefit.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Supported Platforms */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-6">Supported Platforms</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {platforms.map((platform, index) => {
                    const IconComponent = platform.icon;
                    return (
                      <div key={index} className="text-center p-4 bg-[var(--bg-secondary)] rounded-xl">
                        <IconComponent className="w-10 h-10 text-tufts-blue mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-eerie-black mb-1">{platform.name}</h3>
                        <p className="text-cool-black text-sm">{platform.requirement}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Privacy & Data Use */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Privacy & Data Use</h2>
                <p className="text-cool-black leading-relaxed mb-6">
                  Doppler VPN is committed to user privacy. Below is a summary of our data practices.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--card-border)]">
                        <th className="py-3 px-4 text-sm font-medium text-eerie-black">Data Type</th>
                        <th className="py-3 px-4 text-sm font-medium text-eerie-black">Collected</th>
                        <th className="py-3 px-4 text-sm font-medium text-eerie-black">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {privacyData.map((item, index) => (
                        <tr key={index} className="border-b border-[var(--card-border)]">
                          <td className="py-3 px-4 text-sm text-cool-black">{item.type}</td>
                          <td className="py-3 px-4 text-sm text-cool-black">{item.collected}</td>
                          <td className="py-3 px-4 text-sm text-cool-black">{item.purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-cool-black text-sm mt-4">
                  For complete details, please review our full Privacy Policy.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* FAQ Section */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-6">
                  <HelpCircle className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border-b border-[var(--card-border)] pb-4 last:border-b-0">
                      <h3 className="text-lg font-medium text-eerie-black mb-2">
                        {faq.question}
                      </h3>
                      <p className="text-cool-black leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Contact & Support */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Contact & Support</h2>
                <p className="text-cool-black leading-relaxed mb-6">
                  We are here to help with any questions or issues you may have.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <Mail className="w-6 h-6 text-tufts-blue mr-3" />
                    <div>
                      <p className="text-sm font-medium text-eerie-black">Email Support</p>
                      <p className="text-sm text-cool-black">support@dopplervpn.com</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-[var(--bg-secondary)] rounded-xl">
                    <HelpCircle className="w-6 h-6 text-tufts-blue mr-3" />
                    <div>
                      <p className="text-sm font-medium text-eerie-black">Response Time</p>
                      <p className="text-sm text-cool-black">Within 48 hours</p>
                    </div>
                  </div>
                </div>
                <p className="text-cool-black text-sm mt-4">
                  For technical issues, please include your device model and operating system version in your message.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Related Information */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-[var(--bg-primary)]"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Related Information</h2>
                <div className="space-y-4 text-cool-black">
                  <p>
                    Please review our terms and policies for more information about our services and your rights as a user.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                    <Link
                      href="/terms-of-service"
                      className="flex items-center space-x-3 px-4 py-3 bg-tufts-blue text-white rounded-lg hover:bg-cobalt-blue transition-colors"
                    >
                      <Shield className="w-5 h-5" />
                      <span>Terms of Service</span>
                    </Link>
                    <Link
                      href="/privacy-policy"
                      className="flex items-center space-x-3 px-4 py-3 bg-[var(--subtle-bg)] text-text-primary rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Privacy Policy</span>
                    </Link>
                    <Link
                      href="/contact"
                      className="flex items-center space-x-3 px-4 py-3 bg-[var(--subtle-bg)] text-text-primary rounded-lg hover:bg-[var(--hover-bg)] transition-colors"
                    >
                      <Mail className="w-5 h-5" />
                      <span>Contact Us</span>
                    </Link>
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

export default DopplerVPNPage;
