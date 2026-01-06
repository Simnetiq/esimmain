import React from 'react';
import Link from 'next/link';
import {
  Smartphone,
  Globe,
  BarChart3,
  Download,
  Wifi,
  CreditCard,
  Bell,
  FileText,
  Mail,
  HelpCircle,
  Shield,
  Tablet,
  QrCode,
  MapPin
} from 'lucide-react';

export const metadata = {
  title: 'Simnetiq - eSIM Data Plans for Travel',
  description: 'Simnetiq helps you purchase, activate, and manage eSIM data plans for international travel. Stay connected in multiple countries without physical SIM cards.',
};

const SimnetiqPage = () => {
  const features = [
    {
      icon: Smartphone,
      title: "eSIM Management",
      description: "Browse and purchase data plans for destinations worldwide. Install eSIMs directly to compatible devices. Manage multiple eSIMs from a single app interface."
    },
    {
      icon: Globe,
      title: "Plan Selection",
      description: "View available data plans by country or region. Compare plan options based on data allowance and validity period. Receive plan recommendations based on your destination."
    },
    {
      icon: BarChart3,
      title: "Usage Monitoring",
      description: "Track your remaining data balance in real time. View usage history and plan expiration dates. Receive notifications when data is running low."
    },
    {
      icon: Download,
      title: "Simple Activation",
      description: "Step-by-step guidance for eSIM installation. QR code or direct installation options. Support documentation for first-time eSIM users."
    }
  ];

  const keyBenefits = [
    {
      icon: MapPin,
      title: "Global Coverage",
      description: "Access data plans in multiple countries and regions around the world"
    },
    {
      icon: CreditCard,
      title: "Flexible Plans",
      description: "Choose plans that match your travel needs and data requirements"
    },
    {
      icon: Bell,
      title: "Usage Alerts",
      description: "Stay informed about your data balance and plan expiration"
    }
  ];

  const platforms = [
    {
      icon: Smartphone,
      name: "iOS",
      requirement: "iOS 15.0 and later (eSIM-compatible devices)"
    },
    {
      icon: Tablet,
      name: "iPadOS",
      requirement: "iPadOS 15.0 and later (eSIM-compatible devices)"
    }
  ];

  const privacyData = [
    { type: "Account email", collected: "Yes", purpose: "Account creation and order confirmations" },
    { type: "Payment information", collected: "Yes (via App Store)", purpose: "Plan purchases" },
    { type: "Device information", collected: "Yes", purpose: "eSIM compatibility verification" },
    { type: "Location data", collected: "No", purpose: "—" },
    { type: "Usage analytics", collected: "Limited", purpose: "App improvement and troubleshooting" }
  ];

  const faqs = [
    {
      question: "What is Simnetiq?",
      answer: "Simnetiq is a mobile connectivity management application that helps you purchase, activate, and manage eSIM data plans for international travel. The app provides access to data plans in multiple countries and regions."
    },
    {
      question: "What is an eSIM?",
      answer: "An eSIM (embedded SIM) is a digital SIM that allows you to activate a cellular plan without using a physical SIM card. It is built into compatible devices and can store multiple carrier profiles."
    },
    {
      question: "How do I know if my device supports eSIM?",
      answer: "Most recent iPhone models (iPhone XS and later) and iPad models with cellular capability support eSIM. You can check your device settings or contact your device manufacturer to confirm eSIM compatibility."
    },
    {
      question: "How do I install an eSIM?",
      answer: "After purchasing a plan, Simnetiq provides step-by-step guidance for installation. You can install via QR code scan or direct installation through the app. The process takes only a few minutes."
    },
    {
      question: "Can I use multiple eSIMs?",
      answer: "Yes. Simnetiq allows you to manage multiple eSIM profiles from a single app interface. You can switch between plans as needed for different destinations."
    },
    {
      question: "How do I contact support?",
      answer: "You can reach our support team by email. We aim to respond to all inquiries within 24 hours. For eSIM activation issues, please include your device model, iOS version, and order number."
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="text-center">
            <h2 className="text-center text-xl font-semibold text-tufts-blue">
              <span>{'{ '}</span>
              Simnetiq
              <span>{' }'}</span>
            </h2>
            <h1 className="mx-auto mt-12 max-w-4xl text-center text-4xl font-semibold tracking-tight text-eerie-black sm:text-5xl">
              Stay Connected While You Travel
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-cool-black">
              Simnetiq helps you purchase, activate, and manage eSIM data plans for international travel.
              Access mobile data in multiple countries without needing physical SIM cards.
            </p>
            <div className="flex items-center justify-center mt-8">
              <Globe className="w-8 h-8 text-tufts-blue mr-2" />
              <p className="text-sm text-cool-black">
                Mobile connectivity for travelers worldwide
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="bg-white">
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">

          {/* App Overview */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">App Overview</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  Simnetiq is a mobile connectivity management application that helps users purchase, activate,
                  and manage eSIM data plans for international travel. The app provides access to data plans in
                  multiple countries and regions, allowing users to stay connected without needing physical SIM cards.
                </p>
                <p className="text-cool-black leading-relaxed mb-4">
                  Simnetiq is designed for travelers who need mobile data in multiple countries, business professionals
                  requiring reliable connectivity abroad, and anyone looking for a convenient alternative to roaming
                  or local SIM cards.
                </p>
                <p className="text-cool-black leading-relaxed">
                  Our application provides a simple and straightforward way to browse, compare, purchase, and manage
                  eSIM data plans from your mobile device.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Key Features */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
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
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-6">Why Use Simnetiq</h2>
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

          {/* How It Works */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">How It Works</h2>
                <p className="text-cool-black leading-relaxed mb-6">
                  Getting started with Simnetiq is simple. Follow these steps to get connected:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 bg-tufts-blue/10 rounded-xl flex items-center justify-center mx-auto">
                        <MapPin className="w-8 h-8 text-tufts-blue" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-tufts-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                        1
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-eerie-black mb-2">Select Destination</h3>
                    <p className="text-cool-black text-sm">Choose your travel destination to view available plans</p>
                  </div>
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 bg-tufts-blue/10 rounded-xl flex items-center justify-center mx-auto">
                        <CreditCard className="w-8 h-8 text-tufts-blue" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-tufts-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                        2
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-eerie-black mb-2">Purchase Plan</h3>
                    <p className="text-cool-black text-sm">Select and purchase a plan that fits your needs</p>
                  </div>
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 bg-tufts-blue/10 rounded-xl flex items-center justify-center mx-auto">
                        <QrCode className="w-8 h-8 text-tufts-blue" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-tufts-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                        3
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-eerie-black mb-2">Install eSIM</h3>
                    <p className="text-cool-black text-sm">Follow guided instructions to install on your device</p>
                  </div>
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 bg-tufts-blue/10 rounded-xl flex items-center justify-center mx-auto">
                        <Wifi className="w-8 h-8 text-tufts-blue" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-tufts-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                        4
                      </div>
                    </div>
                    <h3 className="text-lg font-medium text-eerie-black mb-2">Stay Connected</h3>
                    <p className="text-cool-black text-sm">Enjoy mobile data at your destination</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Supported Platforms */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-6">Supported Platforms</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                  {platforms.map((platform, index) => {
                    const IconComponent = platform.icon;
                    return (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-xl">
                        <IconComponent className="w-10 h-10 text-tufts-blue mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-eerie-black mb-1">{platform.name}</h3>
                        <p className="text-cool-black text-sm">{platform.requirement}</p>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <p className="text-cool-black text-sm text-center">
                    <strong>Note:</strong> eSIM functionality requires a device with eSIM support and carrier compatibility.
                    Please verify your device supports eSIM before purchase.
                  </p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Privacy & Data Use */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Privacy & Data Use</h2>
                <p className="text-cool-black leading-relaxed mb-6">
                  Simnetiq respects your privacy and handles data responsibly. Below is a summary of our data practices.
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-3 px-4 text-sm font-medium text-eerie-black">Data Type</th>
                        <th className="py-3 px-4 text-sm font-medium text-eerie-black">Collected</th>
                        <th className="py-3 px-4 text-sm font-medium text-eerie-black">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {privacyData.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
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
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-6">
                  <HelpCircle className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">Frequently Asked Questions</h2>
                </div>
                <div className="space-y-6">
                  {faqs.map((faq, index) => (
                    <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
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
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Contact & Support</h2>
                <p className="text-cool-black leading-relaxed mb-6">
                  Our support team is available to assist you with any questions or issues.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    <Mail className="w-6 h-6 text-tufts-blue mr-3" />
                    <div>
                      <p className="text-sm font-medium text-eerie-black">Email Support</p>
                      <p className="text-sm text-cool-black">support@simnetiq.com</p>
                    </div>
                  </div>
                  <div className="flex items-center p-4 bg-gray-50 rounded-xl">
                    <HelpCircle className="w-6 h-6 text-tufts-blue mr-3" />
                    <div>
                      <p className="text-sm font-medium text-eerie-black">Response Time</p>
                      <p className="text-sm text-cool-black">Within 24 hours</p>
                    </div>
                  </div>
                </div>
                <p className="text-cool-black text-sm mt-4">
                  For eSIM activation issues, please include your device model, iOS version, and order number in your message.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Related Information */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
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
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <FileText className="w-5 h-5" />
                      <span>Privacy Policy</span>
                    </Link>
                    <Link
                      href="/contact"
                      className="flex items-center space-x-3 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
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

export default SimnetiqPage;
