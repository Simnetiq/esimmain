import React, { useState } from 'react';
import { QrCode, Eye, Smartphone, Download, Clock, Wifi, Phone, MessageSquare, Info, ChevronDown, ChevronUp, BookOpen, Settings } from 'lucide-react';
import LPAQRCodeDisplay from './LPAQRCodeDisplay';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import Image from 'next/image';

const QRCodeModal = ({ 
  show, 
  selectedOrder, 
  onClose, 
  onCheckEsimDetails, 
  onCheckEsimUsage, 
  loadingEsimDetails, 
  loadingEsimUsage,
  onDeleteOrder 
}) => {
  const { t, locale } = useI18n();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showApnSettings, setShowApnSettings] = useState(false);
  
  const handleDelete = () => {
    if (window.confirm(t('dashboard.confirmDelete', 'Are you sure you want to delete this eSIM? This action cannot be undone.'))) {
      onDeleteOrder?.(selectedOrder);
      onClose();
    }
  };

  if (!show || !selectedOrder) return null;

  // Get plan details
  const planDetails = selectedOrder.planDetails || {};
  const installation = selectedOrder.installation || {};
  const apnInfo = installation.apn || {};
  
  // Get installation instructions
  const getInstallationHtml = () => {
    if (installation.qrcode) return installation.qrcode;
    if (installation.manual) return installation.manual;
    return null;
  };
  
  // Get installation guide URL
  const getGuideUrl = () => {
    if (!installation.guides) return null;
    return installation.guides[locale] || installation.guides.en || Object.values(installation.guides)[0];
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-lg shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-tufts-blue to-blue-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">{t('dashboard.esimQrCode', 'eSIM QR Code')}</h3>
                <p className="text-xs text-blue-100">{selectedOrder.countryName || selectedOrder.countryCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-5 space-y-4">
          {/* Plan Summary Card */}
          <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">{selectedOrder.planName || t('dashboard.unknownPlan', 'Unknown Plan')}</h4>
            
            {/* Plan Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {/* Data */}
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-tufts-blue" />
                <span className="text-gray-600">{planDetails.data || `${planDetails.dataAmountMb || 0} MB`}</span>
              </div>
              
              {/* Validity */}
              {planDetails.validity && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span className="text-gray-600">{planDetails.validity} {t('dashboard.days', 'days')}</span>
                </div>
              )}
              
              {/* Voice */}
              {planDetails.voice > 0 && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-purple-500" />
                  <span className="text-gray-600">{planDetails.voice} {t('dashboard.min', 'min')}</span>
                </div>
              )}
              
              {/* SMS */}
              {planDetails.sms > 0 && (
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <span className="text-gray-600">{planDetails.sms} SMS</span>
                </div>
              )}
            </div>
            
            {/* Price */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <span className="text-sm text-gray-500">{t('dashboard.orderNumber', 'Order #{{number}}', { number: selectedOrder.packageSlug || selectedOrder.orderId || selectedOrder.id })}</span>
              <span className="text-lg font-bold text-gray-900">{formatPrice(selectedOrder.amount || 0)}</span>
            </div>
          </div>

          {/* QR Code Display */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            {selectedOrder.qrCode && selectedOrder.qrCode.qrCode ? (
              <div className="text-center">
                <div className="w-44 h-44 sm:w-48 sm:h-48 mx-auto bg-white p-3 rounded-lg border-2 border-emerald-200 shadow-sm">
                  <LPAQRCodeDisplay lpaData={selectedOrder.qrCode.qrCode} />
                </div>
                <p className="text-xs text-emerald-600 mt-3 font-medium">
                  {t('dashboard.scanToInstall', 'Scan to install eSIM')}
                </p>
                {selectedOrder.qrCode.iccid && (
                  <p className="text-xs text-gray-400 mt-1 font-mono">
                    ICCID: {selectedOrder.qrCode.iccid}
                  </p>
                )}
              </div>
            ) : selectedOrder.qrCode && selectedOrder.qrCode.qrCodeUrl ? (
              <div className="text-center">
                <div className="w-48 h-48 mx-auto bg-white p-3 rounded-lg border-2 border-blue-200 shadow-sm">
                  <Image 
                    src={selectedOrder.qrCode.qrCodeUrl} 
                    alt="eSIM QR Code" 
                    className="w-full h-full object-contain"
                    width={192}
                    height={192}
                  />
                </div>
                <p className="text-xs text-blue-600 mt-3 font-medium">
                  {t('dashboard.scanToInstall', 'Scan to install eSIM')}
                </p>
              </div>
            ) : selectedOrder.qrCode && selectedOrder.qrCode.directAppleInstallationUrl ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-purple-600" />
                </div>
                <p className="text-sm text-gray-600 mb-4">{t('dashboard.appleEsimInstallation', 'Apple eSIM Installation')}</p>
                <a 
                  href={selectedOrder.qrCode.directAppleInstallationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-sm"
                >
                  <Smartphone className="w-4 h-4" />
                  {t('dashboard.installEsim', 'Install eSIM')}
                </a>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <QrCode className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500">
                  {selectedOrder.qrCode?.fallbackReason?.includes('not available yet') 
                    ? t('dashboard.qrCodeBeingGenerated', 'QR code is being generated...') 
                    : selectedOrder.qrCode?.fallbackReason || t('dashboard.noQrCodeAvailable', 'No QR code available')}
                </p>
              </div>
            )}
          </div>

          {/* Installation Instructions Accordion */}
          {getInstallationHtml() && (
            <div>
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">{t('dashboard.installationInstructions', 'Installation Instructions')}</span>
                </div>
                {showInstructions ? (
                  <ChevronUp className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                )}
              </button>
              
              {showInstructions && (
                <div className="mt-2 p-4 bg-white border border-blue-100 rounded-lg">
                  <div 
                    className="prose prose-sm max-w-none text-gray-600 [&>p]:mb-2 [&>ol]:pl-4 [&>ol>li]:mb-1 [&>b]:text-gray-900 [&_b]:text-gray-900"
                    dangerouslySetInnerHTML={{ __html: getInstallationHtml() }}
                  />
                </div>
              )}
            </div>
          )}

          {/* APN Settings Accordion */}
          {(apnInfo.apn_value || apnInfo.ios || apnInfo.android) && (
            <div>
              <button
                onClick={() => setShowApnSettings(!showApnSettings)}
                className="w-full flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-lg transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-900">{t('dashboard.apnSettings', 'APN Settings')}</span>
                </div>
                {showApnSettings ? (
                  <ChevronUp className="w-4 h-4 text-amber-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-amber-600" />
                )}
              </button>
              
              {showApnSettings && (
                <div className="mt-2 p-4 bg-white border border-amber-100 rounded-lg space-y-3">
                  {apnInfo.apn_value && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">APN:</span>
                      <span className="text-sm font-mono font-medium text-gray-900">{apnInfo.apn_value}</span>
                    </div>
                  )}
                  {apnInfo.apn_type && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">{t('dashboard.apnType', 'Type')}:</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">{apnInfo.apn_type}</span>
                    </div>
                  )}
                  {apnInfo.ios && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-1">iOS:</p>
                      <div className="text-xs text-gray-500">
                        <span>APN: {apnInfo.ios.apn_value}</span>
                        <span className="ml-2">({apnInfo.ios.apn_type})</span>
                      </div>
                    </div>
                  )}
                  {apnInfo.android && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-1">Android:</p>
                      <div className="text-xs text-gray-500">
                        <span>APN: {apnInfo.android.apn_value}</span>
                        <span className="ml-2">({apnInfo.android.apn_type})</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Guide Link */}
          {getGuideUrl() && (
            <a
              href={getGuideUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full p-3 bg-gray-50 hover:bg-gray-100 border border-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
            >
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">{t('dashboard.viewFullGuide', 'View Full Installation Guide')}</span>
            </a>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {/* Check Usage Button */}
            {(selectedOrder.qrCode?.iccid || selectedOrder.iccid) && (
              <button
                onClick={onCheckEsimUsage}
                disabled={loadingEsimUsage}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-tufts-blue to-blue-600 text-white rounded-lg hover:from-tufts-blue/90 hover:to-blue-600/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                {loadingEsimUsage ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>{t('dashboard.checkingUsage', 'Checking Usage...')}</span>
                  </>
                ) : (
                  <>
                    <Wifi className="w-4 h-4" />
                    <span>{t('dashboard.checkDataUsage', 'Check Data Usage')}</span>
                  </>
                )}
              </button>
            )}

            {/* Secondary Actions Row */}
            <div className="flex gap-2">
              {/* Check Details */}
              {(selectedOrder.qrCode?.iccid || selectedOrder.iccid) && (
                <button
                  onClick={onCheckEsimDetails}
                  disabled={loadingEsimDetails}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                  {loadingEsimDetails ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent"></div>
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span>{t('dashboard.details', 'Details')}</span>
                </button>
              )}

              {/* Apple Install */}
              {selectedOrder.qrCode?.directAppleInstallationUrl && (
                <button
                  onClick={() => window.open(selectedOrder.qrCode.directAppleInstallationUrl, '_blank', 'noopener,noreferrer')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Apple</span>
                </button>
              )}

              {/* Download QR */}
              {selectedOrder.qrCode?.qrCodeUrl && (
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = selectedOrder.qrCode.qrCodeUrl;
                    link.download = `esim-qr-${selectedOrder.orderId || selectedOrder.id}.png`;
                    link.click();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  <span>{t('dashboard.download', 'Download')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Delete Button */}
          {onDeleteOrder && (
            <div className="border-t border-gray-200 pt-4 mt-4">
              <button
                onClick={handleDelete}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium border border-red-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{t('dashboard.deleteEsim', 'Delete eSIM')}</span>
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                {t('dashboard.deleteWarning', 'This action cannot be undone')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
