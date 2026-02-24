'use client';

import React from 'react';
import Link from 'next/link';

const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

const ActivationInstructions = ({ isRTL, t }) => {
  return (
    <>
      {/* How to Use Section - Header */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
          <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className={`text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500 ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('sharePackage.howToUse', 'How to Use')}
            </p>
            <h3 className={`mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl ${isRTL ? 'text-right' : 'text-left'}`}>
              {t('sharePackage.activationSteps', 'Activate Your eSIM in Minutes')}
            </h3>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100" />
      </div>

      {/* Activation Guide Card */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <Link
              href="/help/install-esim"
              className="group relative block bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500"
            >
              <div className="relative p-6 lg:p-10">
                <div className="relative">
                  <div className={`w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 ${isRTL ? 'ml-auto' : ''}`}>
                    <svg className="w-5 h-5 text-tufts-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
                    </svg>
                  </div>

                  <p className={`text-xs font-medium tracking-widest uppercase text-tufts-blue mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('activation.howToActivateTag', 'HOW TO ACTIVATE')}
                  </p>
                  <h3 className={`text-xl lg:text-2xl font-semibold text-eerie-black mb-3 tracking-tight ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('activation.activateTitle', 'Activate your eSIM in minutes')}
                  </h3>
                  <p className={`text-gray-500 text-sm sm:text-base leading-relaxed max-w-lg ${isRTL ? 'text-right' : 'text-left'}`}>
                    {t('activation.activateDesc', 'Step-by-step guide for iPhone & Android — scan a QR code and get connected instantly.')}
                  </p>

                  <div className={`mt-5 inline-flex items-center gap-2 text-sm font-medium text-tufts-blue ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span>{t('activation.viewGuide', 'View install guide')}</span>
                    <ArrowRightIcon className={`w-4 h-4 group-hover:translate-x-1 transition-transform duration-200 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100" />
      </div>
    </>
  );
};

export default ActivationInstructions;
