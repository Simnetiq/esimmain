import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { Info, QrCode, Package, User, X, Copy, ExternalLink, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const EsimDetailsModal = ({ esimDetails, onClose }) => {
  const { t, locale } = useI18n();
  const pathname = usePathname();

  // Detect language direction
  const direction = useMemo(() => {
    return getLanguageDirection(locale || 'en');
  }, [locale]);
  const isRTL = direction === 'rtl';

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(t('common.copied', '{{label}} copied!', { label }));
    }).catch(() => {
      toast.error(t('common.copyFailed', 'Failed to copy'));
    });
  };

  if (!esimDetails) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" dir={direction} onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[var(--bg-primary)] rounded-lg shadow-xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={`bg-gradient-to-r ${isRTL ? 'from-teal-500 to-emerald-500' : 'from-emerald-500 to-teal-500'} px-6 py-4`}>
          <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
            <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <Info className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{t('dashboard.esimDetailsFromAiralo', 'eSIM Details')}</h3>
                <p className="text-xs text-emerald-100">{t('dashboard.fromAiraloApi', 'From Airalo API')}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-5 space-y-4">
          {/* Basic eSIM Info */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded-lg p-4">
            <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Info className="w-4 h-4 text-text-muted" />
              <h4 className="font-medium text-text-primary">{t('dashboard.basicInformation', 'Basic Information')}</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-[var(--card-border)] ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-text-muted">{t('dashboard.iccid', 'ICCID')}</span>
                <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm font-mono font-medium text-text-primary truncate max-w-[140px]">
                    {esimDetails.iccid}
                  </span>
                  <button
                    onClick={() => copyToClipboard(esimDetails.iccid, 'ICCID')}
                    className="p-1 hover:bg-[var(--hover-bg)] rounded transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                </div>
              </div>

              <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-[var(--card-border)] ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-text-muted">{t('dashboard.matchingId', 'Matching ID')}</span>
                <span className="text-sm font-medium text-text-primary">{esimDetails.matching_id}</span>
              </div>

              <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-[var(--card-border)] ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-text-muted">{t('dashboard.createdAt', 'Created At')}</span>
                <span className="text-sm font-medium text-text-primary">
                  {new Date(esimDetails.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-[var(--card-border)] ${isRTL ? 'flex-row-reverse' : ''}`}>
                <span className="text-sm text-text-muted">{t('dashboard.recycled', 'Recycled')}</span>
                <span className={`text-sm font-medium ${esimDetails.recycled ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {esimDetails.recycled ? t('dashboard.yes', 'Yes') : t('dashboard.no', 'No')}
                </span>
              </div>
            </div>
          </div>

          {/* QR Code Information */}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
            <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <QrCode className="w-4 h-4 text-blue-600" />
              <h4 className="font-medium text-text-primary">{t('dashboard.qrCodeInformation', 'QR Code Information')}</h4>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[var(--bg-primary)] rounded border border-blue-100">
                <div className={`flex items-center justify-between mb-1 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.qrCodeData', 'QR Code Data')}</span>
                  <button
                    onClick={() => copyToClipboard(esimDetails.qrcode, 'QR Code')}
                    className="p-1 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5 text-text-muted" />
                  </button>
                </div>
                <p className={`text-xs font-mono text-text-primary break-all bg-[var(--bg-secondary)] p-2 rounded ${isRTL ? 'text-right' : 'text-left'}`}>
                  {esimDetails.qrcode}
                </p>
              </div>

              {esimDetails.qrcode_url && (
                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-blue-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.qrCodeUrl', 'QR Code URL')}</span>
                  <a
                    href={esimDetails.qrcode_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <span>{t('dashboard.openQrCode', 'Open')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}

              {esimDetails.direct_apple_installation_url && (
                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-blue-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.appleInstallationUrl', 'Apple Install')}</span>
                  <a
                    href={esimDetails.direct_apple_installation_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 ${isRTL ? 'flex-row-reverse' : ''}`}
                  >
                    <span>{t('dashboard.install', 'Install')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Package Information */}
          {esimDetails.simable && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
              <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Package className="w-4 h-4 text-emerald-600" />
                <h4 className="font-medium text-text-primary">{t('dashboard.packageInformation', 'Package Information')}</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.package', 'Package')}</span>
                  <span className="text-sm font-medium text-text-primary">{esimDetails.simable.package}</span>
                </div>

                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.data', 'Data')}</span>
                  <span className="text-sm font-medium text-text-primary">{esimDetails.simable.data}</span>
                </div>

                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.validity', 'Validity')}</span>
                  <span className="text-sm font-medium text-text-primary">
                    {esimDetails.simable.validity} {t('dashboard.days', 'days')}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.price', 'Price')}</span>
                  <span className="text-sm font-medium text-text-primary">
                    {esimDetails.simable.currency} {esimDetails.simable.price}
                  </span>
                </div>

                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.status', 'Status')}</span>
                  <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-600">
                      {esimDetails.simable.status?.name}
                    </span>
                  </div>
                </div>

                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-emerald-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.esimType', 'Type')}</span>
                  <span className="text-sm font-medium text-text-primary">{esimDetails.simable.esim_type}</span>
                </div>
              </div>
            </div>
          )}

          {/* User Information */}
          {esimDetails.simable?.user && (
            <div className="bg-purple-50 border border-purple-100 rounded-lg p-4">
              <div className={`flex items-center gap-2 mb-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <User className="w-4 h-4 text-purple-600" />
                <h4 className="font-medium text-text-primary">{t('dashboard.userInformation', 'User Information')}</h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-purple-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.name', 'Name')}</span>
                  <span className="text-sm font-medium text-text-primary">{esimDetails.simable.user.name}</span>
                </div>

                <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-purple-100 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <span className="text-sm text-text-muted">{t('dashboard.email', 'Email')}</span>
                  <span className="text-sm font-medium text-text-primary truncate max-w-[140px]">
                    {esimDetails.simable.user.email}
                  </span>
                </div>

                {esimDetails.simable.user.company && (
                  <div className={`flex items-center justify-between p-3 bg-[var(--bg-primary)] rounded border border-purple-100 sm:col-span-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm text-text-muted">{t('dashboard.company', 'Company')}</span>
                    <span className="text-sm font-medium text-text-primary">{esimDetails.simable.user.company}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-3 bg-[var(--subtle-bg)] hover:bg-[var(--hover-bg)] text-text-primary font-medium rounded-lg transition-colors"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EsimDetailsModal;
