'use client';

import React from 'react';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';

const ActivationInstructions = ({ isRTL, t }) => {
  return (
    <>
      {/* How to Use Section - Header */}
      <div className="mx-auto w-full max-w-9xl">
        <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
          <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <p className="text-sm max-w-2xl sm:text-base font-medium tracking-widest uppercase text-gray-500">
              {t('sharePackage.howToUse', 'How to Use')}
            </p>
            <h3 className="mt-4 text-xl sm:text-2xl lg:text-3xl xl:text-4xl tracking-tight font-semibold text-pretty text-eerie-black max-w-5xl">
              {t('sharePackage.activationSteps', 'Activate Your eSIM in Minutes')}
            </h3>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100"></div>
      </div>

      {/* iOS and Android Instructions */}
      <div className="mx-auto w-full max-w-9xl activation-section">
        <div className="mx-auto w-full max-w-7xl">
          <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* iOS Instructions */}
              <div className="border border-gray-200 p-6">
                <div className={`flex justify-start items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img
                    src="/images/logo_icon/apple.svg"
                    alt="iOS"
                    width="32"
                    height="32"
                    className="w-8 h-8"
                  />
                  <h4 className="text-xl font-semibold text-eerie-black">
                    {t('sharePackage.iosInstructions', 'iOS Instructions')}
                  </h4>
                </div>

                <div className="space-y-4">
                  <InstructionStep
                    number={1}
                    text={t('sharePackage.iosStep1', 'Open Settings → Cellular → Add eSIM')}
                    isRTL={isRTL}
                  />
                  <InstructionStep
                    number={2}
                    text={t('sharePackage.iosStep2', 'Scan the QR code you received via email')}
                    isRTL={isRTL}
                  />
                  <InstructionStep
                    number={3}
                    text={t('sharePackage.iosStep3', 'Label your eSIM and set it as your default line')}
                    isRTL={isRTL}
                  />
                  <InstructionStep
                    number={4}
                    text={t('sharePackage.iosStep4', "Turn on Data Roaming for your eSIM and you're ready!")}
                    isRTL={isRTL}
                  />
                </div>

                <a
                  href={appStoreLinks.ios}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 btn-primary text-white shadow-sm inline-flex items-center w-full justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src="/images/logo_icon/apple.svg"
                    alt="iOS"
                    width="20"
                    height="20"
                    className={isRTL ? 'w-5 h-5 ml-2' : 'w-5 h-5 mr-2'}
                  />
                  <span className="text-base">{t('sharePackage.downloadIOS', 'Download on iOS')}</span>
                </a>
              </div>

              {/* Android Instructions */}
              <div className="border border-gray-200 p-6">
                <div className={`flex justify-start items-center gap-3 mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <img
                    src="/images/logo_icon/android.svg"
                    alt="Android"
                    width="32"
                    height="32"
                    className="w-8 h-8"
                  />
                  <h4 className="text-xl font-semibold text-eerie-black">
                    {t('sharePackage.androidInstructions', 'Android Instructions')}
                  </h4>
                </div>

                <div className="space-y-4">
                  <InstructionStep
                    number={1}
                    text={t('sharePackage.androidStep1', 'Open Settings → Network & Internet → SIMs → Add SIM')}
                    isRTL={isRTL}
                  />
                  <InstructionStep
                    number={2}
                    text={t('sharePackage.androidStep2', 'Select "Download a SIM instead?" and scan QR code')}
                    isRTL={isRTL}
                  />
                  <InstructionStep
                    number={3}
                    text={t('sharePackage.androidStep3', 'Name your eSIM and enable it')}
                    isRTL={isRTL}
                  />
                  <InstructionStep
                    number={4}
                    text={t('sharePackage.androidStep4', 'Enable Mobile Data and Data Roaming for your eSIM')}
                    isRTL={isRTL}
                  />
                </div>

                <a
                  href={appStoreLinks.android}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`mt-6 btn-primary text-white shadow-sm inline-flex items-center w-full justify-center ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <img
                    src="/images/logo_icon/android.svg"
                    alt="Android"
                    width="18"
                    height="18"
                    className={isRTL ? 'w-4 h-4 ml-2' : 'w-4 h-4 mr-2'}
                  />
                  <span className="text-base">{t('sharePackage.downloadAndroid', 'Download on Android')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full h-px bg-gray-100"></div>
      </div>
    </>
  );
};

// Helper component for instruction steps
const InstructionStep = ({ number, text, isRTL }) => (
  <div className={`flex justify-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-tufts-blue text-white flex items-center justify-center text-sm font-semibold">
      {number}
    </div>
    <div>
      <p className="text-sm text-cool-black">{text}</p>
    </div>
  </div>
);

export default ActivationInstructions;
