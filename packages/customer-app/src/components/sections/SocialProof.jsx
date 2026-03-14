'use client';

import { useI18n } from '@esim/shared/contexts/I18nContext';
import Reveal from '../ui/Reveal';

const StarIcon = () => (
  <svg
    className="w-6 h-6 text-yellow-400"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

const AppleIcon = () => (
  <svg
    className="w-4 h-4 text-text-muted inline-block"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="21" y1="17" x2="18" y2="17" />
    <line x1="20" y1="21" x2="14.29" y2="10.72" />
    <line x1="12" y1="6.6" x2="10" y2="3" />
    <line x1="14" y1="3" x2="4" y2="21" />
    <line x1="13" y1="17" x2="3" y2="17" />
  </svg>
);

export default function SocialProof() {
  const { t } = useI18n();

  return (
    <section className="max-w-7xl mx-auto px-4 py-16 lg:py-24">
      <Reveal className="max-w-3xl mx-auto text-center">
        {/* Stars + rating */}
        <div className="flex items-center justify-center gap-2 mb-2 rtl-native-flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <StarIcon key={i} />
          ))}
          <span className="text-2xl font-bold text-text-primary ms-2">4.5</span>
        </div>

        {/* App Store label */}
        <div className="flex items-center justify-center gap-1.5 mb-6 rtl-native-flex">
          <AppleIcon />
          <span className="text-text-muted text-sm">App Store</span>
        </div>

        {/* Tagline */}
        <p className="text-text-muted">
          {t('socialProof.tagline', 'Trusted by travelers in 200+ countries worldwide')}
        </p>
      </Reveal>
    </section>
  );
}
