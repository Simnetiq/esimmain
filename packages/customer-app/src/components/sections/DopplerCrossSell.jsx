'use client';

import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

const ArrowUpRightIcon = () => (
  <svg
    className="w-3.5 h-3.5 rtl:-scale-x-100"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7 17 17 7" />
    <path d="M7 7h10v10" />
  </svg>
);

export default function DopplerCrossSell() {
  const { t } = useI18n();

  return (
    <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
      <Reveal className="max-w-3xl mx-auto">
        <div className="glass-card flex flex-col md:flex-row gap-6 items-start md:items-center rtl-native-flex">
          {/* Left: icon + text */}
          <div className="flex flex-col gap-4 flex-1">
            <div className="flex items-center gap-3 rtl-native-flex">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden">
                <Image
                  src="/images/doppler-icon.jpg"
                  alt="Doppler VPN"
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                  loading="lazy"
                />
              </div>
              <div>
                <p className="text-tufts-blue text-xs uppercase font-semibold tracking-wider">
                  {t('dopplerCrossSell.badge', 'By Simnetiq')}
                </p>
                <h3 className="text-xl font-bold text-text-primary text-start">
                  {t('dopplerCrossSell.title', 'Doppler VPN')}
                </h3>
              </div>
            </div>

            <p className="text-text-muted text-sm leading-relaxed text-start">
              {t(
                'dopplerCrossSell.description',
                'Fast, no-logs VPN powered by WireGuard on mobile and advanced VLESS via Telegram bot. All major platforms.'
              )}
            </p>

            <div className="inline-flex self-start items-center rounded-full bg-emerald-500/10 text-emerald-400 px-3 py-1 text-xs font-semibold">
              {t('dopplerCrossSell.promo', 'Use code LAUNCH20 for 20% off')}
            </div>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0">
            <a
              href="https://dopplervpn.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-tufts-blue hover:bg-tufts-blue/90 text-white ps-5 pe-1 py-1 text-sm font-semibold transition-all duration-150 rtl-native-flex"
            >
              <span>{t('dopplerCrossSell.cta', 'Try Doppler VPN')}</span>
              <span className="ms-1 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white/20 w-8 h-8">
                <ArrowUpRightIcon />
              </span>
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
