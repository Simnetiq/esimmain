import React from 'react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Image from 'next/image';

const HowItWorks = () => {
  const { t } = useI18n();

  const steps = [
    {
      number: 1,
      title: t('affiliate.step1Title', 'Share Your Code'),
      description: t('affiliate.step1Desc', 'Copy and share your unique referral code with friends and family'),
      bgColor: 'from-tufts-blue/10 to-tufts-blue/20',
      textColor: 'text-tufts-blue'
    },
    {
      number: 2,
      title: t('affiliate.step2Title', 'Friend Signs Up'),
      description: t('affiliate.step2Desc', 'Your friend uses your code when creating their Simnetiq account'),
      bgColor: 'from-tufts-blue/10 to-tufts-blue/20',
      textColor: 'text-tufts-blue'
    },
    {
      number: 3,
      title: t('affiliate.step3Title', 'Earn $1'),
      description: t('affiliate.step3Desc', 'You instantly earn $1 for each successful referral - no limits!'),
      bgColor: 'from-tufts-blue/10 to-tufts-blue/20',
      textColor: 'text-tufts-blue'
    }
  ];

  return (
    <section className="bg-white">
      <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
        <div className="relative">
          <div className="absolute inset-px rounded-xl bg-white"></div>
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-gray-200/50 shadow-xl shadow-gray-200/50">
            <div className="px-8 pt-8 pb-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 h-full">
                {/* Left Side - Text and Steps */}
                <div className="flex flex-col">
                  <div className="mb-8 text-start">
                    <h3 className="text-lg font-medium tracking-tight text-eerie-black mb-2">{t('affiliate.howItWorks', 'How It Works')}</h3>
                    <p className="text-cool-black text-sm">{t('affiliate.howItWorksDesc', 'Simple steps to start earning with referrals')}</p>
                  </div>

                  <div className="space-y-6 flex-1">
                    {steps.map((step) => (
                      <div key={step.number} className="flex items-start gap-4 rtl-native-flex">
                        <div className={`bg-gradient-to-br ${step.bgColor} p-3 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0`}>
                          <div className={`w-3 h-3 rounded-full ${step.textColor === 'text-blue-700' ? 'bg-blue-700' : step.textColor === 'text-tufts-blue' ? 'bg-tufts-blue' : 'bg-blue-700'}`}></div>
                        </div>
                        <div className="flex-1 text-start">
                          <h4 className="font-medium text-eerie-black mb-2 text-base">{step.title}</h4>
                          <p className="text-cool-black text-sm">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Side - Image Section */}
                <div className="lg:block hidden relative">
                  <div className="absolute inset-0 -mt-8 -mb-8 -me-8">
                      <Image src="/images/logo_icon/vwvw.avif" alt="Affiliate" className="w-full h-full object-cover rounded-e-xl" width={500} height={500} />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
