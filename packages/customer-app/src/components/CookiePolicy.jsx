import React from 'react';
import { Cookie, Settings, BarChart, Shield, Globe, Trash2 } from 'lucide-react';

const CookiePolicy = () => {
  const cookieTypes = [
    {
      icon: Shield,
      title: "Essential Cookies",
      description: "Required for basic website functionality",
      examples: [
        "Authentication and login sessions",
        "Security and fraud prevention",
        "Shopping cart and checkout process",
        "Language and region preferences"
      ],
      canDisable: false
    },
    {
      icon: BarChart,
      title: "Analytics Cookies",
      description: "Help us understand how visitors use our website",
      examples: [
        "Google Analytics for traffic analysis",
        "Page views and user behavior tracking",
        "Performance monitoring and optimization",
        "A/B testing and feature improvements"
      ],
      canDisable: true
    },
    {
      icon: Settings,
      title: "Functional Cookies",
      description: "Enhance your experience with personalized features",
      examples: [
        "Remember your preferences and settings",
        "Personalized content recommendations",
        "Chat widget and customer support",
        "Social media integration features"
      ],
      canDisable: true
    },
    {
      icon: Globe,
      title: "Marketing Cookies",
      description: "Used to deliver relevant advertisements",
      examples: [
        "Targeted advertising campaigns",
        "Social media advertising pixels",
        "Retargeting and remarketing",
        "Conversion tracking and attribution"
      ],
      canDisable: true
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
              Cookie Settings
              <span>{' }'}</span>
            </h2>
            <p className="mx-auto mt-12 max-w-4xl text-center text-4xl font-semibold tracking-tight text-eerie-black sm:text-5xl">
              Understanding our cookie usage
            </p>
            <p className="mx-auto mt-6 max-w-2xl text-center text-lg text-cool-black">
              Learn about how we use cookies to improve your browsing experience 
              and enhance our services.
            </p>
            <div className="flex items-center justify-center mt-8">
              <Cookie className="w-8 h-8 text-tufts-blue mr-2" />
              <p className="text-sm text-cool-black">
                Last updated: December 15, 2024
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
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">What Are Cookies?</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  Cookies are small text files that are stored on your device when you visit our website. 
                  They help us provide you with a better browsing experience by remembering your preferences, 
                  analyzing how you use our site, and personalizing content.
                </p>
                <p className="text-cool-black leading-relaxed">
                  This Cookie Policy explains what cookies we use, why we use them, and how you can manage 
                  your cookie preferences. By continuing to use our website, you consent to our use of cookies 
                  as described in this policy.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Cookie Types */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {cookieTypes.map((type, index) => {
              const IconComponent = type.icon;
              return (
                <div
                  key={index}
                  className="relative"
                >
                  <div className="absolute inset-px rounded-xl bg-white"></div>
                  <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
                    <div className="px-8 pt-8 pb-8">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-tufts-blue/10 rounded-xl flex items-center justify-center mr-4">
                            <IconComponent className="w-6 h-6 text-tufts-blue" />
                          </div>
                          <div>
                            <h3 className="text-xl font-medium tracking-tight text-eerie-black">{type.title}</h3>
                            <p className="text-cool-black">{type.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          {type.canDisable ? (
                            <span className="bg-tufts-blue/10 text-tufts-blue px-3 py-1 rounded-full text-sm font-medium">
                              Optional
                            </span>
                          ) : (
                            <span className="bg-cobalt-blue/10 text-cobalt-blue px-3 py-1 rounded-full text-sm font-medium">
                              Required
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <h4 className="font-medium text-eerie-black mb-3">Examples:</h4>
                      <ul className="space-y-2">
                        {type.examples.map((example, exampleIndex) => (
                          <li key={exampleIndex} className="flex items-start">
                            <div className="w-2 h-2 bg-tufts-blue rounded-full mt-2 mr-3 flex-shrink-0"></div>
                            <span className="text-cool-black">{example}</span>
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

          {/* Third-Party Cookies */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <h2 className="text-2xl font-medium tracking-tight text-eerie-black mb-4">Third-Party Cookies</h2>
                <p className="text-cool-black leading-relaxed mb-4">
                  We may also use third-party cookies from trusted partners to enhance our services:
                </p>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-eerie-black mb-2">Analytics Partners</h4>
                    <ul className="space-y-1 text-cool-black">
                      <li>• Google Analytics</li>
                      <li>• Firebase Analytics</li>
                      <li>• Hotjar (heatmaps)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-eerie-black mb-2">Marketing Partners</h4>
                    <ul className="space-y-1 text-cool-black">
                      <li>• Google Ads</li>
                      <li>• Facebook Pixel</li>
                      <li>• LinkedIn Insight Tag</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>

          {/* Managing Cookies */}
          <div className="relative mb-8">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="flex items-center mb-6">
                  <Trash2 className="w-8 h-8 text-tufts-blue mr-3" />
                  <h2 className="text-2xl font-medium tracking-tight text-eerie-black">Managing Your Cookie Preferences</h2>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-eerie-black mb-2">Browser Settings</h4>
                    <p className="text-cool-black mb-3">
                      You can control cookies through your browser settings. Here&apos;s how to manage cookies in popular browsers:
                    </p>
                    <ul className="space-y-2 text-cool-black">
                      <li>• <strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
                      <li>• <strong>Firefox:</strong> Preferences → Privacy & Security → Cookies and Site Data</li>
                      <li>• <strong>Safari:</strong> Preferences → Privacy → Manage Website Data</li>
                      <li>• <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-eerie-black mb-2">Cookie Preferences</h4>
                    <p className="text-cool-black">
                      Your cookie preferences are managed when you first visit our website. 
                      A cookie consent banner will appear, allowing you to customize your 
                      preferences and control which types of cookies are stored on your device.
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

export default CookiePolicy;
