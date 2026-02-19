'use client';

import React from 'react';
import { CreditCard, Tag, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const PaymentSection = ({
  packageData,
  currentUser,
  processingPayment,
  onPayment,
  getLocalizedUrl,
  isRTL,
  t,
  // Promo code props
  promoCode,
  setPromoCode,
  promoResult,
  setPromoResult,
  validatingPromo,
  onValidatePromo,
}) => {
  if (!packageData) return null;

  const originalPrice = parseFloat(packageData.price);
  const finalPrice = promoResult?.valid ? promoResult.finalPrice : originalPrice;
  const hasDiscount = promoResult?.valid && finalPrice < originalPrice;

  return (
    <div className="mx-auto w-full max-w-9xl">
      <div className="mx-auto w-full max-w-7xl">
        <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
          <div>
            <p className="text-cool-black text-sm mt-2 mx-auto">
              {packageData.description || t('sharePackage.travelPackage', 'Travel Package')}
            </p>

            <div className="mt-6 max-w-2xl space-y-3">

              {/* ── Promo Code Input ─────────────────────────────────────── */}
              <div className="space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        // Clear result when user edits the code
                        if (promoResult) setPromoResult(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && promoCode.trim()) onValidatePromo();
                      }}
                      placeholder={t('sharePackage.promoPlaceholder', 'Promo code')}
                      maxLength={50}
                      disabled={validatingPromo || processingPayment}
                      className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-tufts-blue/30 focus:border-tufts-blue transition-colors disabled:bg-gray-50 disabled:text-gray-400 placeholder-gray-400"
                    />
                  </div>
                  <button
                    onClick={onValidatePromo}
                    disabled={!promoCode.trim() || validatingPromo || processingPayment}
                    className="px-4 py-2.5 bg-tufts-blue text-white text-sm font-semibold rounded-lg hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {validatingPromo
                      ? <Loader className="w-4 h-4 animate-spin" />
                      : t('sharePackage.applyPromo', 'Apply')
                    }
                  </button>
                </div>

                {/* Promo feedback */}
                {promoResult && (
                  promoResult.valid ? (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1">
                        {promoResult.discountType === 'percentage'
                          ? t('sharePackage.promoAppliedPct', '{{pct}}% off applied', { pct: promoResult.discountPercent })
                          : t('sharePackage.promoAppliedAmt', '${{amt}} off applied', { amt: promoResult.discountAmount })
                        }
                        {' — '}
                        <span className="font-semibold">{formatPrice(promoResult.finalPrice)}</span>
                        {' '}
                        <span className="line-through text-green-500/70">{formatPrice(originalPrice)}</span>
                      </span>
                      <button
                        onClick={() => { setPromoCode(''); setPromoResult(null); }}
                        className="flex-shrink-0 text-green-500 hover:text-green-700 transition-colors"
                        aria-label="Remove promo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{promoResult.error || t('sharePackage.promoInvalid', 'Invalid or expired promo code')}</span>
                    </div>
                  )
                )}
              </div>

              {/* ── Stripe Payment Button ─────────────────────────────── */}
              <button
                onClick={onPayment}
                disabled={processingPayment}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-tufts-blue hover:bg-jordy-blue/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-tufts-blue/10 rounded-lg flex items-center justify-center group-hover:bg-tufts-blue/20 transition-colors">
                    <CreditCard className="w-6 h-6 text-tufts-blue" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-eerie-black">
                      {currentUser
                        ? t('sharePackage.payNow', 'Proceed to Payment')
                        : t('sharePackage.loginToContinue', 'Log in to Continue')
                      }
                    </p>
                    <p className="text-xs text-cool-black">
                      {currentUser
                        ? t('sharePackage.secureStripe', 'Secure payment via Stripe')
                        : t('sharePackage.loginDesc', 'Sign in with Google or Apple')
                      }
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Price display */}
                  <div className="text-right">
                    {hasDiscount ? (
                      <>
                        <p className="font-bold text-eerie-black">{formatPrice(finalPrice)}</p>
                        <p className="text-xs text-gray-400 line-through">{formatPrice(originalPrice)}</p>
                      </>
                    ) : (
                      <p className="font-semibold text-eerie-black">{formatPrice(originalPrice)}</p>
                    )}
                  </div>
                  <svg className="w-8 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </button>

              {/* Terms */}
              <div className="text-center">
                <p className="text-xs text-cool-black">
                  {t('sharePackage.implicitTerms', 'By clicking "Proceed to Payment" you agree to the')}{' '}
                  <a
                    href={getLocalizedUrl('/terms-of-service')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tufts-blue hover:underline"
                  >
                    {t('sharePackage.termsOfService', 'Terms of Service')}
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full h-px bg-gray-100"></div>
    </div>
  );
};

export default PaymentSection;
