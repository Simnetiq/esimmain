'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Phone, MessageSquare, Globe, AlertTriangle, ChevronDown } from 'lucide-react';
import {
  planHasSms,
  planHasVoice,
  getSmsCount,
  getVoiceMinutes,
  planIsRegional,
  getCoveredCountryCount,
  getFairUsagePolicy,
  getActivationPolicy,
  formatActivationPolicy
} from '@esim/shared/utils/planDisplayUtils';

/**
 * Generate flag emoji from ISO country code
 * Uses Unicode regional indicator symbols - no hardcoded data
 * @param {string} countryCode - 2-letter ISO country code
 * @returns {string} Flag emoji or globe emoji for invalid codes
 */
const getFlagEmoji = (countryCode) => {
  if (!countryCode || countryCode.length !== 2) return '🌍';
  try {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  } catch {
    return '🌍';
  }
};

const PackageStats = ({
  packageData,
  providerInfo,
  hasReferralDiscount,
  referralSettings,
  isRTL,
  currentLanguage = 'en',
  t
}) => {
  const [showCoverage, setShowCoverage] = useState(false);

  // Extract covered countries from package data
  // Uses ONLY data from packageData - NO hardcoded fallbacks
  const coveredCountries = useMemo(() => {
    if (!packageData) return [];

    // Try different sources for country codes
    const countryCodes = packageData.covered_countries ||
                         packageData.country_codes ||
                         packageData.countryCodes ||
                         [];

    // Get country names from package data if available
    const countryNames = packageData.covered_country_names || packageData.country_names || {};

    // Map codes to country info with names - use package data or ISO code
    return countryCodes.map(code => {
      const normalizedCode = typeof code === 'string' ? code.toUpperCase() : code;
      // Use name from package data, or fall back to the ISO code
      const name = countryNames[normalizedCode] || normalizedCode;
      return {
        code: normalizedCode,
        name: name,
        flag: getFlagEmoji(normalizedCode)
      };
    }).filter(c => c.code && c.code.length === 2);
  }, [packageData, currentLanguage]);

  if (!packageData) return null;

  // Extract plan details using shared utilities
  const hasSms = planHasSms(packageData);
  const hasVoice = planHasVoice(packageData);
  const smsCount = getSmsCount(packageData);
  const voiceMinutes = getVoiceMinutes(packageData);
  const isRegional = planIsRegional(packageData);
  const coveredCountryCount = getCoveredCountryCount(packageData);
  const fairUsagePolicy = getFairUsagePolicy(packageData);
  const activationPolicy = getActivationPolicy(packageData);

  // Operator info
  const operatorName = packageData.operatorName || packageData.operator_name;
  const operatorLogo = packageData.operatorLogo || packageData.operator_logo || packageData.operator_image_url;
  const operatorStyle = packageData.operatorStyle || packageData.operator_style || 'light';
  const gradientStart = packageData.operatorGradientStart || packageData.operator_gradient_start;
  const gradientEnd = packageData.operatorGradientEnd || packageData.operator_gradient_end;
  const hasGradient = gradientStart && gradientEnd;

  // Check if we have any content to show
  const hasVoiceOrSms = hasVoice || hasSms;
  const hasCoverage = isRegional && coveredCountryCount > 0;
  const hasOperatorBranding = operatorName;
  const hasAnyContent = hasVoiceOrSms || hasCoverage || fairUsagePolicy || hasOperatorBranding;

  if (!hasAnyContent) return null;

  return (
    <div className="mx-auto w-full max-w-9xl">
      <div className="mx-auto w-full max-w-7xl">
        <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl space-y-4">

          {/* Operator Branding Card - Main feature */}
          {hasOperatorBranding && (
            <div className="p-4 rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                {/* Operator Logo - pure image, fixed height */}
                {operatorLogo ? (
                  <Image
                    src={operatorLogo}
                    alt={operatorName}
                    width={80}
                    height={56}
                    className="flex-shrink-0 h-12 sm:h-14 w-auto object-contain rounded-lg"
                    quality={85}
                  />
                ) : (
                  <div className="flex-shrink-0 h-12 sm:h-14 aspect-square flex items-center justify-center text-text-muted text-lg font-bold rounded-lg" style={{ backgroundColor: 'var(--subtle-bg)' }}>
                    {operatorName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-base sm:text-lg">
                    <span className="text-text-primary">{t('sharePackage.poweredBy', 'Powered by')} </span>
                    <span
                      className="font-semibold"
                      style={{
                        background: hasGradient
                          ? `linear-gradient(135deg, ${gradientStart}, ${gradientEnd})`
                          : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      {operatorName}
                    </span>
                  </p>
                  <p className="text-sm text-text-muted">
                    {formatActivationPolicy(activationPolicy)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Voice & SMS Row (if applicable) */}
          {hasVoiceOrSms && (
            <div className={`grid ${hasVoice && hasSms ? 'grid-cols-2' : 'grid-cols-1'} gap-3`}>
              {hasVoice && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.15)' }}>
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)' }}>
                      <Phone className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-green-600 font-medium">{t('sharePackage.voiceCalls', 'Voice Calls')}</div>
                      <div className="font-semibold text-green-800">
                        {voiceMinutes} {t('sharePackage.minutes', 'min')}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {hasSms && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)' }}>
                  <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(59, 130, 246, 0.15)' }}>
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs text-blue-600 font-medium">{t('sharePackage.sms', 'SMS Messages')}</div>
                      <div className="font-semibold text-blue-800">
                        {smsCount} SMS
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Coverage Row (for regional/global plans) - Collapsible */}
          {hasCoverage && (
            <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
              {/* Clickable Header */}
              <button
                onClick={() => setShowCoverage(!showCoverage)}
                className={`w-full p-4 flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''} theme-hover transition-colors`}
              >
                {/* Stacked Country Flags - Avatar Style */}
                <div className="flex-shrink-0 flex items-center">
                  <div className={`flex ${isRTL ? '-space-x-reverse' : ''} -space-x-4`}>
                    {coveredCountries.slice(0, 4).map((country, index) => (
                      <div
                        key={country.code || index}
                        className="w-10 h-10 rounded-full bg-white border-2 border-white flex items-center justify-center text-xl shadow-md"
                        style={{ zIndex: 4 - index }}
                      >
                        {country.flag}
                      </div>
                    ))}
                    {coveredCountryCount > 4 && (
                      <div
                        className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-semibold text-text-muted shadow-md"
                        style={{ backgroundColor: 'var(--subtle-bg)', borderColor: 'var(--bg-primary)' }}
                        style={{ zIndex: 0 }}
                      >
                        +{coveredCountryCount - 4}
                      </div>
                    )}
                  </div>
                </div>

                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                  <p className="text-base sm:text-lg">
                    <span className="text-text-primary">{t('sharePackage.coverageIn', 'Coverage in')} </span>
                    <span
                      className="font-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text'
                      }}
                    >
                      {coveredCountryCount} {coveredCountryCount === 1
                        ? t('sharePackage.country', 'country')
                        : t('sharePackage.countries', 'countries')}
                    </span>
                  </p>
                  <p className="text-sm text-text-muted">
                    {t('sharePackage.tapToView', 'Tap to view all countries')}
                  </p>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-text-muted transition-transform duration-200 ${showCoverage ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Expandable Countries List */}
              {showCoverage && coveredCountries.length > 0 && (
                <div className="px-4 pb-4" style={{ borderTop: '1px solid var(--subtle-border)' }}>
                  <div className="pt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {coveredCountries.map((country, index) => (
                      <div
                        key={country.code || index}
                        className={`flex items-center gap-2 py-2 px-3 rounded-lg ${isRTL ? 'flex-row-reverse' : ''}`}
                        style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--subtle-border)' }}
                      >
                        <span className="text-lg">{country.flag}</span>
                        <span className="text-sm text-text-primary truncate">{country.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fair Usage Policy (for unlimited plans) */}
          {fairUsagePolicy && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(245, 158, 11, 0.15)' }}>
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="text-sm font-medium text-amber-800">
                    {t('sharePackage.fairUsage', 'Fair Usage Policy')}
                  </div>
                  <p className="text-sm text-amber-700 mt-0.5">
                    {fairUsagePolicy}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="w-full h-px" style={{ backgroundColor: 'var(--divider)' }}></div>
    </div>
  );
};

export default PackageStats;
