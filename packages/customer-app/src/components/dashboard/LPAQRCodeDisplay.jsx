import React, { useState, useEffect } from 'react';
import { QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import Image from 'next/image';
import { useI18n } from '@esim/shared/contexts/I18nContext';

// Generate actual QR code from LPA data using qrcode library
const generateLPAQRCode = async (lpaData) => {
  try {
    if (!lpaData) return null;
    
    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(lpaData, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrDataUrl;
  } catch {
    return null;
  }
};

// LPA QR Code Display Component for Dashboard
const LPAQRCodeDisplay = ({ lpaData }) => {
  const { t } = useI18n();
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(true);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setIsGenerating(true);
        const qrUrl = await generateLPAQRCode(lpaData);
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    if (lpaData) {
      generateQR();
    }
  }, [lpaData]);

  if (isGenerating) {
    return (
      <div className="text-center">
        <div className="w-full h-full flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tufts-blue"></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{t('dashboard.generatingQrCode', 'Generating QR Code...')}</p>
      </div>
    );
  }

  if (qrCodeUrl) {
    return (
      <div className="text-center">
        <Image
          src={qrCodeUrl} 
          alt={t('dashboard.esimLpaQrCode', 'eSIM LPA QR Code')}
          className="w-full h-full object-contain"
          width={256}
          height={256}
        />
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="w-full h-full flex items-center justify-center">
        <QrCode className="w-32 h-32 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 mt-2">{t('dashboard.qrGenerationFailed', 'QR generation failed')}</p>
    </div>
  );
};

export default LPAQRCodeDisplay;
