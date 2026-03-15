import React from 'react';
import QRCode from 'react-qr-code';
import { motion } from 'framer-motion';
import { Download, Share2, Copy, CheckCircle, Clock, Globe, X } from 'lucide-react';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import toast from 'react-hot-toast';

const EsimQrCode = ({ qrCodeData, orderDetails, onClose }) => {
  const { t } = useI18n();
  
  const handleDownload = () => {
    const qrCodeUrl = qrCodeData.qr_code_url || qrCodeData.qr_code;
    
    // Check if it's an LPA URL
    if (qrCodeUrl && qrCodeUrl.startsWith('lpa:')) {
      // For LPA URLs, we can't download as image, so just copy the URL
      navigator.clipboard.writeText(qrCodeUrl).then(() => {
        toast.success(t('esimQr.lpaUrlCopied', 'LPA URL copied to clipboard'));
      }).catch(() => {
        toast.error(t('esimQr.failedToCopyLpa', 'Failed to copy LPA URL'));
      });
      return;
    }
    
    // For regular QR code images
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = `esim-qr-${orderDetails?.orderId || 'code'}.png`;
      link.href = canvas.toDataURL();
      link.click();
    };
    
    img.onerror = () => {
      // If image fails to load, copy the URL instead
      navigator.clipboard.writeText(qrCodeUrl).then(() => {
        toast.success(t('esimQr.qrUrlCopied', 'QR code URL copied to clipboard'));
      }).catch(() => {
        toast.error(t('esimQr.failedToCopyQr', 'Failed to copy QR code URL'));
      });
    };
    
    img.src = qrCodeUrl;
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: t('esimQr.shareTitle', 'Your eSIM QR Code'),
          text: t('esimQr.shareText', 'Scan this QR code to activate your eSIM'),
          url: qrCodeData.qr_code_url || qrCodeData.qr_code
        });
      } catch { 
        // User cancelled or error occurred
      }
    } else {
      // Fallback: copy to clipboard
      handleCopy();
    }
  };

  const handleCopy = () => {
    const qrCodeUrl = qrCodeData.qr_code_url || qrCodeData.qr_code;
    navigator.clipboard.writeText(qrCodeUrl).then(() => {
      toast.success(t('esimQr.qrUrlCopied', 'QR code URL copied to clipboard'));
    }).catch(() => {
      toast.error(t('esimQr.failedToCopyQr', 'Failed to copy QR code URL'));
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md max-h-[90vh] overflow-hidden bg-[var(--bg-primary)] rounded-md shadow-xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded flex items-center justify-center">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  {t('esimQr.ready', 'Your eSIM is Ready!')}
                </h2>
                <p className="text-xs text-emerald-100">
                  {t('esimQr.scanInstructions', 'Scan the QR code below to activate your eSIM')}
                </p>
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-5 space-y-4">
          {/* Order Details */}
          {orderDetails && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded p-4">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-text-muted" />
                <h3 className="font-medium text-text-primary text-sm">{t('esimQr.orderDetails', 'Order Details')}</h3>
              </div>
              <div className="space-y-0">
                <div className="flex items-center justify-between py-2 border-b border-[var(--card-border)]">
                  <span className="text-sm text-text-muted">{t('esimQr.orderId', 'Order ID')}</span>
                  <span className="text-sm font-mono text-text-primary">{orderDetails.orderId}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--card-border)]">
                  <span className="text-sm text-text-muted">{t('esimQr.plan', 'Plan')}</span>
                  <span className="text-sm font-medium text-text-primary">{orderDetails.planName}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-[var(--card-border)]">
                  <span className="text-sm text-text-muted">{t('esimQr.amount', 'Amount')}</span>
                  <span className="text-sm font-semibold text-tufts-blue">{formatPrice(orderDetails.amount || 0)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-text-muted">{t('esimQr.status', 'Status')}</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                    {t('esimQr.active', 'Active')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded border-2 border-[var(--card-border)] shadow-sm">
              <QRCode
                value={qrCodeData.qr_code_url || qrCodeData.qr_code}
                size={180}
                level="H"
                includeMargin={true}
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-100 rounded p-4">
            <h4 className="font-medium text-blue-900 text-sm mb-3">{t('esimQr.howToActivate', 'How to activate')}:</h4>
            <ol className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center justify-center">1</span>
                <span className="text-sm text-blue-800">{t('esimQr.step1', 'Open your phone\'s camera app')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center justify-center">2</span>
                <span className="text-sm text-blue-800">{t('esimQr.step2', 'Point it at the QR code above')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center justify-center">3</span>
                <span className="text-sm text-blue-800">{t('esimQr.step3', 'Follow the prompts to add the eSIM')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded text-xs font-medium flex items-center justify-center">4</span>
                <span className="text-sm text-blue-800">{t('esimQr.step4', 'Your eSIM will be activated automatically')}</span>
              </li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleDownload}
              className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-tufts-blue text-white rounded hover:bg-tufts-blue/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="text-xs font-medium">
                {(qrCodeData.qr_code_url || qrCodeData.qr_code)?.startsWith('lpa:') 
                  ? t('esimQr.copy', 'Copy') 
                  : t('esimQr.download', 'Download')}
              </span>
            </button>
            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              <span className="text-xs font-medium">{t('esimQr.share', 'Share')}</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex flex-col items-center justify-center gap-1.5 px-3 py-3 bg-[var(--subtle-bg)] text-text-primary rounded hover:bg-[var(--hover-bg)] transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span className="text-xs font-medium">{t('esimQr.copy', 'Copy')}</span>
            </button>
          </div>

          {/* Validity Info */}
          <div className="flex items-center justify-center gap-2 py-3 bg-[var(--bg-secondary)] border border-[var(--card-border)] rounded">
            <Clock className="w-4 h-4 text-text-muted" />
            <p className="text-xs text-text-muted">
              {t('esimQr.validity', 'Your eSIM will be valid for {{days}} days from activation', { days: orderDetails?.validity || '30' })}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EsimQrCode;
