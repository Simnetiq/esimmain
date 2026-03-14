'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';

export default function DeviceCompatibility() {
  const { t } = useI18n();

  const devices = [
    {
      brand: t('devices.iphone', 'iPhone'),
      models: t('devices.iphoneModels', 'XS, XR, 11–16 series, SE 3rd gen'),
    },
    {
      brand: t('devices.samsung', 'Samsung'),
      models: t('devices.samsungModels', 'Galaxy S20+, Z Fold/Flip, A54+'),
    },
    {
      brand: t('devices.google', 'Google'),
      models: t('devices.googleModels', 'Pixel 3+, all newer models'),
    },
  ];

  return (
    <div className="py-8 bg-white/[0.03] border-t border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {devices.map((device, i) => (
            <div key={i} className="text-start">
              <p className="font-bold text-text-primary mb-1">{device.brand}</p>
              <p className="text-text-muted text-sm">{device.models}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <a
            href="#faq"
            className="text-tufts-blue text-sm hover:underline"
          >
            {t('devices.checkFaq', 'Not sure? Check FAQ')} →
          </a>
        </div>
      </div>
    </div>
  );
}
