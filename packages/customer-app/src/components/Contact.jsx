"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { createContactRequest } from '@esim/shared/services/contactService';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import BlogAppDownload from './BlogAppDownload';

// Lazy load toast
const showToast = async (type, message) => {
  const toast = (await import('react-hot-toast')).default;
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
};

// Inline SVG Icons
const ChevronDownIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const SmartphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" />
  </svg>
);

const CreditCardIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" /><path d="M5 12.859a10 10 0 0 1 14 0" /><path d="M8.5 16.429a5 5 0 0 1 7 0" />
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
  </svg>
);

const SendIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" />
  </svg>
);

const UserIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
  </svg>
);

const BookOpenIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

// FAQ Item Component
const FAQItem = ({ question, answer, isOpen, onToggle, steps }) => (
  <div className="border-b border-[var(--card-border)] last:border-b-0">
    <button
      onClick={onToggle}
      className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-[var(--hover-bg)] transition-colors duration-150 ease-out text-start rtl-native-flex"
    >
      <span className="font-medium text-text-primary text-sm sm:text-base">{question}</span>
      <ChevronDownIcon className={`w-5 h-5 text-text-muted flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="px-5 pb-4 text-start">
        <p className="text-text-muted leading-relaxed text-sm mb-3">{answer}</p>
        {steps && steps.length > 0 && (
          <div className="mt-3 space-y-2.5">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-3 rtl-native-flex">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-tufts-blue/10 text-tufts-blue flex items-center justify-center text-xs font-semibold mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-sm text-text-primary leading-relaxed pt-1">{step}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);

// FAQ category step numbers
const FAQ_NUMBERS = ['01', '02', '03', '04'];

// FAQ Category Component
const FAQCategory = ({ icon: Icon, title, faqs, openFaq, onToggle, categoryIndex }) => (
  <div className="group relative bg-[var(--bg-secondary)] overflow-hidden hover:bg-[var(--bg-primary)] transition-all duration-500">
    <span
      className="absolute top-4 end-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-eerie-black/[0.04] select-none pointer-events-none"
      aria-hidden="true"
    >
      {FAQ_NUMBERS[categoryIndex]}
    </span>

    <div className="relative p-5 flex items-center gap-3 rtl-native-flex">
      <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
        <Icon className="w-5 h-5 text-tufts-blue" />
      </div>
      <div>
        <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mb-0.5">
          {FAQ_NUMBERS[categoryIndex]}
        </p>
        <h3 className="text-lg lg:text-xl font-semibold text-eerie-black">{title}</h3>
      </div>
    </div>

    <div>
      {faqs.map((faq, faqIndex) => (
        <FAQItem
          key={faqIndex}
          question={faq.question}
          answer={faq.answer}
          steps={faq.steps}
          isOpen={openFaq === `${categoryIndex}-${faqIndex}`}
          onToggle={() => onToggle(categoryIndex, faqIndex)}
        />
      ))}
    </div>
  </div>
);

const Contact = () => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentLanguage = useMemo(() => {
    if (locale) return locale;
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('Simnetiq-language');
      if (savedLanguage) return savedLanguage;
    }
    return detectLanguageFromPath(pathname) || 'en';
  }, [locale, pathname]);

  const guideHref = currentLanguage === 'en' ? '/help/install-esim' : `/${currentLanguage}/help/install-esim`;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    type: 'contact',
    agreementAccepted: false
  });
  const [requestType, setRequestType] = useState('contact');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  }, []);

  const handleRequestTypeChange = (type) => {
    setRequestType(type);
    setFormData(prev => ({
      ...prev,
      type: type,
      agreementAccepted: false,
      message: type === 'deletion_request' ? 'Account Deletion Request' : ''
    }));
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createContactRequest({
        ...formData,
        type: requestType,
        agreementText: requestType === 'deletion_request'
          ? "I hereby request the deletion of my account and all associated data. I understand this action is irreversible and will result in the permanent loss of my purchase history, active eSIMs, and account settings."
          : ''
      });
      showToast('success', t('contact.messageSuccess', 'Your message has been sent successfully! We\'ll get back to you soon.'));
      setFormData({ name: '', email: '', message: '' });
    } catch {
      showToast('error', t('contact.messageFailed', 'Failed to send message. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, t, requestType]);

  const toggleFaq = useCallback((categoryIndex, faqIndex) => {
    const key = `${categoryIndex}-${faqIndex}`;
    setOpenFaq(prev => prev === key ? null : key);
  }, []);

  const faqCategories = useMemo(() => [
    {
      icon: SmartphoneIcon,
      title: t('contact.faq.gettingStarted', 'Getting Started'),
      faqs: [
        {
          question: t('contact.faq.whatIsEsim', 'What is an eSIM and how does it work?'),
          answer: t('contact.faq.whatIsEsimAnswer', "An eSIM (embedded SIM) is a digital SIM built into your device. Instead of inserting a physical card, you download and activate a cellular plan directly onto your device. This lets you switch carriers instantly without swapping SIMs."),
        },
        {
          question: t('contact.faq.installIos', 'How do I install an eSIM on my iPhone?'),
          answer: t('contact.faq.installIosAnswer', "Installing an eSIM on iOS is quick and easy. Make sure your device is eSIM compatible and carrier-unlocked with a stable WiFi connection."),
          steps: [
            t('contact.faq.iosStep1', 'Open Settings → Cellular (or Mobile Data)'),
            t('contact.faq.iosStep2', 'Tap Add eSIM or Add Cellular Plan'),
            t('contact.faq.iosStep3', 'Tap Use QR Code and scan the QR code from your email'),
            t('contact.faq.iosStep4', 'Choose a label for your eSIM (e.g., "Travel Data")'),
            t('contact.faq.iosStep5', 'Select your eSIM for Cellular Data'),
            t('contact.faq.iosStep6', 'Turn OFF "Allow Cellular Data Switching"'),
            t('contact.faq.iosStep7', 'Enable Data Roaming for your eSIM and you\'re ready!')
          ]
        },
        {
          question: t('contact.faq.installAndroid', 'How do I install an eSIM on Android/Samsung?'),
          answer: t('contact.faq.installAndroidAnswer', "Android installation varies by manufacturer. Here's how to install on Samsung Galaxy devices:"),
          steps: [
            t('contact.faq.androidStep1', 'Open Settings → Connections'),
            t('contact.faq.androidStep2', 'Tap SIM Manager → Add eSIM'),
            t('contact.faq.androidStep3', 'Scan the QR code from your email or app'),
            t('contact.faq.androidStep4', 'Wait for the eSIM to download and activate'),
            t('contact.faq.androidStep5', 'Go to SIM Manager → Mobile data → Select your eSIM'),
            t('contact.faq.androidStep6', 'Enable Data Roaming if required (check your plan details)')
          ]
        },
        {
          question: t('contact.faq.deviceSupport', 'Which devices support eSIM?'),
          answer: t('contact.faq.deviceSupportAnswer', 'Most modern smartphones support eSIM: iPhone XS/XR and newer, Google Pixel 3 and newer, Samsung Galaxy S20 and newer, and many others. Your device must also be carrier-unlocked. Check your device settings or contact us to confirm compatibility.')
        }
      ]
    },
    {
      icon: WifiIcon,
      title: t('contact.faq.connectivityIssues', 'Connectivity & Troubleshooting'),
      faqs: [
        {
          question: t('contact.faq.avoidRoaming', 'How can I avoid roaming charges when using eSIM?'),
          answer: t('contact.faq.avoidRoamingAnswer', "To avoid unexpected charges from your primary carrier while traveling, follow these important steps:"),
          steps: [
            t('contact.faq.roamingStep1', 'Enable Airplane Mode before leaving your home coverage area'),
            t('contact.faq.roamingStep2', 'Disable your primary SIM (Settings → Cellular → Primary SIM → Turn Off This Line)'),
            t('contact.faq.roamingStep3', 'Turn off Data Roaming for your primary SIM'),
            t('contact.faq.roamingStep4', 'Set your eSIM as the default data line'),
            t('contact.faq.roamingStep5', 'Turn OFF "Allow Cellular Data Switching" to prevent auto-switching'),
            t('contact.faq.roamingStep6', 'Use WhatsApp, Telegram, or Signal for calls/messages over data')
          ]
        },
        {
          question: t('contact.faq.notConnecting', "My eSIM isn't connecting. What should I do?"),
          answer: t('contact.faq.notConnectingAnswer', "If your eSIM isn't connecting to the network, try these troubleshooting steps:"),
          steps: [
            t('contact.faq.troubleStep1', 'Ensure you\'re in an area with network coverage'),
            t('contact.faq.troubleStep2', 'Toggle Airplane Mode on, wait 30 seconds, then off'),
            t('contact.faq.troubleStep3', 'Restart your device completely'),
            t('contact.faq.troubleStep4', 'Check that Data Roaming is enabled for your eSIM'),
            t('contact.faq.troubleStep5', 'Try manually selecting a network in Cellular settings'),
            t('contact.faq.troubleStep6', 'Verify APN settings if required (check your eSIM instructions)')
          ]
        },
        {
          question: t('contact.faq.slowSpeed', 'Why is my data speed slower than expected?'),
          answer: t('contact.faq.slowSpeedAnswer', 'Data speeds vary based on network congestion, your location, device capabilities, and plan type. Some plans may have speed limitations after certain usage. Try moving to a different location or connecting to a different network operator if available.')
        },
        {
          question: t('contact.faq.callsSms', 'Can I use my eSIM for calls and SMS?'),
          answer: t('contact.faq.callsSmsAnswer', 'Our eSIM plans are primarily data-only. For calls and messaging, use VoIP apps like WhatsApp, Telegram, FaceTime, or Skype over your data connection. These work great and often provide better call quality than traditional cellular.')
        }
      ]
    },
    {
      icon: CreditCardIcon,
      title: t('contact.faq.billingPlans', 'Billing & Plans'),
      faqs: [
        {
          question: t('contact.faq.paymentMethods', 'What payment methods do you accept?'),
          answer: t('contact.faq.paymentMethodsAnswer', 'We accept all major credit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, and various local payment methods. All payments are processed securely through Stripe.')
        },
        {
          question: t('contact.faq.refundPolicy', "Can I get a refund if I'm not satisfied?"),
          answer: t('contact.faq.refundPolicyAnswer', "Yes! We offer a 7-day money-back guarantee for unused data plans. If you haven't activated your eSIM or used any data, you can request a full refund within 7 days of purchase. Contact our support team to process your refund.")
        },
        {
          question: t('contact.faq.topUp', 'Can I add more data to my plan?'),
          answer: t('contact.faq.topUpAnswer', 'Yes, you can purchase top-up data for most plans. Go to your Dashboard, find your active eSIM, and look for the "Top Up" option. Top-ups are added to your existing eSIM — no need to install a new one.')
        },
        {
          question: t('contact.faq.unlimitedData', 'Do your plans include unlimited data?'),
          answer: t('contact.faq.unlimitedDataAnswer', 'We offer both limited and unlimited data plans. Unlimited plans may have fair usage policies (typically 1-2GB/day at full speed), after which speeds may be reduced. All limitations are clearly stated in the plan details before purchase.')
        }
      ]
    },
    {
      icon: SettingsIcon,
      title: t('contact.faq.accountManagement', 'Account & eSIM Management'),
      faqs: [
        {
          question: t('contact.faq.checkUsage', 'How do I check my data usage?'),
          answer: t('contact.faq.checkUsageAnswer', "Monitor your data usage in your Dashboard under 'My eSIMs'. You can also check usage directly on your device: iPhone: Settings → Cellular → select your eSIM. Android: Settings → Connections → Data usage.")
        },
        {
          question: t('contact.faq.deleteEsim', 'How do I delete an eSIM from my device?'),
          answer: t('contact.faq.deleteEsimAnswer', "To remove an eSIM:"),
          steps: [
            t('contact.faq.deleteStep1', 'iPhone: Go to Settings → Cellular → Select your eSIM → Delete eSIM'),
            t('contact.faq.deleteStep2', 'Android: Go to Settings → Connections → SIM Manager → Select eSIM → Remove'),
            t('contact.faq.deleteStep3', 'Note: Deleting an eSIM is permanent. You cannot reinstall the same eSIM once deleted.')
          ]
        },
        {
          question: t('contact.faq.multipleEsim', 'Can I have multiple eSIMs on my device?'),
          answer: t('contact.faq.multipleEsimAnswer', 'Yes! Most devices support storing multiple eSIMs (typically 5-8 or more). However, you can usually only have one eSIM active at a time alongside your physical SIM. Switch between eSIMs in your Cellular/SIM settings.')
        },
        {
          question: t('contact.faq.shareEsim', 'Can I transfer my eSIM to another device?'),
          answer: t('contact.faq.shareEsimAnswer', 'eSIMs are tied to the device they\'re installed on and cannot be transferred. If you need to use your data on a different device, you\'ll need to purchase a new eSIM for that device.')
        }
      ]
    }
  ], [t]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">

      {/* Page Header */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
          <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className="text-sm sm:text-base font-medium tracking-widest uppercase text-text-muted mb-4 text-start">
              {t('contact.title', 'Help Center')}
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black text-start">
              {t('contact.subtitle', "We're here to help with all your needs")}
            </h1>
            <p className="mt-2 text-text-muted text-sm leading-relaxed text-start">
              {t('contact.description', 'Find answers to common questions or send us a message. Our support team typically responds within a few hours.')}
            </p>
          </div>
        </div>
        <div className="w-full h-px bg-[var(--subtle-bg)]" />
      </div>

      {/* Main Content */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Contact Form Card — 01 */}
              <div className="lg:col-span-1">
                <div className="lg:sticky lg:top-24">
                  <div className="group relative bg-[var(--bg-secondary)] overflow-hidden hover:bg-[var(--bg-primary)] transition-all duration-500 p-5 sm:p-6">

                    <div className="relative mb-6">
                      <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
                        <SendIcon className="w-5 h-5 text-tufts-blue" />
                      </div>
                      <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 text-start">
                        {t('contact.tagGetInTouch', 'GET IN TOUCH')}
                      </p>
                      <h2 className="text-lg lg:text-xl font-semibold text-eerie-black mb-2 text-start">
                        {t('contact.sendMessage', 'Send us a Message')}
                      </h2>
                    </div>

                    <div className="flex border-b border-[var(--card-border)] mb-6">
                      <button
                        type="button"
                        onClick={() => handleRequestTypeChange('contact')}
                        className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                          requestType === 'contact' ? 'text-tufts-blue' : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {t('contact.generalInquiry', 'General Inquiry')}
                        {requestType === 'contact' && (
                          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-tufts-blue" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestTypeChange('deletion_request')}
                        className={`flex-1 pb-3 text-sm font-medium transition-colors relative ${
                          requestType === 'deletion_request' ? 'text-tufts-blue' : 'text-text-muted hover:text-text-primary'
                        }`}
                      >
                        {t('contact.deletionRequest', 'Delete Account')}
                        {requestType === 'deletion_request' && (
                          <div className="absolute bottom-0 inset-x-0 h-0.5 bg-tufts-blue" />
                        )}
                      </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-text-primary mb-2 text-start">
                          {t('contact.fullName', 'Full Name')}
                        </label>
                        <div className="relative">
                          <UserIcon className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted start-3" />
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className="w-full px-10 py-3 border border-[var(--card-border)] rounded-lg bg-[var(--bg-primary)] focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue transition-colors text-start"
                            placeholder={t('contact.fullNamePlaceholder', 'Enter your name')}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2 text-start">
                          {t('contact.emailAddress', 'Email Address')}
                        </label>
                        <div className="relative">
                          <MailIcon className="absolute top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted start-3" />
                          <input
                            type="email"
                            id="email"
                            name="email"
                            dir="ltr"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className="w-full px-10 py-3 border border-[var(--card-border)] rounded-lg bg-[var(--bg-primary)] focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue transition-colors text-start"
                            placeholder={t('contact.emailPlaceholder', 'your@email.com')}
                          />
                        </div>
                      </div>

                      {requestType === 'contact' ? (
                        <div>
                          <label htmlFor="message" className="block text-sm font-medium text-text-primary mb-2 text-start">
                            {t('contact.message', 'Message')}
                          </label>
                          <textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            required
                            rows={4}
                            className="w-full px-4 py-3 border border-[var(--card-border)] rounded-lg bg-[var(--bg-primary)] focus:ring-2 focus:ring-tufts-blue/20 focus:border-tufts-blue transition-colors resize-none text-start"
                            placeholder={t('contact.messagePlaceholder', 'How can we help you?')}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="bg-red-50 p-4 border border-red-100">
                            <h4 className="text-red-800 font-medium mb-2 text-sm">
                              {t('contact.deletionWarning', 'Account Deletion is Permanent')}
                            </h4>
                            <p className="text-red-600 text-sm leading-relaxed">
                              {t('contact.deletionAgreement', "I hereby request the deletion of my account and all associated data. I understand this action is irreversible and will result in the permanent loss of my purchase history, active eSIMs, and account settings.")}
                            </p>
                          </div>
                          <div className="flex items-start gap-3 rtl-native-flex">
                            <div className="flex items-center h-5">
                              <input
                                id="agreementAccepted"
                                name="agreementAccepted"
                                type="checkbox"
                                checked={formData.agreementAccepted}
                                onChange={handleInputChange}
                                required
                                className="h-4 w-4 text-tufts-blue focus:ring-tufts-blue border-[var(--card-border)] rounded"
                              />
                            </div>
                            <label htmlFor="agreementAccepted" className="font-medium text-text-primary text-sm cursor-pointer select-none">
                              {t('contact.confirmDeletion', 'I understand and agree to delete my account and data')}
                            </label>
                          </div>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3.5 px-6 bg-[var(--login-bg)] text-[var(--login-text)] rounded-full font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed rtl-native-flex"
                      >
                        {isSubmitting ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                        ) : (
                          <>
                            <span>{t('contact.sendButton', 'Send Message')}</span>
                            <SendIcon className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </form>

                    <div className="mt-6 pt-6 border-t border-[var(--card-border)]">
                      <p className="text-sm text-text-muted text-start">
                        {t('contact.quickResponse', 'Or email us directly at')}
                      </p>
                      <a
                        href="mailto:support@simnetiq.store"
                        className="text-tufts-blue font-medium hover:underline block text-start"
                      >
                        support@simnetiq.store
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column: Guide CTA + FAQ Cards */}
              <div className="lg:col-span-2 space-y-4">

                {/* Installation Guide CTA */}
                <Link
                  href={guideHref}
                  className="group relative bg-[var(--bg-secondary)] overflow-hidden hover:bg-[var(--bg-primary)] transition-all duration-500 block p-5"
                >
                  <div className="flex items-center gap-4 rtl-native-flex">
                    <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                      <BookOpenIcon className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium tracking-widest uppercase text-tufts-blue mb-1">
                        {t('contact.guideCard.tag', 'INSTALLATION GUIDE')}
                      </p>
                      <p className="text-lg lg:text-xl font-semibold text-eerie-black mb-1">
                        {t('contact.guideCard.title', 'eSIM Installation Guide')}
                      </p>
                      <p className="text-text-muted text-sm leading-relaxed">
                        {t('contact.guideCard.description', 'Step-by-step instructions for iPhone, Android, and manual installation')}
                      </p>
                    </div>
                    <ArrowRightIcon className="w-5 h-5 text-tufts-blue flex-shrink-0 rtl:-scale-x-100" />
                  </div>
                </Link>

                {/* FAQ Category Cards — 02–05 */}
                {faqCategories.map((category, categoryIndex) => (
                  <FAQCategory
                    key={categoryIndex}
                    icon={category.icon}
                    title={category.title}
                    faqs={category.faqs}
                    openFaq={openFaq}
                    onToggle={toggleFaq}
                    categoryIndex={categoryIndex}
                  />
                ))}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* App Download CTA */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <BlogAppDownload
              location="contact_page"
              context={{ page: 'contact' }}
            />
          </div>
        </div>
      </div>

    </div>
  );
};

export default Contact;
