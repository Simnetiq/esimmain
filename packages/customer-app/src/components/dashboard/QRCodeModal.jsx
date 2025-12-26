import React, { useState, useEffect } from 'react';
import {
  QrCode, Smartphone, Clock, Wifi, Phone, MessageSquare,
  Copy, Check, ChevronDown, ChevronUp, X, ExternalLink,
  Signal, AlertCircle, CheckCircle, Trash2, BookOpen, Globe
} from 'lucide-react';
import LPAQRCodeDisplay from './LPAQRCodeDisplay';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import {
  getQrCodeValue,
  getAppleInstallUrl,
  getIccid,
  mapPlanDetails,
  mapPackageCountryData
} from '@esim/shared/utils/esimFieldMapper';
import { db } from '@esim/shared/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import Image from 'next/image';
import toast from 'react-hot-toast';

const QRCodeModal = ({
  show,
  selectedOrder,
  onClose,
  onCheckEsimUsage,
  loadingEsimUsage,
  onDeleteOrder,
  esimUsage
}) => {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState('qrcode');
  const [showInstructions, setShowInstructions] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [countryImage, setCountryImage] = useState(null);

  // Fetch country/region image from Firebase
  useEffect(() => {
    const fetchCountryImage = async () => {
      if (!selectedOrder) {
        setCountryImage(null);
        return;
      }

      const countryData = mapPackageCountryData(selectedOrder);
      const isRegional = countryData?.isRegional || selectedOrder.is_regional;

      // Try to get country code from various sources
      let code = countryData?.countryCode;

      // Fallback: check country_codes array (for regional plans like "asia" or single-country)
      if (!code && selectedOrder.country_codes?.length >= 1) {
        code = selectedOrder.country_codes[0];
      }

      // Get country/region name for slug-based lookup (e.g., "Ecuador" -> "ecuador", "Asia" -> "asia")
      const countryName = countryData?.countryName || selectedOrder.country_region;

      if (!code && !countryName) {
        setCountryImage(null);
        return;
      }

      try {
        let imageUrl = null;

        // 1. Try countries collection first (works for both countries AND regions like "asia")
        if (countryName && typeof countryName === 'string') {
          const nameSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const countryDoc = await getDoc(doc(db, 'countries', nameSlug));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = data.image?.url || data.photo;
          }
        }

        // 2. Try code as lowercase slug (e.g., "asia" from country_codes)
        if (!imageUrl && code) {
          const codeSlug = code.toLowerCase().replace(/\s+/g, '-');
          const countryDoc = await getDoc(doc(db, 'countries', codeSlug));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = data.image?.url || data.photo;
          }
        }

        // 3. For regional plans, also check the regions collection
        if (!imageUrl && isRegional && countryName) {
          const regionSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const regionDoc = await getDoc(doc(db, 'regions', regionSlug));
          if (regionDoc.exists()) {
            const data = regionDoc.data();
            imageUrl = data.imageUrl?.url || data.image?.url;
          }
        }

        // 4. Try uppercase ISO code as fallback (e.g., "DE")
        if (!imageUrl && code && !isRegional) {
          const countryDoc = await getDoc(doc(db, 'countries', code.toUpperCase()));
          if (countryDoc.exists()) {
            const data = countryDoc.data();
            imageUrl = data.image?.url || data.photo;
          }
        }

        setCountryImage(imageUrl || null);
      } catch (error) {
        console.error('Error fetching country image:', error);
        setCountryImage(null);
      }
    };

    if (show && selectedOrder) {
      fetchCountryImage();
    }
  }, [show, selectedOrder]);

  const handleDelete = () => {
    if (window.confirm(t('dashboard.confirmDelete', 'Are you sure you want to delete this eSIM? This action cannot be undone.'))) {
      onDeleteOrder?.(selectedOrder);
      onClose();
    }
  };

  const copyToClipboard = (text, field) => {
    if (!text) {
      toast.error(t('common.nothingToCopy', 'Nothing to copy'));
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success(t('common.copied', 'Copied to clipboard'));
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      toast.error(t('common.copyFailed', 'Failed to copy'));
    });
  };

  // Format date safely
  const formatDate = (dateValue) => {
    if (!dateValue) return '—';
    try {
      // Handle Firestore Timestamp
      if (dateValue?.toDate) {
        return dateValue.toDate().toLocaleDateString();
      }
      // Handle ISO string or timestamp
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString();
    } catch {
      return '—';
    }
  };

  if (!show || !selectedOrder) return null;

  // Get plan details using shared utility (handles both formats)
  const rawPlanDetails = selectedOrder.planDetails || {};
  const mappedPlanDetails = mapPlanDetails(rawPlanDetails);
  const planDetails = {
    ...rawPlanDetails,
    ...mappedPlanDetails
  };
  const installation = selectedOrder.installation || {};
  const airaloData = selectedOrder.airaloOrderData || selectedOrder.orderData || {};
  
  // Get QR code data using shared utility functions (handles all formats)
  const qrData = selectedOrder.qrCode || {};
  const qrCodeString = getQrCodeValue(qrData) || getQrCodeValue(selectedOrder) || '';
  const appleInstallUrl = getAppleInstallUrl(qrData) || getAppleInstallUrl(selectedOrder);
  const iccid = getIccid(selectedOrder) || '';
  const matchingId = qrData.matchingId || qrData.matching_id || selectedOrder.airaloOrderData?.sims?.[0]?.matching_id || '';
  
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

  // Usage calculations
  const getUsageData = () => {
    if (!esimUsage) return null;
    
    const safeNumber = (val) => {
      const num = Number(val);
      return isNaN(num) || num < 0 ? 0 : num;
    };
    
    // Data usage
    const total = safeNumber(esimUsage.total);
    const remaining = safeNumber(esimUsage.remaining);
    const dataUsed = Math.max(0, total - remaining);
    const dataPercentage = total > 0 ? Math.min(100, Math.round((dataUsed / total) * 100)) : 0;
    
    // Voice usage (minutes)
    const totalVoice = safeNumber(esimUsage.total_voice);
    const remainingVoice = safeNumber(esimUsage.remaining_voice);
    const voiceUsed = Math.max(0, totalVoice - remainingVoice);
    const voicePercentage = totalVoice > 0 ? Math.min(100, Math.round((voiceUsed / totalVoice) * 100)) : 0;
    const hasVoice = totalVoice > 0;
    
    // SMS/Text usage
    const totalText = safeNumber(esimUsage.total_text);
    const remainingText = safeNumber(esimUsage.remaining_text);
    const textUsed = Math.max(0, totalText - remainingText);
    const textPercentage = totalText > 0 ? Math.min(100, Math.round((textUsed / totalText) * 100)) : 0;
    const hasText = totalText > 0;
    
    return {
      // Data
      total,
      remaining,
      dataUsed,
      dataPercentage,
      // Voice
      totalVoice,
      remainingVoice,
      voiceUsed,
      voicePercentage,
      hasVoice,
      // SMS/Text
      totalText,
      remainingText,
      textUsed,
      textPercentage,
      hasText,
      // Status
      status: esimUsage.status,
      expiredAt: esimUsage.expired_at,
      isUnlimited: esimUsage.is_unlimited
    };
  };

  const formatData = (mb) => {
    if (!mb && mb !== 0) return '—';
    const absMb = Math.abs(mb);
    if (absMb >= 1024) {
      return `${(absMb / 1024).toFixed(1)} GB`;
    }
    return `${Math.round(absMb)} MB`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'ACTIVE': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle },
      'EXPIRED': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: AlertCircle },
      'FINISHED': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: AlertCircle },
      'NOT_ACTIVE': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: Clock },
    };
    return statusMap[status?.toUpperCase()] || statusMap['NOT_ACTIVE'];
  };

  const usageData = getUsageData();
  const tabs = [
    { id: 'qrcode', label: t('dashboard.qrCode', 'QR Code') },
    { id: 'details', label: t('dashboard.details', 'Details') },
    { id: 'usage', label: t('dashboard.usage', 'Usage') },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl">
        {/* Header - Clean Style */}
        <div className="relative bg-gray-900 px-6 py-5">
          {/* Header Content */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {/* Country/Region Image or Fallback Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-white/20 shadow-sm">
                {countryImage ? (
                  <Image
                    src={countryImage}
                    alt={selectedOrder.countryName || selectedOrder.country_region || 'Country'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full bg-tufts-blue flex items-center justify-center">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white leading-tight">
                  {selectedOrder.planName || t('dashboard.esim', 'eSIM')}
                </h3>
                <p className="text-sm text-gray-400 mt-0.5">
                  {selectedOrder.countryName || selectedOrder.countryCode || ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-white" />
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-5 bg-gray-800 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          
          {/* QR Code Tab */}
          {activeTab === 'qrcode' && (
            <div className="space-y-5">
              {/* QR Code Display */}
              <div className="flex justify-center">
                {qrCodeString ? (
                  <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
                    <div className="w-48 h-48">
                      <LPAQRCodeDisplay lpaData={qrCodeString} />
                    </div>
                  </div>
                ) : qrData.qrCodeUrl ? (
                  <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm">
                    <img 
                      src={qrData.qrCodeUrl} 
                      alt="QR Code" 
                      className="w-48 h-48 object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-48 h-48 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                    <div className="text-center">
                      <QrCode className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">{t('dashboard.noQrCode', 'No QR Code')}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <p className="text-center text-sm text-gray-500">
                {t('dashboard.scanToInstall', 'Scan with your phone camera to install')}
              </p>

              {/* Quick Info Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Wifi className="w-4 h-4 text-tufts-blue" />
                    <span className="text-xs text-gray-500">{t('dashboard.data', 'Data')}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {planDetails.data || `${planDetails.dataAmountMb || 0} MB`}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs text-gray-500">{t('dashboard.validity', 'Validity')}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {planDetails.validity ? `${planDetails.validity} ${t('dashboard.days', 'days')}` : '—'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {appleInstallUrl && (
                  <a
                    href={appleInstallUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
                  >
                    <Smartphone className="w-5 h-5" />
                    {t('dashboard.installOnApple', 'Install on iPhone')}
                  </a>
                )}
                
                {qrCodeString && (
                  <button
                    onClick={() => copyToClipboard(qrCodeString, 'lpa')}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                  >
                    {copiedField === 'lpa' ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                    {copiedField === 'lpa' ? t('common.copied', 'Copied!') : t('dashboard.copyActivationCode', 'Copy Activation Code')}
                  </button>
                )}
              </div>

              {/* Installation Instructions */}
              {getInstallationHtml() && (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowInstructions(!showInstructions)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <BookOpen className="w-5 h-5 text-gray-500" />
                      <span className="font-medium text-gray-900">{t('dashboard.installationInstructions', 'Installation Guide')}</span>
                    </div>
                    {showInstructions ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  
                  {showInstructions && (
                    <div className="p-4 border-t border-gray-200">
                      <div 
                        className="prose prose-sm max-w-none text-gray-600"
                        dangerouslySetInnerHTML={{ __html: getInstallationHtml() }}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* APN Settings removed - Airalo eSIMs auto-configure and don't require manual APN setup */}
            </div>
          )}

          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* ICCID */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">{t('dashboard.iccid', 'ICCID')}</span>
                  <button 
                    onClick={() => copyToClipboard(iccid, 'iccid')}
                    className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    {copiedField === 'iccid' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                  </button>
                </div>
                <p className="text-sm font-mono font-medium text-gray-900 break-all">
                  {iccid || '—'}
                </p>
              </div>

              {/* Matching ID */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-500">{t('dashboard.matchingId', 'Matching ID')}</span>
                  {matchingId && (
                    <button 
                      onClick={() => copyToClipboard(matchingId, 'matchingId')}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copiedField === 'matchingId' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  )}
                </div>
                <p className="text-sm font-mono font-medium text-gray-900 break-all">
                  {matchingId || '—'}
                </p>
              </div>

              {/* LPA / Activation Code */}
              {qrCodeString && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">{t('dashboard.activationCode', 'Activation Code (LPA)')}</span>
                    <button 
                      onClick={() => copyToClipboard(qrCodeString, 'lpa2')}
                      className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {copiedField === 'lpa2' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-gray-700 break-all bg-white p-2 rounded-lg border border-gray-200">
                    {qrCodeString}
                  </p>
                </div>
              )}

              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  <span className="text-sm text-gray-500">{t('dashboard.orderDate', 'Order Date')}</span>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {formatDate(selectedOrder.createdAt)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <span className="text-sm text-gray-500">{t('dashboard.price', 'Price')}</span>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {formatPrice(selectedOrder.amount || 0)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <span className="text-sm text-gray-500">{t('dashboard.status', 'Status')}</span>
                  <p className="text-sm font-medium text-emerald-600 mt-1 capitalize">
                    {selectedOrder.status || selectedOrder.paymentStatus || '—'}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <span className="text-sm text-gray-500">{t('dashboard.orderId', 'Order ID')}</span>
                  <p className="text-xs font-mono text-gray-900 mt-1 truncate">
                    {selectedOrder.orderId || selectedOrder.id || '—'}
                  </p>
                </div>
              </div>

              {/* Apple Install Link */}
              {appleInstallUrl && (
                <a
                  href={appleInstallUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900">{t('dashboard.appleInstall', 'Apple Direct Install')}</span>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </a>
              )}

              {/* Guide Link */}
              {getGuideUrl() && (
                <a
                  href={getGuideUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900">{t('dashboard.viewGuide', 'View Installation Guide')}</span>
                  </div>
                  <ExternalLink className="w-5 h-5 text-gray-400" />
                </a>
              )}
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-4">
              {!esimUsage && !loadingEsimUsage && (
                <div className="text-center py-8">
                  <Wifi className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">{t('dashboard.noUsageData', 'No usage data loaded')}</p>
                  <button
                    onClick={onCheckEsimUsage}
                    disabled={loadingEsimUsage || !iccid}
                    className="px-6 py-2.5 bg-tufts-blue text-white rounded-xl font-medium hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
                  >
                    {t('dashboard.loadUsage', 'Load Usage Data')}
                  </button>
                </div>
              )}

              {loadingEsimUsage && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-tufts-blue border-t-transparent mx-auto mb-3"></div>
                  <p className="text-gray-500">{t('dashboard.loadingUsage', 'Loading usage data...')}</p>
                </div>
              )}

              {usageData && (
                <>
                  {/* Status Badge */}
                  {usageData.status && (
                    <div className={`flex items-center justify-between p-4 rounded-xl border ${getStatusBadge(usageData.status).bg} ${getStatusBadge(usageData.status).border}`}>
                      <div className="flex items-center gap-3">
                        {React.createElement(getStatusBadge(usageData.status).icon, { 
                          className: `w-5 h-5 ${getStatusBadge(usageData.status).text}` 
                        })}
                        <div>
                          <p className="text-sm text-gray-500">{t('dashboard.status', 'Status')}</p>
                          <p className={`font-semibold ${getStatusBadge(usageData.status).text}`}>
                            {usageData.status}
                          </p>
                        </div>
                      </div>
                      {usageData.expiredAt && (
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{t('dashboard.expires', 'Expires')}</p>
                          <p className="text-sm font-medium text-gray-700">{formatDate(usageData.expiredAt)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Data Usage */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-tufts-blue/10 rounded-xl flex items-center justify-center">
                          <Wifi className="w-5 h-5 text-tufts-blue" />
                        </div>
                        <span className="font-medium text-gray-900">{t('dashboard.dataUsage', 'Data Usage')}</span>
                      </div>
                      {usageData.isUnlimited ? (
                        <span className="text-sm font-semibold text-tufts-blue">{t('dashboard.unlimited', 'Unlimited')}</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-900">
                          {formatData(usageData.remaining)} / {formatData(usageData.total)}
                        </span>
                      )}
                    </div>
                    
                    {!usageData.isUnlimited && usageData.total > 0 && (
                      <>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-tufts-blue to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${100 - usageData.dataPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-2 text-xs text-gray-500">
                          <span>{formatData(usageData.dataUsed)} {t('dashboard.used', 'used')}</span>
                          <span>{usageData.dataPercentage}% {t('dashboard.consumed', 'consumed')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Voice Usage - Only show if plan has voice */}
                  {usageData.hasVoice && (
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <Phone className="w-5 h-5 text-emerald-600" />
                          </div>
                          <span className="font-medium text-gray-900">{t('dashboard.voiceUsage', 'Voice Minutes')}</span>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600">
                          {usageData.remainingVoice} / {usageData.totalVoice} {t('dashboard.min', 'min')}
                        </span>
                      </div>
                      
                      {usageData.totalVoice > 0 && (
                        <>
                          <div className="h-3 bg-emerald-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                              style={{ width: `${100 - usageData.voicePercentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-emerald-700">
                            <span>{usageData.voiceUsed} {t('dashboard.min', 'min')} {t('dashboard.used', 'used')}</span>
                            <span>{usageData.voicePercentage}% {t('dashboard.consumed', 'consumed')}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* SMS Usage - Only show if plan has SMS */}
                  {usageData.hasText && (
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                            <MessageSquare className="w-5 h-5 text-purple-600" />
                          </div>
                          <span className="font-medium text-gray-900">{t('dashboard.smsUsage', 'SMS Messages')}</span>
                        </div>
                        <span className="text-sm font-semibold text-purple-600">
                          {usageData.remainingText} / {usageData.totalText} SMS
                        </span>
                      </div>
                      
                      {usageData.totalText > 0 && (
                        <>
                          <div className="h-3 bg-purple-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full transition-all duration-500"
                              style={{ width: `${100 - usageData.textPercentage}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-purple-700">
                            <span>{usageData.textUsed} SMS {t('dashboard.used', 'used')}</span>
                            <span>{usageData.textPercentage}% {t('dashboard.consumed', 'consumed')}</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Refresh Button */}
                  <button
                    onClick={onCheckEsimUsage}
                    disabled={loadingEsimUsage}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {t('dashboard.refreshUsage', 'Refresh Usage Data')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex gap-3">
            {/* Main Action */}
            {activeTab === 'qrcode' && iccid && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('usage');
                  if (!esimUsage) onCheckEsimUsage?.();
                }}
                disabled={loadingEsimUsage}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-tufts-blue text-white rounded-xl font-medium hover:bg-tufts-blue/90 transition-colors disabled:opacity-50"
              >
                {loadingEsimUsage ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                ) : (
                  <Signal className="w-5 h-5" />
                )}
                <span>{t('dashboard.checkUsage', 'Check Usage')}</span>
              </button>
            )}
            
            {activeTab !== 'qrcode' && (
              <button
                type="button"
                onClick={() => setActiveTab('qrcode')}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-tufts-blue text-white rounded-xl font-medium hover:bg-tufts-blue/90 transition-colors"
              >
                <QrCode className="w-5 h-5" />
                <span>{t('dashboard.viewQrCode', 'View QR Code')}</span>
              </button>
            )}
            
            {/* Delete Button */}
            {onDeleteOrder && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors"
                title={t('dashboard.deleteEsim', 'Delete eSIM')}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;
