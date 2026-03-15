'use client';

import { useState } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

const ChevronIcon = ({ isOpen }) => (
  <svg
    className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full p-6 flex items-start justify-between gap-4 text-start rtl-native-flex"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-text-primary text-sm lg:text-base leading-relaxed text-start">
          {question}
        </span>
        <span className={isOpen ? 'text-tufts-blue' : 'text-text-muted'}>
          <ChevronIcon isOpen={isOpen} />
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 pb-6">
          <p className="text-text-muted text-sm leading-relaxed text-start">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FAQSection() {
  const { t } = useI18n();

  const faqItems = [
    {
      question: t('faq.whatIsEsim', 'What is an eSIM and how does it work?'),
      answer: t(
        'faq.whatIsEsimAnswer',
        "An eSIM (embedded SIM) is a digital SIM card that's built into your device. Instead of inserting a physical SIM card, you can download and activate a cellular plan directly onto your device."
      ),
    },
    {
      question: t('faq.deviceSupport', 'Which devices support eSIM?'),
      answer: t(
        'faq.deviceSupportAnswer',
        'Most modern smartphones support eSIM, including iPhone XS and newer, Google Pixel 3 and newer, Samsung Galaxy S20 and newer, and many others.'
      ),
    },
    {
      question: t('faq.howToActivate', 'How do I activate my eSIM?'),
      answer: t(
        'faq.howToActivateAnswer',
        "After purchase, you'll receive a QR code via email. Simply scan this code with your device's camera in the cellular settings, and your eSIM will be activated automatically."
      ),
    },
    {
      question: t('faq.paymentMethods', 'What payment methods do you accept?'),
      answer: t(
        'faq.paymentMethodsAnswer',
        'We accept all major credit cards (Visa, Mastercard, American Express), Apple Pay, Google Pay, and various local payment methods.'
      ),
    },
    {
      question: t('faq.refundPolicy', "Can I get a refund if I'm not satisfied?"),
      answer: t(
        'faq.refundPolicyAnswer',
        "Yes, we offer a 7-day money-back guarantee for unused data plans. If you haven't activated your eSIM or used any data, you can request a full refund within 7 days of purchase."
      ),
    },
    {
      question: t('faq.notConnecting', "My eSIM isn't connecting to the network. What should I do?"),
      answer: t(
        'faq.notConnectingAnswer',
        "First, ensure you're in an area with network coverage. Try restarting your device, toggling airplane mode on/off, or manually selecting the network in your cellular settings."
      ),
    },
    {
      question: t('faq.callsSms', 'Can I use my eSIM for calls and SMS?'),
      answer: t(
        'faq.callsSmsAnswer',
        'Our eSIM plans are primarily data-only. However, you can use VoIP services like WhatsApp, Skype, or FaceTime for calls and messaging over your data connection.'
      ),
    },
    {
      question: t('faq.checkUsage', 'How do I check my data usage?'),
      answer: t(
        'faq.checkUsageAnswer',
        "You can monitor your data usage through your device's settings or our mobile app. We also send notifications when you're approaching your data limit."
      ),
    },
  ];

  return (
    <section id="faq" className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
      {/* Header */}
      <Reveal className="mb-10 text-start">
        <p className="text-sm font-medium tracking-widest uppercase text-text-muted mb-3">
          {t('faq.title', 'Frequently Asked Questions')}
        </p>
        <h2 className="text-2xl lg:text-3xl font-bold text-text-primary">
          {t('faq.subtitle', 'Everything you need to know about eSIM')}
        </h2>
      </Reveal>

      {/* FAQ grid */}
      <Reveal delay={100} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {faqItems.map((item, i) => (
          <FAQItem key={i} question={item.question} answer={item.answer} />
        ))}
      </Reveal>
    </section>
  );
}
