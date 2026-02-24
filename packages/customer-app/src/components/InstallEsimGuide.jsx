'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import Link from 'next/link';
import { SectionSkeleton, AccordionSkeleton } from './ui/PageSkeleton';

// ─── Inline SVG icons (no lucide-react) ────────────────────────────────────

const ChevronDownIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const ChevronUpIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6"/>
  </svg>
);

const ArrowLeftIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><circle cx="12" cy="20" r="1" fill="currentColor"/>
  </svg>
);

const SmartphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);

const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);

const MonitorIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const AlertCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const HelpCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/>
  </svg>
);

const MessageCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>
  </svg>
);

const KeyboardIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/>
  </svg>
);

// ─── Step number watermark ──────────────────────────────────────────────────

const StepNumber = ({ number, isRTL }) => (
  <span
    className={`absolute top-4 text-[5rem] lg:text-[6rem] font-semibold leading-none text-eerie-black/[0.04] select-none pointer-events-none ${isRTL ? 'left-4' : 'right-4'}`}
    aria-hidden="true"
  >
    {number}
  </span>
);

// ─── Flat card (FeaturesSection style) ──────────────────────────────────────

const Card = ({ children, className = '' }) => (
  <div className={`group relative bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500 ${className}`}>
    {children}
  </div>
);

// ─── Accordion card ──────────────────────────────────────────────────────────

const AccordionSection = ({ title, icon: Icon, stepNumber, defaultOpen = false, children, isRTL }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <Card>
      <StepNumber number={stepNumber} isRTL={isRTL} />
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-full flex items-center justify-between p-5 hover:bg-white/40 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse' : ''}`}
      >
        <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
          <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5 text-tufts-blue" />
          </div>
          <span className="text-lg lg:text-xl font-semibold text-eerie-black">{title}</span>
        </div>
        {isOpen
          ? <ChevronUpIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
          : <ChevronDownIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
        }
      </button>
      <div
        className={`transition-opacity duration-150 ease-out ${isOpen ? 'opacity-100 p-5' : 'opacity-0 h-0 overflow-hidden p-0'}`}
      >
        {children}
      </div>
    </Card>
  );
};

// ─── Step list ───────────────────────────────────────────────────────────────

