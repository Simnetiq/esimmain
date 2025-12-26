'use client';

import React from 'react';
import { CreditCard } from 'lucide-react';

const PaymentSection = ({
  packageData,
  currentUser,
  processingPayment,
  onPayment,
  getLocalizedUrl,
  isRTL,
  t
}) => {
  if (!packageData) return null;

  return (
    <div className="mx-auto w-full max-w-9xl">
      <div className="mx-auto w-full max-w-7xl">
        <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
          <div>
            <p className="text-cool-black text-sm mt-2 mx-auto">
              {packageData.description || t('sharePackage.travelPackage', 'Travel Package')}
            </p>

            {/* Payment Button */}
            <div className="mt-6 max-w-2xl space-y-4">
              {/* Stripe Payment Button */}
              <button
                onClick={onPayment}
                disabled={processingPayment}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-tufts-blue hover:bg-jordy-blue/5 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className={`flex items-center gap-3`}>
                  <div className="w-12 h-12 bg-tufts-blue/10 rounded-lg flex items-center justify-center group-hover:bg-tufts-blue/20 transition-colors">
                    <CreditCard className="w-6 h-6 text-tufts-blue" />
                  </div>
                  <div>
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
                <div className="flex items-center gap-2">
                  <svg className="w-8 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="2" y="5" width="20" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path d="M2 10h20" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </div>
              </button>

              {/* Terms and Conditions */}
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
