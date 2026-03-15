'use client';

import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="21" y1="17" x2="18" y2="17" />
    <line x1="20" y1="21" x2="14.29" y2="10.72" />
    <line x1="12" y1="6.6" x2="10" y2="3" />
    <line x1="14" y1="3" x2="4" y2="21" />
    <line x1="13" y1="17" x2="3" y2="17" />
  </svg>
);

const PlayIcon = () => (
  <svg className="w-4 h-4 text-current" viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M2 3.65629C2 2.15127 3.59967 1.18549 4.93149 1.88645L20.7844 10.2301C22.2091 10.9799 22.2091 13.0199 20.7844 13.7698L4.9315 22.1134C3.59968 22.8144 2 21.8486 2 20.3436V3.65629ZM19.8529 11.9999L16.2682 10.1132L14.2243 11.9999L16.2682 13.8866L19.8529 11.9999ZM14.3903 14.875L12.75 13.3608L6.75782 18.8921L14.3903 14.875ZM12.75 10.639L14.3903 9.12488L6.75782 5.10777L12.75 10.639ZM4 5.28391L11.2757 11.9999L4 18.7159V5.28391Z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4 text-tufts-blue flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const IOS_URL = 'https://apps.apple.com/gb/app/simnetiq-global-esim/id6755963262';
const GOOGLE_PLAY_URL = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL;

export default function AppDownload() {
  const { t } = useI18n();

  const hasBothPlatforms = !!GOOGLE_PLAY_URL;

  const bullets = [
    t('appDownload.bullet1', 'Activate eSIM in under 2 minutes'),
    t('appDownload.bullet2', 'Manage all your eSIMs in one place'),
    t('appDownload.bullet3', 'Real-time data usage tracking'),
    t('appDownload.bullet4', 'Top up anytime, anywhere'),
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
      <Reveal>
        <div className="glass-card flex flex-col lg:flex-row gap-8 rtl-native-flex overflow-hidden">
          {/* Left: content */}
          <div className="flex-1 flex flex-col justify-center gap-5">
            {/* Badge */}
            <span className="inline-block self-start bg-tufts-blue/10 text-tufts-blue text-xs font-semibold px-3 py-1 rounded-full">
              {hasBothPlatforms
                ? t('appDownload.badgeBoth', 'iOS & Android')
                : t('appDownload.badge', 'iOS App')}
            </span>

            {/* Headline */}
            <h2 className="text-2xl font-bold text-text-primary text-start">
              {t('appDownload.title', 'Take Simnetiq with you everywhere')}
            </h2>

            {/* Bullets */}
            <ul className="flex flex-col gap-2">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-center gap-2 rtl-native-flex">
                  <CheckIcon />
                  <span className="text-text-muted text-sm">{bullet}</span>
                </li>
              ))}
            </ul>

            {/* Download buttons */}
            <div className="flex flex-col sm:flex-row gap-3 rtl-native-flex">
              <a
                href={IOS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[#f5f5f5] text-[#0a0a0a] ps-5 pe-1 py-1 text-sm font-semibold shadow-sm transition-all duration-150 hover:bg-white hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
              >
                <span className="flex-1 text-center">{t('appDownload.appStore', 'App Store')}</span>
                <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-black/10 w-8 h-8">
                  <AppleIcon />
                </span>
              </a>

              {hasBothPlatforms && (
                <a
                  href={GOOGLE_PLAY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full bg-white/10 border border-white/20 text-text-primary ps-5 pe-1 py-1 text-sm font-semibold transition-all duration-150 hover:bg-white/20 hover:scale-[1.02] w-full sm:w-auto rtl-native-flex"
                >
                  <span className="flex-1 text-center">{t('appDownload.googlePlay', 'Google Play')}</span>
                  <span className="ms-2.5 flex-shrink-0 inline-flex items-center justify-center rounded-full bg-white/10 w-8 h-8">
                    <PlayIcon />
                  </span>
                </a>
              )}
            </div>
          </div>

          {/* Right: phone mockup */}
          <div className="lg:w-64 xl:w-80 flex-shrink-0">
            <div className="relative w-full aspect-[3/4] overflow-hidden">
              <Image
                src="/images/blog.avif"
                alt="Simnetiq app"
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 1024px) 100vw, 320px"
              />
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
