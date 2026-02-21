'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, Wifi, Smartphone, Shield, Monitor,
  CheckCircle2, Globe, AlertCircle,
  HelpCircle, MessageCircle, ArrowLeft, Keyboard
} from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import Link from 'next/link';
import BackgroundDecor from './ui/BackgroundDecor';
import { SectionSkeleton, AccordionSkeleton } from './ui/PageSkeleton';

const Section = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-gray-200 overflow-hidden bg-white/80 backdrop-blur-sm ${className}`}>
    {children}
  </div>
);

const AccordionSection = ({ title, icon: Icon, defaultOpen = false, children, isRTL }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Section>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-9 h-9 bg-tufts-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-tufts-blue" />
          </div>
          <span className="text-base font-semibold text-gray-900">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
      </button>
      <div
        className={`border-t border-gray-100 transition-opacity duration-150 ease-out ${isOpen ? 'opacity-100 p-5' : 'opacity-0 h-0 overflow-hidden p-0'}`}
      >
        {children}
      </div>
    </Section>
  );
};

const StepList = ({ steps, isRTL }) => (
  <ol className="space-y-3">
    {steps.map((step, i) => (
      <li key={i} className={`flex gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
        <span className="flex-shrink-0 w-7 h-7 bg-tufts-blue/10 text-tufts-blue text-sm font-semibold rounded-full flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <span className="text-sm text-gray-700 leading-relaxed pt-1">{step}</span>
      </li>
    ))}
  </ol>
);

const CheckItem = ({ icon: Icon, text, isRTL }) => (
  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
    <div className="flex-shrink-0 w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center mt-0.5">
      <Icon className="w-4 h-4 text-emerald-600" />
    </div>
    <span className="text-sm text-gray-700 leading-relaxed pt-1.5">{text}</span>
  </div>
);

const TroubleshootItem = ({ question, answer, isRTL }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3.5 hover:bg-gray-50 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
      >
        <span className="text-sm font-medium text-gray-800">{question}</span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
      </button>
      <div
        className={`border-t border-gray-100 transition-opacity duration-150 ease-out ${isOpen ? 'opacity-100 px-3.5 py-3' : 'opacity-0 h-0 overflow-hidden p-0'}`}
      >
        <p className={`text-sm text-gray-600 leading-relaxed ${isRTL ? 'text-right' : ''}`}>{answer}</p>
      </div>
    </div>
  );
};

