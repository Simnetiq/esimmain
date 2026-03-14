'use client';

import Link from 'next/link';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

export default function FinalCTA({ promo }) {
  const { t, locale } = useI18n();

  const localizedPath = (path) =>
    locale && locale !== 'en' ? `/${locale}${path}` : path;

  return (
    <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
      <Reveal>
        <div className="bg-gradient-to-r from-[#1a1a4e] via-tufts-blue to-[#4975D4] rounded-2xl py-16 lg:py-24 px-8 flex flex-col items-center text-center gap-6">
          {/* Headline */}
          <h2 className="text-3xl lg:text-5xl font-bold text-white max-w-3xl leading-tight">
            {t('finalCta.title', 'Stay connected, wherever you go')}
          </h2>

          {/* Subtitle */}
          <p className="text-lg text-white/80 max-w-xl">
            {t(
              'finalCta.subtitle',
              'Instant eSIM activation for 200+ countries. No SIM cards, no roaming fees.'
            )}
          </p>

          {/* Dual CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 rtl-native-flex">
            <Link
              href={localizedPath('/esim-plans')}
              className="inline-flex items-center justify-center rounded-full bg-white text-[#0a0a0a] px-8 py-3 font-semibold transition-all duration-150 hover:bg-white/90 hover:scale-[1.02]"
            >
              {t('finalCta.browsePlans', 'Browse Plans')}
            </Link>
            <Link
              href={localizedPath('/esim-plans')}
              className="inline-flex items-center justify-center rounded-full border border-white/30 text-white px-8 py-3 font-semibold transition-all duration-150 hover:bg-white/10 hover:scale-[1.02]"
            >
              {t('finalCta.downloadApp', 'Download App')}
            </Link>
          </div>

          {/* Promo reminder */}
          {promo && (
            <p className="text-white/60 text-sm">
              {t(
                'finalCta.promoReminder',
                'Use code {code} for {discount}% off your first eSIM',
                { code: promo.code, discount: promo.discount_percent }
              )}
            </p>
          )}
        </div>
      </Reveal>
    </section>
  );
}