const StepList = ({ steps, isRTL }) => (
  <ol className="space-y-3">
    {steps.map((step, i) => (
      <li key={i} className={`flex gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
        <span className="flex-shrink-0 w-7 h-7 bg-tufts-blue/10 text-tufts-blue text-sm font-semibold rounded-full flex items-center justify-center mt-0.5">
          {i + 1}
        </span>
        <span className="text-sm text-gray-500 leading-relaxed pt-1">{step}</span>
      </li>
    ))}
  </ol>
);

// ─── Check item ──────────────────────────────────────────────────────────────

const CheckItem = ({ icon: Icon, text, isRTL }) => (
  <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
    <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mt-0.5">
      <Icon className="w-5 h-5 text-tufts-blue" />
    </div>
    <span className="text-sm text-gray-500 leading-relaxed pt-3">{text}</span>
  </div>
);

// ─── Troubleshoot item ───────────────────────────────────────────────────────

const TroubleshootItem = ({ question, answer, isRTL }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between py-3.5 hover:bg-white/60 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse text-right' : 'text-left'}`}
      >
        <span className="text-sm font-medium text-eerie-black">{question}</span>
        {isOpen
          ? <ChevronUpIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3" />
          : <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0 ml-3" />
        }
      </button>
      <div
        className={`transition-opacity duration-150 ease-out ${isOpen ? 'opacity-100 pb-3.5' : 'opacity-0 h-0 overflow-hidden p-0'}`}
      >
        <p className={`text-sm text-gray-500 leading-relaxed ${isRTL ? 'text-right' : ''}`}>{answer}</p>
      </div>
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────

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
      <div className="min-h-screen bg-white" dir={direction}>
        <div className="mx-auto w-full max-w-9xl">
          <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
            <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl space-y-4">
              <SectionSkeleton lines={3} />
              <SectionSkeleton lines={4} />
              <AccordionSkeleton count={4} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-white transition-opacity duration-150 ease-out ${mounted ? 'opacity-100' : 'opacity-0'}`}
      dir={direction}
    >

      {/* Page Header */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
          <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">

            <Link
              href="/contact"
              className={`inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-tufts-blue transition-colors duration-150 ease-out mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}
            >
              <ArrowLeftIcon className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              {t('installGuide.backToHelp')}
            </Link>

            <p className={`text-xs font-medium tracking-widest uppercase text-gray-500 mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('installGuide.sectionTag', 'ESIM GUIDE')}
            </p>

            <h1 className={`text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-eerie-black ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('installGuide.pageTitle')}
            </h1>

            <p className={`mt-2 text-gray-500 text-sm leading-relaxed ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('installGuide.pageSubtitle')}
            </p>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100" />
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl space-y-4">

            {/* 01: Introduction */}
            <Card>
              <StepNumber number="01" isRTL={isRTL} />
              <div className="relative p-5 lg:p-6">
                <div className={`w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-5 ${isRTL ? 'ml-auto' : ''}`}>
                  <GlobeIcon className="w-5 h-5 text-tufts-blue" />
                </div>
                <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.intro.tag', 'WHAT IS ESIM')}
                </p>
                <h2 className={`text-lg lg:text-xl font-semibold text-eerie-black mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.intro.title')}
                </h2>
                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <p className="text-gray-500 text-sm leading-relaxed">{t('installGuide.intro.p1')}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{t('installGuide.intro.p2')}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{t('installGuide.intro.p3')}</p>
                </div>
              </div>
            </Card>

            {/* 02: Before You Start */}
            <Card>
              <StepNumber number="02" isRTL={isRTL} />
              <div className="relative p-5 lg:p-6">
                <div className={`w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-5 ${isRTL ? 'ml-auto' : ''}`}>
                  <AlertCircleIcon className="w-5 h-5 text-tufts-blue" />
                </div>
                <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.beforeYouStart.tag', 'REQUIREMENTS')}
                </p>
                <h2 className={`text-lg lg:text-xl font-semibold text-eerie-black mb-5 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.beforeYouStart.title')}
                </h2>
                <div className="space-y-4">
                  <CheckItem icon={WifiIcon} text={t('installGuide.beforeYouStart.wifi')} isRTL={isRTL} />
                  <CheckItem icon={ShieldIcon} text={t('installGuide.beforeYouStart.unlocked')} isRTL={isRTL} />
                  <CheckItem icon={GlobeIcon} text={t('installGuide.beforeYouStart.vpn')} isRTL={isRTL} />
                  <CheckItem icon={MonitorIcon} text={t('installGuide.beforeYouStart.qrReady')} isRTL={isRTL} />
                </div>
              </div>
            </Card>

            {/* 03: iPhone Installation */}
            <AccordionSection
              title={t('installGuide.iphone.title')}
              icon={SmartphoneIcon}
              stepNumber="03"
              defaultOpen={false}
              isRTL={isRTL}
            >
              <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('installGuide.iphone.tag', 'iOS INSTALLATION')}
              </p>
              <StepList steps={iphoneSteps} isRTL={isRTL} />
            </AccordionSection>

            {/* 04: Android Installation */}
            <AccordionSection
              title={t('installGuide.android.title')}
              icon={SmartphoneIcon}
              stepNumber="04"
              defaultOpen={false}
              isRTL={isRTL}
            >
              <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('installGuide.android.tag', 'ANDROID INSTALLATION')}
              </p>
              <StepList steps={androidSteps} isRTL={isRTL} />
            </AccordionSection>

            {/* 05: Manual Installation (LPA) */}
            <AccordionSection
              title={t('installGuide.manual.title')}
              icon={KeyboardIcon}
              stepNumber="05"
              defaultOpen={!!parsedLpa}
              isRTL={isRTL}
            >
              <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('installGuide.manual.tag', 'MANUAL ENTRY')}
              </p>
              <div className={`space-y-4 ${isRTL ? 'text-right' : ''}`}>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t('installGuide.manual.description')}
                </p>
                {parsedLpa && (
                  <div className="space-y-3">
                    <div className="bg-gray-100 p-3">
                      <span className="text-xs text-gray-400 block mb-1">{t('installGuide.manual.smdpLabel')}</span>
                      <p className={`text-sm font-mono text-eerie-black break-all ${isRTL ? 'text-left' : ''}`}>{parsedLpa.smdp}</p>
                    </div>
                    <div className="bg-gray-100 p-3">
                      <span className="text-xs text-gray-400 block mb-1">{t('installGuide.manual.activationCodeLabel')}</span>
                      <p className={`text-sm font-mono text-eerie-black break-all ${isRTL ? 'text-left' : ''}`}>{parsedLpa.activationCode}</p>
                    </div>
                    {matchingId && (
                      <div className="bg-gray-100 p-3">
                        <span className="text-xs text-gray-400 block mb-1">{t('installGuide.manual.matchingIdLabel')}</span>
                        <p className={`text-sm font-mono text-eerie-black break-all ${isRTL ? 'text-left' : ''}`}>{matchingId}</p>
                      </div>
                    )}
                  </div>
                )}
                <p className="text-sm text-gray-500 leading-relaxed">
                  {t('installGuide.manual.howTo')}
                </p>
              </div>
            </AccordionSection>

            {/* 06: Activation Notes */}
            <Card>
              <StepNumber number="06" isRTL={isRTL} />
              <div className="relative p-5 lg:p-6">
                <div className={`w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-5 ${isRTL ? 'ml-auto' : ''}`}>
                  <CheckCircleIcon className="w-5 h-5 text-tufts-blue" />
                </div>
                <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.activation.tag', 'ACTIVATION')}
                </p>
                <h2 className={`text-lg lg:text-xl font-semibold text-eerie-black mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.activation.title')}
                </h2>
                <div className={`space-y-3 ${isRTL ? 'text-right' : ''}`}>
                  <p className="text-sm text-gray-500 leading-relaxed">{t('installGuide.activation.p1')}</p>
                  <p className="text-sm text-gray-500 leading-relaxed">{t('installGuide.activation.p2')}</p>
                  <div className="mt-4 bg-amber-50 border border-amber-100 p-4">
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
            </Card>

            {/* 07: Troubleshooting */}
            <AccordionSection
              title={t('installGuide.troubleshooting.title')}
              icon={HelpCircleIcon}
              stepNumber="07"
              defaultOpen={false}
              isRTL={isRTL}
            >
              <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-4 ${isRTL ? 'text-right' : 'text-left'}`}>
                {t('installGuide.troubleshooting.tag', 'COMMON ISSUES')}
              </p>
              <div>
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

            {/* 08: Support */}
            <Card>
              <StepNumber number="08" isRTL={isRTL} />
              <div className="relative p-5 lg:p-6">
                <div className={`w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-5 ${isRTL ? 'ml-auto' : ''}`}>
                  <MessageCircleIcon className="w-5 h-5 text-tufts-blue" />
                </div>
                <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.support.tag', 'NEED HELP')}
                </p>
                <h2 className={`text-lg lg:text-xl font-semibold text-eerie-black mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                  {t('installGuide.support.title')}
                </h2>
                <p className={`text-sm text-gray-500 mb-5 leading-relaxed ${isRTL ? 'text-right' : ''}`}>
                  {t('installGuide.support.description')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <a
                    href="https://t.me/SimnetiqSupportBot"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-3 p-3.5 bg-[#229ED9]/5 hover:bg-[#229ED9]/10 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-10 h-10 bg-[#229ED9] flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-eerie-black">{t('installGuide.support.telegram')}</p>
                      <p className="text-xs text-gray-400">@SimnetiqSupportBot</p>
                    </div>
                  </a>
                  <Link
                    href="/contact"
                    className={`flex items-center gap-3 p-3.5 bg-gray-100 hover:bg-gray-200 transition-colors duration-150 ease-out ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <div className="w-10 h-10 bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <MessageCircleIcon className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-eerie-black">{t('installGuide.support.contactSupport')}</p>
                      <p className="text-xs text-gray-400">{t('installGuide.support.helpCenter')}</p>
                    </div>
                  </Link>
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

    </div>
  );
};

export default InstallEsimGuide;
