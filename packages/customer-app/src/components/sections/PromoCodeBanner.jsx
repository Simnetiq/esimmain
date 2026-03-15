'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';

const ClipboardIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="w-4 h-4"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export default function PromoCodeBanner({ promo }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!promo) return null;

  const localizedPath = (path) =>
    locale && locale !== 'en' ? `/${locale}${path}` : path;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(promo.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  };

  const headline = t(
    'promoBanner.headline',
    'Save {discount}% on your first eSIM',
    { discount: promo.discount_percent }
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-gradient-to-r from-[#1a1a4e] to-[#0a0a2e] p-8 lg:p-12 flex flex-col items-center gap-6 text-center">
        {/* Headline */}
        <h2 className="text-2xl lg:text-3xl font-bold text-text-primary">
          {headline}
        </h2>

        {/* Code + copy */}
        <div className="flex items-center gap-3 rtl-native-flex">
          <span className="bg-white/10 border border-white/20 rounded-full px-4 py-2 text-text-primary font-mono font-semibold tracking-wider">
            {promo.code}
          </span>
          <button
            onClick={handleCopy}
            aria-label="Copy promo code"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full px-4 py-2 text-sm text-text-primary transition-colors duration-150 rtl-native-flex"
          >
            {copied ? (
              <>
                <CheckIcon />
                {t('promoBanner.copied', 'Copied!')}
              </>
            ) : (
              <>
                <ClipboardIcon />
                {t('promoBanner.copy', 'Copy')}
              </>
            )}
          </button>
        </div>

        {/* CTA */}
        <Link
          href={localizedPath('/esim-plans')}
          className="inline-flex items-center gap-2 bg-tufts-blue hover:bg-tufts-blue/90 text-white rounded-full px-6 py-3 font-semibold transition-all duration-150 hover:scale-[1.02]"
        >
          {t('promoBanner.cta', 'Browse Plans')} →
        </Link>

        {/* Fine print */}
        <p className="text-text-muted text-xs max-w-md">
          {t(
            'promoBanner.finePrint',
            'Limited time offer. One use per customer. Cannot be combined with other offers.'
          )}
        </p>
      </div>
    </div>
  );
}
