"use client";

import React, { useState } from 'react';
import { 

  MessageSquare,
  ChevronDown, 
  ChevronUp,
  Smartphone,
  CreditCard,
  Wifi,
  Settings
} from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { createContactRequest } from '@esim/shared/services/contactService';
import { getLanguageDirection, detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { usePathname } from 'next/navigation';
import BlogAppDownload from './BlogAppDownload';
import toast from 'react-hot-toast';

const Contact = () => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  
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
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await createContactRequest(formData);
      toast.success(t('contact.messageSuccess', 'Your message has been sent successfully! We\'ll get back to you soon.'));
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        message: ''
      });
    } catch {
      toast.error(t('contact.messageFailed', 'Failed to send message. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqCategories = [
    {
      icon: Smartphone,
      title: t('contact.faq.gettingStarted', 'Getting Started'),
      faqs: [
        {
          question: t('contact.faq.whatIsEsim', 'What is an eSIM and how does it work?'),
          answer: t('contact.faq.whatIsEsimAnswer', "An eSIM (embedded SIM) is a digital SIM card that's built into your device. Instead of inserting a physical SIM card, you can download and activate a cellular plan directly onto your device. This allows you to switch between carriers and plans without needing to swap physical cards.")
        },
        {
          question: t('contact.faq.deviceSupport', 'Which devices support eSIM?'),
          answer: t('contact.faq.deviceSupportAnswer', 'Most modern smartphones support eSIM, including iPhone XS and newer, Google Pixel 3 and newer, Samsung Galaxy S20 and newer, and many others. Check your device settings or contact us to confirm compatibility.')
        },
        {
          question: t('contact.faq.howToActivate', 'How do I activate my eSIM?'),
          answer: t('contact.faq.howToActivateAnswer', "After purchase, you'll receive a QR code via email. Simply scan this code with your device's camera in the cellular settings, and your eSIM will be activated automatically. Detailed instructions are provided for each device type.")
        }
      ]
    },
    {
      icon: CreditCard,
      title: t('contact.faq.billingPlans', 'Billing & Plans'),
      faqs: [
        {
          question: t('contact.faq.paymentMethods', 'What payment methods do you accept?'),
          answer: t('contact.faq.paymentMethodsAnswer', 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, Google Pay, and various local payment methods depending on your region.')
        },
        {
          question: t('contact.faq.refundPolicy', "Can I get a refund if I'm not satisfied?"),
          answer: t('contact.faq.refundPolicyAnswer', "Yes, we offer a 7-day money-back guarantee for unused data plans. If you haven't activated your eSIM or used any data, you can request a full refund within 7 days of purchase.")
        },
        {
          question: t('contact.faq.unlimitedData', 'Do your plans include unlimited data?'),
          answer: t('contact.faq.unlimitedDataAnswer', 'We offer both limited and unlimited data plans. Unlimited plans may have fair usage policies or speed throttling after certain thresholds, which are clearly stated in the plan details.')
        }
      ]
    },
    {
      icon: Wifi,
      title: t('contact.faq.connectivityIssues', 'Connectivity Issues'),
      faqs: [
        {
          question: t('contact.faq.notConnecting', "My eSIM isn't connecting to the network. What should I do?"),
          answer: t('contact.faq.notConnectingAnswer', "First, ensure you're in an area with network coverage. Try restarting your device, toggling airplane mode on/off, or manually selecting the network in your cellular settings. If issues persist, contact our support team.")
        },
        {
          question: t('contact.faq.slowSpeed', 'Why is my data speed slower than expected?'),
          answer: t('contact.faq.slowSpeedAnswer', 'Data speeds can vary based on network congestion, your location, device capabilities, and plan type. Some plans may have speed limitations or throttling after certain usage thresholds.')
        },
        {
          question: t('contact.faq.callsSms', 'Can I use my eSIM for calls and SMS?'),
          answer: t('contact.faq.callsSmsAnswer', 'Our eSIM plans are primarily data-only. However, you can use VoIP services like WhatsApp, Skype, or FaceTime for calls and messaging over your data connection.')
        }
      ]
    },
    {
      icon: Settings,
      title: t('contact.faq.accountManagement', 'Account Management'),
      faqs: [
        {
          question: t('contact.faq.checkUsage', 'How do I check my data usage?'),
          answer: t('contact.faq.checkUsageAnswer', "You can monitor your data usage through your device's settings or our mobile app. We also send notifications when you're approaching your data limit.")
        },
        {
          question: t('contact.faq.deleteEsim', 'How do I delete an eSIM from my device?'),
          answer: t('contact.faq.deleteEsimAnswer', "Go to your device's cellular settings, select the eSIM plan you want to remove, and choose 'Delete eSIM' or 'Remove Plan'. This will permanently delete the eSIM from your device.")
        }
      ]
    }
  ];

  const toggleFaq = (categoryIndex, faqIndex) => {
    const key = `${categoryIndex}-${faqIndex}`;
    setOpenFaq(openFaq === key ? null : key);
  };

  return (
    <div className="min-h-screen bg-white" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full lg:mt-20 mt-10">
          
          <div className="px-4 pt-6 lg:pt-0 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className="font-mono text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 rtl:font-bold rtl:tracking-tight">
              {t('contact.title', 'Get in touch')}
            </p>
            <h2 className="my-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
              {t('contact.subtitle', "We're here to help with all your eSIM needs")}
            </h2>
          </div>
        </div>
      </div>

         

      {/* Contact Form and FAQ Section - Integrated */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full">
          <div className="px-4 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
              
              {/* Contact Form */}
              <div className="relative">
                <div className="relative flex h-full flex-col overflow-hidden border border-gray-200/50 p-6">
                  <div className="">
                    <h2   
                      className="text-xl sm:text-2xl font-semibold text-eerie-black mb-6"
                      style={{ textAlign: isRTL ? 'right' : 'left' }}
                    >
                      {t('contact.sendMessage', 'Send us a Message')}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <label 
                          htmlFor="name" 
                          className="block text-sm lg:text-base font-medium text-cool-black mb-2"
                          style={{ textAlign: isRTL ? 'right' : 'left' }}
                        >
                          {t('contact.fullName', 'Full Name')}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            className={`input-field w-full py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                            style={{ 
                              textAlign: isRTL ? 'right' : 'left',
                              direction: isRTL ? 'rtl' : 'ltr'
                            }}
                            placeholder={t('contact.fullNamePlaceholder', 'Enter your full name')}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                        </div>
                      </div>

                      <div>
                        <label 
                          htmlFor="email" 
                          className="block text-sm lg:text-base font-medium text-cool-black mb-2"
                          style={{ textAlign: isRTL ? 'right' : 'left' }}
                        >
                          {t('contact.emailAddress', 'Email Address')}
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            required
                            className={`input-field w-full py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                            style={{ 
                              textAlign: isRTL ? 'right' : 'left',
                              direction: isRTL ? 'rtl' : 'ltr'
                            }}
                            placeholder={t('contact.emailPlaceholder', 'Enter your email address')}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                        </div>
                      </div>

                      <div>
                        <label 
                          htmlFor="message" 
                          className="block text-sm lg:text-base font-medium text-cool-black mb-2"
                          style={{ textAlign: isRTL ? 'right' : 'left' }}
                        >
                          {t('contact.message', 'Message')}
                        </label>
                        <div className="relative">
                          <MessageSquare className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-3 w-5 h-5 text-gray-400`} />
                          <textarea
                            id="message"
                            name="message"
                            value={formData.message}
                            onChange={handleInputChange}
                            required
                            rows={5}
                            className={`input-field w-full py-2 resize-none ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
                            style={{ 
                              textAlign: isRTL ? 'right' : 'left',
                              direction: isRTL ? 'rtl' : 'ltr'
                            }}
                            placeholder={t('contact.messagePlaceholder', 'Tell us how we can help you...')}
                            dir={isRTL ? 'rtl' : 'ltr'}
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn-primary w-full py-3 px-6 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <>
                            {t('contact.sending', 'Sending...')}
                          </>
                        ) : (
                          <>
                            {t('contact.sendButton', 'Send Message')}
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* FAQ Categories */}
              {faqCategories.map((category, categoryIndex) => {
                return (
                  <div key={categoryIndex} className="relative">
                    <div className="relative flex h-full flex-col overflow-hidden border border-gray-200/50 p-6">
                      <div className="">
                        <div className={`flex items-center mb-3 lg:mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <h3 className={`text-lg lg:text-xl font-medium tracking-tight text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>{category.title}</h3>
                        </div>
                        
                        <div className="space-y-3 lg:space-y-6">
                          {category.faqs.map((faq, faqIndex) => {
                            const isOpen = openFaq === `${categoryIndex}-${faqIndex}`;
                            return (
                              <div key={faqIndex} className="bg-alice-blue/50">
                                <button
                                  onClick={() => toggleFaq(categoryIndex, faqIndex)}
                                  className={`w-full px-4 py-3 flex items-center justify-between ${isRTL ? 'text-right' : 'text-left'}`}
                                >
                                  <span className={`font-medium text-eerie-black text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{faq.question}</span>
                                  {isOpen ? (
                                    <ChevronUp />
                                  ) : (
                                    <ChevronDown />
                                  )}
                                </button>
                                {isOpen && (
                                  <div className="">
                                    <p className={`text-cool-black leading-relaxed text-sm ${isRTL ? 'text-right' : 'text-left'}`}>{faq.answer}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* App Download CTA */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl w-full">
          <div className="px-4">
            <BlogAppDownload 
              language={currentLanguage}
              isRTL={isRTL}
              location="contact_page"
              context={{
                page: 'contact'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
