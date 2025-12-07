import React, { useState } from 'react';
import { CreditCard, Edit3, Trash2, Plus, MapPin, Building, User, Hash } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { formatPrice } from '@esim/shared/utils/priceUtils';

const WithdrawalSection = ({ 
  hasBankAccount, 
  checkingBankAccount, 
  referralStats, 
  onWithdrawClick,
  bankAccountDetails = null,
  userCountry = 'US',
  onEditBankAccount,
  onDeleteBankAccount,
  onAddBankAccount
}) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  
  // Detect current language from URL
  const currentLanguage = detectLanguageFromPath(pathname) || locale || 'en';
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Country-specific payment method configurations
  const getPaymentMethods = (country) => {
    const methods = {
      'US': [
        { type: 'bank', label: t('affiliate.bankAccountACH', 'Bank Account (ACH)'), fields: ['routing', 'account'] },
        { type: 'card', label: t('affiliate.debitCard', 'Debit Card'), fields: ['card'] }
      ],
      'GB': [
        { type: 'bank', label: t('affiliate.bankAccount', 'Bank Account'), fields: ['sort_code', 'account'] },
        { type: 'iban', label: t('affiliate.iban', 'IBAN'), fields: ['iban'] }
      ],
      'DE': [
        { type: 'iban', label: t('affiliate.iban', 'IBAN'), fields: ['iban'] },
        { type: 'bank', label: t('affiliate.bankAccount', 'Bank Account'), fields: ['bic', 'iban'] }
      ],
      'FR': [
        { type: 'iban', label: t('affiliate.iban', 'IBAN'), fields: ['iban'] },
        { type: 'rib', label: t('affiliate.rib', 'RIB'), fields: ['bank_code', 'branch_code', 'account', 'key'] }
      ],
      'ES': [
        { type: 'iban', label: t('affiliate.iban', 'IBAN'), fields: ['iban'] }
      ],
      'IT': [
        { type: 'iban', label: t('affiliate.iban', 'IBAN'), fields: ['iban'] }
      ],
      'CA': [
        { type: 'bank', label: t('affiliate.bankAccount', 'Bank Account'), fields: ['transit', 'institution', 'account'] }
      ],
      'AU': [
        { type: 'bank', label: t('affiliate.bankAccountBSB', 'Bank Account (BSB)'), fields: ['bsb', 'account'] }
      ]
    };
    
    return methods[country] || methods['US'];
  };

  const formatAccountDetails = (details) => {
    if (!details) return null;
    
    switch (details.type) {
      case 'iban':
        return {
          title: t('affiliate.ibanAccount', 'IBAN Account'),
          icon: Building,
          fields: [
            { label: t('affiliate.iban', 'IBAN'), value: details.iban ? `****${details.iban.slice(-4)}` : t('affiliate.notAvailable', 'N/A') },
            { label: t('affiliate.bankName', 'Bank Name'), value: details.bankName || t('affiliate.notAvailable', 'N/A') }
          ]
        };
      case 'bank':
        if (userCountry === 'US') {
          return {
            title: t('affiliate.usBankAccount', 'US Bank Account'),
            icon: Building,
            fields: [
              { label: t('affiliate.bankName', 'Bank Name'), value: details.bankName || t('affiliate.notAvailable', 'N/A') },
              { label: t('affiliate.routingNumber', 'Routing Number'), value: details.routing ? `****${details.routing.slice(-4)}` : t('affiliate.notAvailable', 'N/A') },
              { label: t('affiliate.accountNumber', 'Account Number'), value: details.account ? `****${details.account.slice(-4)}` : t('affiliate.notAvailable', 'N/A') }
            ]
          };
        } else if (userCountry === 'GB') {
          return {
            title: t('affiliate.ukBankAccount', 'UK Bank Account'),
            icon: Building,
            fields: [
              { label: t('affiliate.bankName', 'Bank Name'), value: details.bankName || t('affiliate.notAvailable', 'N/A') },
              { label: t('affiliate.sortCode', 'Sort Code'), value: details.sortCode || t('affiliate.notAvailable', 'N/A') },
              { label: t('affiliate.accountNumber', 'Account Number'), value: details.account ? `****${details.account.slice(-4)}` : t('affiliate.notAvailable', 'N/A') }
            ]
          };
        }
        break;
      case 'card':
        return {
          title: t('affiliate.debitCard', 'Debit Card'),
          icon: CreditCard,
          fields: [
            { label: t('affiliate.cardNumber', 'Card Number'), value: details.cardNumber ? `****${details.cardNumber.slice(-4)}` : t('affiliate.notAvailable', 'N/A') },
            { label: t('affiliate.cardHolder', 'Card Holder'), value: details.cardHolder || t('affiliate.notAvailable', 'N/A') },
            { label: t('affiliate.expires', 'Expires'), value: details.expiryDate || t('affiliate.notAvailable', 'N/A') }
          ]
        };
      default:
        return {
          title: t('affiliate.paymentMethod', 'Payment Method'),
          icon: CreditCard,
          fields: [
            { label: t('affiliate.type', 'Type'), value: details.type || t('affiliate.notAvailable', 'N/A') }
          ]
        };
    }
  };
  if (checkingBankAccount) {
    return (
      <section className="bg-white py-16" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="relative">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl border-2 border-gray-200/50 shadow-xl shadow-gray-200/50">
              <div className="px-8 pt-8 pb-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tufts-blue mx-auto mb-4"></div>
                  <p className="text-cool-black">{t('affiliate.checkingBankAccount', 'Checking bank account...')}</p>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>
        </div>
      </section>
    );
  }

  if (hasBankAccount) {
    const accountInfo = formatAccountDetails(bankAccountDetails);
    const IconComponent = accountInfo?.icon || CreditCard;
    
    return (
      <section className="bg-white py-16" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
          <div className="relative">
            <div className="absolute inset-px rounded-xl bg-white"></div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
              <div className="px-8 pt-8 pb-8">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-medium tracking-tight text-eerie-black mb-4">{t('affiliate.withdrawEarnings', 'Withdraw Your Earnings')}</h3>
                  <p className="text-cool-black mb-2">
                    {t('affiliate.transferEarnings', 'Transfer your referral earnings to your payment method')}
                  </p>
                  <p className="text-sm text-cool-black mb-6">
                    {t('affiliate.minimumWithdrawal', 'Minimum withdrawal: $50.00')}
                  </p>
                </div>

                {/* Bank Account Details Card */}
                {accountInfo && (
                  <div className="bg-gray-50 rounded-xl p-6 mb-6 max-w-md mx-auto">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <div className="bg-tufts-blue/10 p-2 rounded-lg">
                          <IconComponent className="w-5 h-5 text-tufts-blue" />
                        </div>
                        <div>
                          <h4 className="font-medium text-eerie-black">{accountInfo.title}</h4>
                          <div className="flex items-center space-x-1 text-sm text-cool-black">
                            <MapPin className="w-3 h-3" />
                            <span>{userCountry}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onEditBankAccount && onEditBankAccount(bankAccountDetails)}
                          className="p-2 text-cool-black hover:text-tufts-blue hover:bg-white rounded-lg transition-colors"
                          title={t('affiliate.editPaymentMethod', 'Edit payment method')}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onDeleteBankAccount && onDeleteBankAccount(bankAccountDetails.id)}
                          className="p-2 text-cool-black hover:text-red-600 hover:bg-white rounded-lg transition-colors"
                          title={t('affiliate.deletePaymentMethod', 'Delete payment method')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {accountInfo.fields.map((field, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-cool-black">{field.label}:</span>
                          <span className="font-medium text-eerie-black">{field.value}</span>
                        </div>
                      ))}
                    </div>
                    
                    <button
                      onClick={() => setShowAccountDetails(!showAccountDetails)}
                      className="w-full mt-4 text-xs text-tufts-blue hover:text-cobalt-blue transition-colors"
                    >
                      {showAccountDetails ? t('affiliate.hideDetails', 'Hide Details') : t('affiliate.showMoreDetails', 'Show More Details')}
                    </button>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <button
                    onClick={onWithdrawClick}
                    disabled={referralStats.totalEarnings < 50}
                    className={`${
                      referralStats.totalEarnings < 50 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg text-white font-medium transition-colors flex items-center space-x-2`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span>
                      {referralStats.totalEarnings < 50 
                        ? t('affiliate.needMore', 'Need {{amount}} more', { amount: formatPrice(50 - referralStats.totalEarnings) })
                        : t('affiliate.withdrawFunds', 'Withdraw Funds')
                      }
                    </span>
                  </button>
                  
                  <button
                    onClick={() => onAddBankAccount && onAddBankAccount()}
                    className="bg-white text-tufts-blue border-2 border-tufts-blue hover:bg-tufts-blue hover:text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2"
                  >
                    <Plus className="w-5 h-5" />
                    <span>{t('affiliate.addAnotherMethod', 'Add Another Method')}</span>
                  </button>
                </div>
              </div>
            </div>
            <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
          </div>
        </div>
      </section>
    );
  }

  const availablePaymentMethods = getPaymentMethods(userCountry);

  return (
    <section className="bg-white py-16" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-2xl px-6 lg:max-w-7xl lg:px-8">
        <div className="relative">
          <div className="absolute inset-px rounded-xl bg-white"></div>
          <div className="relative flex h-full flex-col overflow-hidden rounded-xl">
            <div className="px-8 pt-8 pb-8">
              <div className="text-center mb-8">
                <h3 className="text-xl font-medium tracking-tight text-eerie-black mb-4">{t('affiliate.addPaymentMethod', 'Add Payment Method')}</h3>
                <p className="text-cool-black mb-2">
                  {t('affiliate.addPaymentDetails', 'Add your payment details to withdraw your earnings')}
                </p>
                <div className={`flex items-center justify-center text-sm text-cool-black mb-6 ${isRTL ? 'space-x-reverse space-x-2' : 'space-x-2'}`}>
                  <MapPin className="w-4 h-4" />
                  <span>{t('affiliate.availableMethods', 'Available methods for {{country}}', { country: userCountry })}</span>
                </div>
              </div>

              {/* Payment Method Options */}
              <div className="max-w-md mx-auto space-y-3 mb-8">
                {availablePaymentMethods.map((method, index) => (
                  <button
                    key={index}
                    onClick={() => onAddBankAccount && onAddBankAccount(method.type)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="bg-tufts-blue/10 group-hover:bg-tufts-blue/20 p-2 rounded-lg transition-colors">
                        {method.type === 'iban' ? (
                          <Building className="w-5 h-5 text-tufts-blue" />
                        ) : method.type === 'card' ? (
                          <CreditCard className="w-5 h-5 text-tufts-blue" />
                        ) : (
                          <Hash className="w-5 h-5 text-tufts-blue" />
                        )}
                      </div>
                      <div className="text-left">
                        <h4 className="font-medium text-eerie-black">{method.label}</h4>
                        <p className="text-sm text-cool-black">
                          {method.type === 'iban' && t('affiliate.ibanDescription', 'International Bank Account Number')}
                          {method.type === 'card' && t('affiliate.debitCardDescription', 'Debit card for instant transfers')}
                          {method.type === 'bank' && userCountry === 'US' && t('affiliate.achBankTransfer', 'ACH bank transfer')}
                          {method.type === 'bank' && userCountry === 'GB' && t('affiliate.ukBankAccountDesc', 'UK bank account')}
                          {method.type === 'bank' && userCountry === 'CA' && t('affiliate.canadianBankAccount', 'Canadian bank account')}
                          {method.type === 'bank' && userCountry === 'AU' && t('affiliate.australianBankAccount', 'Australian bank account')}
                          {method.type === 'rib' && t('affiliate.frenchBankAccountDetails', 'French bank account details')}
                        </p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-cool-black group-hover:text-tufts-blue transition-colors" />
                  </button>
                ))}
              </div>

              {/* Additional Info */}
              <div className="text-center">
                <div className="bg-blue-50 rounded-lg p-4 mb-6 max-w-md mx-auto">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 p-1 rounded-full mt-0.5">
                      <User className="w-3 h-3 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <h5 className="text-sm font-medium text-blue-900 mb-1">{t('affiliate.secureAndEncrypted', 'Secure & Encrypted')}</h5>
                      <p className="text-xs text-blue-700">
                        {t('affiliate.securityMessage', 'All payment information is encrypted and stored securely. We never store sensitive details like full account numbers.')}
                      </p>
                    </div>
                  </div>
                </div>
                
                <p className="text-xs text-cool-black">
                  {t('affiliate.withdrawalInfo', 'Minimum withdrawal: $50.00 • Processing time: 1-3 business days')}
                </p>
              </div>
            </div>
          </div>
          <div className="pointer-events-none absolute inset-px rounded-xl shadow-sm ring-1 ring-black/5"></div>
        </div>
      </div>
    </section>
  );
};

export default WithdrawalSection;