const InstallEsimGuide = ({ lpaData, matchingId }) => {
  const { t, locale, isLoading: i18nLoading } = useI18n();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const direction = useMemo(() => getLanguageDirection(locale || 'en'), [locale]);
  const isRTL = direction === 'rtl';

  // Parse LPA data into SM-DP+ and activation code
  const parsedLpa = useMemo(() => {
    if (!lpaData) return null;
    const parts = lpaData.replace(/^LPA:1\$/, '').split('$');
    if (parts.length >= 2) {
      return { smdp: parts[0], activationCode: parts[1] };
    }
    return null;
  }, [lpaData]);

  const iphoneSteps = [
    t('installGuide.iphone.step1'),
    t('installGuide.iphone.step2'),
    t('installGuide.iphone.step3'),
    t('installGuide.iphone.step4'),
    t('installGuide.iphone.step5'),
    t('installGuide.iphone.step6'),
    t('installGuide.iphone.step7'),
    t('installGuide.iphone.step8'),
  ];

  const androidSteps = [
    t('installGuide.android.step1'),
    t('installGuide.android.step2'),
    t('installGuide.android.step3'),
    t('installGuide.android.step4'),
    t('installGuide.android.step5'),
    t('installGuide.android.step6'),
    t('installGuide.android.step7'),
    t('installGuide.android.step8'),
  ];

  // Show skeleton until mounted and i18n ready
  if (!mounted || i18nLoading) {
    return (
      <div className="min-h-screen relative" dir={direction}>
        <BackgroundDecor />
        <div className="relative max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-4 pt-20">
          <SectionSkeleton lines={3} />
          <SectionSkeleton lines={4} />
          <AccordionSkeleton count={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" dir={direction}>
      <BackgroundDecor />

      {/* Content — opacity transition prevents blink on hydration */}
      <div className={`relative transition-opacity duration-150 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        {/* Header */}
        <div className="border-b border-gray-200">
          <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6">
            <Link
              href="/contact"
              className={`inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-tufts-blue transition-colors duration-150 ease-out mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <ArrowLeft className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('installGuide.backToHelp')}
            </Link>
            <h1 className={`text-2xl font-bold text-gray-900 ${isRTL ? 'text-right' : ''}`}>
              {t('installGuide.pageTitle')}
            </h1>
            <p className={`mt-1.5 text-sm text-gray-500 ${isRTL ? 'text-right' : ''}`}>
              {t('installGuide.pageSubtitle')}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-2xl mx-auto px-4 py-6 sm:px-6 space-y-4">

          {/* Introduction */}
          <Section>
            <div className="p-5">
              <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 bg-tufts-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Globe className="w-5 h-5 text-tufts-blue" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t('installGuide.intro.title')}
                </h2>
              </div>
              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-600 leading-relaxed">{t('installGuide.intro.p1')}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{t('installGuide.intro.p2')}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{t('installGuide.intro.p3')}</p>
              </div>
            </div>
          </Section>

          {/* Before You Start */}
          <Section>
            <div className="p-5">
              <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t('installGuide.beforeYouStart.title')}
                </h2>
              </div>
              <div className="space-y-3">
                <CheckItem icon={Wifi} text={t('installGuide.beforeYouStart.wifi')} isRTL={isRTL} />
                <CheckItem icon={Shield} text={t('installGuide.beforeYouStart.unlocked')} isRTL={isRTL} />
                <CheckItem icon={Globe} text={t('installGuide.beforeYouStart.vpn')} isRTL={isRTL} />
                <CheckItem icon={Monitor} text={t('installGuide.beforeYouStart.qrReady')} isRTL={isRTL} />
              </div>
            </div>
          </Section>

          {/* iPhone Installation */}
          <AccordionSection
            title={t('installGuide.iphone.title')}
            icon={Smartphone}
            defaultOpen={false}
            isRTL={isRTL}
          >
            <StepList steps={iphoneSteps} isRTL={isRTL} />
          </AccordionSection>

          {/* Android Installation */}
          <AccordionSection
            title={t('installGuide.android.title')}
            icon={Smartphone}
            defaultOpen={false}
            isRTL={isRTL}
          >
            <StepList steps={androidSteps} isRTL={isRTL} />
          </AccordionSection>

          {/* Manual Installation (LPA) */}
          <AccordionSection
            title={t('installGuide.manual.title')}
            icon={Keyboard}
            defaultOpen={!!parsedLpa}
            isRTL={isRTL}
          >
            <div className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
              <p className="text-sm text-gray-600 leading-relaxed">
                {t('installGuide.manual.description')}
              </p>

              {parsedLpa && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <span className="text-xs text-gray-400 block mb-1">{t('installGuide.manual.smdpLabel')}</span>
                    <p className={`text-sm font-mono text-gray-800 break-all ${isRTL ? 'text-left' : ''}`}>{parsedLpa.smdp}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <span className="text-xs text-gray-400 block mb-1">{t('installGuide.manual.activationCodeLabel')}</span>
                    <p className={`text-sm font-mono text-gray-800 break-all ${isRTL ? 'text-left' : ''}`}>{parsedLpa.activationCode}</p>
                  </div>
                  {matchingId && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <span className="text-xs text-gray-400 block mb-1">{t('installGuide.manual.matchingIdLabel')}</span>
                      <p className={`text-sm font-mono text-gray-800 break-all ${isRTL ? 'text-left' : ''}`}>{matchingId}</p>
                    </div>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-500 leading-relaxed">
                {t('installGuide.manual.howTo')}
              </p>
            </div>
          </AccordionSection>

          {/* Activation Notes */}
          <Section>
            <div className="p-5">
              <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t('installGuide.activation.title')}
                </h2>
              </div>
              <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-600 leading-relaxed">{t('installGuide.activation.p1')}</p>
                <p className="text-sm text-gray-600 leading-relaxed">{t('installGuide.activation.p2')}</p>
                <div className="mt-4 bg-amber-50 border border-amber-100 rounded-lg p-4">
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    {t('installGuide.activation.notActivating')}
                  </p>
                  <ul className={`space-y-1.5 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                    <li className="text-sm text-amber-700 list-disc">{t('installGuide.activation.tip1')}</li>
                    <li className="text-sm text-amber-700 list-disc">{t('installGuide.activation.tip2')}</li>
                    <li className="text-sm text-amber-700 list-disc">{t('installGuide.activation.tip3')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </Section>

          {/* Troubleshooting */}
          <AccordionSection
            title={t('installGuide.troubleshooting.title')}
            icon={HelpCircle}
            defaultOpen={false}
            isRTL={isRTL}
          >
            <div className="space-y-2">
              <TroubleshootItem
                question={t('installGuide.troubleshooting.noInternet.q')}
                answer={t('installGuide.troubleshooting.noInternet.a')}
                isRTL={isRTL}
              />
              <TroubleshootItem
                question={t('installGuide.troubleshooting.qrNotScanning.q')}
                answer={t('installGuide.troubleshooting.qrNotScanning.a')}
                isRTL={isRTL}
              />
              <TroubleshootItem
                question={t('installGuide.troubleshooting.alreadyInUse.q')}
                answer={t('installGuide.troubleshooting.alreadyInUse.a')}
                isRTL={isRTL}
              />
              <TroubleshootItem
                question={t('installGuide.troubleshooting.noSignal.q')}
                answer={t('installGuide.troubleshooting.noSignal.a')}
                isRTL={isRTL}
              />
            </div>
          </AccordionSection>

          {/* Support Section */}
          <Section>
            <div className="p-5">
              <div className={`flex items-center gap-3 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-9 h-9 bg-tufts-blue/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-tufts-blue" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t('installGuide.support.title')}
                </h2>
              </div>
              <p className={`text-sm text-gray-500 mb-4 ${isRTL ? 'text-right' : ''}`}>
                {t('installGuide.support.description')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href="https://t.me/SimnetiqSupportBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-3 p-3.5 bg-[#229ED9]/5 border border-[#229ED9]/20 rounded-xl hover:bg-[#229ED9]/10 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-10 h-10 bg-[#229ED9] rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('installGuide.support.telegram')}</p>
                    <p className="text-xs text-gray-400">@SimnetiqSupportBot</p>
                  </div>
                </a>
                <Link
                  href="/contact"
                  className={`flex items-center gap-3 p-3.5 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MessageCircle className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t('installGuide.support.contactSupport')}</p>
                    <p className="text-xs text-gray-400">{t('installGuide.support.helpCenter')}</p>
                  </div>
                </Link>
              </div>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
};

export default InstallEsimGuide;
