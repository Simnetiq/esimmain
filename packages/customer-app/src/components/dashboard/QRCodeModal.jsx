'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import LPAQRCodeDisplay from './LPAQRCodeDisplay';
import { useI18n } from '@esim/shared/contexts/I18nContext';
// getLanguageDirection removed — dir="rtl" on <html> handles layout direction
import { formatPrice } from '@esim/shared/utils/priceUtils';
import {
  getQrCodeValue,
  getAppleInstallUrl,
  getIccid,
  mapPlanDetails,
  mapPackageCountryData,
  getCachedCountryImage,
  setCachedCountryImage
} from '@esim/shared/utils/esimFieldMapper';
import { useCountryNames } from '@esim/shared/hooks/useCountriesSupabase';
import { getSupabase } from '@esim/shared/lib/supabase';
import Image from 'next/image';
import toast from 'react-hot-toast';

// ─── Inline SVG icons (no lucide-react) ───────────────────────────────────

const QrCodeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>
  </svg>
);

const SmartphoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const WifiIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/>
  </svg>
);

const PhoneIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const MessageSquareIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const CopyIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
  </svg>
);

const CheckIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6 9 17l-5-5"/>
  </svg>
);

const ChevronDownIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m6 9 6 6 6-6"/>
  </svg>
);

const ChevronUpIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m18 15-6-6-6 6"/>
  </svg>
);

const XIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
  </svg>
);

const ExternalLinkIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
  </svg>
);

const AlertCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>
  </svg>
);

const Trash2Icon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

const BookOpenIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
  </svg>
);

const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="M12 5v14"/>
  </svg>
);

const ArrowLeftIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>
  </svg>
);

const RefreshCwIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
);

const ArrowUpRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 7h10v10"/><path d="M7 17 17 7"/>
  </svg>
);

const QRCodeModal = ({
  show,
  selectedOrder,
  onClose,
  onCheckEsimUsage,
  loadingEsimUsage,
  onDeleteOrder,
  esimUsage,
  planMetadata
}) => {
  const { t, locale } = useI18n();
  const [showInstructions, setShowInstructions] = useState(false);
  const [showQrSection, setShowQrSection] = useState(false);
  const [installTab, setInstallTab] = useState('ios');
  const [showDetails, setShowDetails] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [countryImage, setCountryImage] = useState(null);
  const [showTopupPackages, setShowTopupPackages] = useState(false);
  const [topupPackages, setTopupPackages] = useState([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [topupError, setTopupError] = useState(null);
  const [processingTopup, setProcessingTopup] = useState(null);

  // RTL handled by dir="rtl" on <html> — no JS conditionals needed

  const { getLocalizedName } = useCountryNames(locale || 'en');

  const localizedCountryName = useMemo(() => {
    if (!selectedOrder) return '';
    const countryData = mapPackageCountryData(selectedOrder);
    const cc = countryData?.countryCode || selectedOrder.countryCode || selectedOrder.country_code;
    const fallback = countryData?.countryName || selectedOrder.country_region || '';
    if (!cc) return fallback;
    return getLocalizedName(cc, fallback);
  }, [selectedOrder, getLocalizedName]);

  const countryCode = useMemo(() => {
    if (!selectedOrder) return '';
    const countryData = mapPackageCountryData(selectedOrder);
    return countryData?.countryCode || selectedOrder.countryCode || selectedOrder.country_code || '';
  }, [selectedOrder]);

  const getFlagEmoji = (code) => {
    if (!code || code.length !== 2) return null;
    try {
      return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
    } catch { return null; }
  };

  // Fetch country image — use shared cache so it's instant when EsimCard already loaded it
  useEffect(() => {
    if (!show || !selectedOrder) { setCountryImage(null); return; }

    const countryData = mapPackageCountryData(selectedOrder);
    const isRegional = countryData?.isRegional || selectedOrder.is_regional;
    let code = countryData?.countryCode;
    if (!code && selectedOrder.country_codes?.length >= 1) code = selectedOrder.country_codes[0];
    const countryName = countryData?.countryName || selectedOrder.country_region;

    if (!code && !countryName) { setCountryImage(null); return; }

    // Check shared cache first (populated by EsimCard on dashboard)
    const cacheKey = code || countryName;
    const cached = getCachedCountryImage(cacheKey);
    if (cached) { setCountryImage(cached); return; }

    // Fallback: fetch from Supabase
    let cancelled = false;
    const fetchImage = async () => {
      try {
        const supabase = getSupabase();
        let imageUrl = null;

        if (countryName && typeof countryName === 'string') {
          const nameSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const { data } = await supabase.from('countries').select('image_url').eq('id', nameSlug).maybeSingle();
          if (data) imageUrl = data.image_url;
        }
        if (!imageUrl && code) {
          const codeSlug = code.toLowerCase().replace(/\s+/g, '-');
          const { data } = await supabase.from('countries').select('image_url').eq('id', codeSlug).maybeSingle();
          if (data) imageUrl = data.image_url;
        }
        if (!imageUrl && isRegional && countryName) {
          const regionSlug = countryName.toLowerCase().replace(/\s+/g, '-');
          const { data } = await supabase.from('countries').select('image_url').eq('id', regionSlug).maybeSingle();
          if (data) imageUrl = data.image_url;
        }
        if (!imageUrl && code && !isRegional) {
          const { data } = await supabase.from('countries').select('image_url').eq('id', code.toUpperCase()).maybeSingle();
          if (data) imageUrl = data.image_url;
        }

        if (!cancelled) {
          if (imageUrl) setCachedCountryImage(cacheKey, imageUrl);
          setCountryImage(imageUrl || null);
        }
      } catch {
        if (!cancelled) setCountryImage(null);
      }
    };

    fetchImage();
    return () => { cancelled = true; };
  }, [show, selectedOrder?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-fetch usage when modal opens
  useEffect(() => {
    if (show && selectedOrder && !esimUsage && !loadingEsimUsage) {
      const iccidVal = getIccid(selectedOrder);
      if (iccidVal) {
        onCheckEsimUsage?.();
      }
    }
  }, [show, selectedOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset collapsible sections when modal opens with new order
  // QR section auto-opens on desktop, stays collapsed on mobile so the modal fits
  useEffect(() => {
    if (show) {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      setShowQrSection(isDesktop);
      setShowDetails(false);
      setShowInstructions(false);
      setShowTopupPackages(false);
      setTopupError(null);
    }
  }, [show, selectedOrder?.id]);

  // Derived data (only computed when order is present)
  const orderData = useMemo(() => {
    if (!selectedOrder) return null;

    const rawPlanDetails = selectedOrder.planDetails || {};
    const mappedPlanDetails = mapPlanDetails(rawPlanDetails);
    const planDetails = { ...rawPlanDetails, ...mappedPlanDetails };
    const installation = selectedOrder.installation || {};
    const qrData = selectedOrder.qrCode || {};
    const qrCodeString = getQrCodeValue(qrData) || getQrCodeValue(selectedOrder) || '';
    const appleInstallUrl = getAppleInstallUrl(qrData) || getAppleInstallUrl(selectedOrder);
    const iccid = getIccid(selectedOrder) || '';
    const matchingId = qrData.matchingId || qrData.matching_id || selectedOrder.airaloOrderData?.sims?.[0]?.matching_id || '';

    const getInstallationHtml = () => installation.qrcode || installation.manual || null;
    const getGuideUrl = () => {
      if (!installation.guides) return null;
      return installation.guides[locale] || installation.guides.en || Object.values(installation.guides)[0];
    };

    return { planDetails, installation, qrData, qrCodeString, appleInstallUrl, iccid, matchingId, getInstallationHtml, getGuideUrl };
  }, [selectedOrder, locale]);

  // Usage calculations
  const usageData = useMemo(() => {
    if (!esimUsage) return null;
    const safeNumber = (val) => { const num = Number(val); return isNaN(num) || num < 0 ? 0 : num; };

    const total = safeNumber(esimUsage.total);
    const remaining = safeNumber(esimUsage.remaining);
    const dataUsed = Math.max(0, total - remaining);
    const dataPercentage = total > 0 ? Math.min(100, Math.round((dataUsed / total) * 100)) : 0;

    const totalVoice = safeNumber(esimUsage.total_voice);
    const remainingVoice = safeNumber(esimUsage.remaining_voice);
    const voiceUsed = Math.max(0, totalVoice - remainingVoice);
    const voicePercentage = totalVoice > 0 ? Math.min(100, Math.round((voiceUsed / totalVoice) * 100)) : 0;

    const totalText = safeNumber(esimUsage.total_text);
    const remainingText = safeNumber(esimUsage.remaining_text);
    const textUsed = Math.max(0, totalText - remainingText);
    const textPercentage = totalText > 0 ? Math.min(100, Math.round((textUsed / totalText) * 100)) : 0;

    return {
      total, remaining, dataUsed, dataPercentage,
      totalVoice, remainingVoice, voiceUsed, voicePercentage, hasVoice: totalVoice > 0,
      totalText, remainingText, textUsed, textPercentage, hasText: totalText > 0,
      status: esimUsage.status, expiredAt: esimUsage.expired_at, isUnlimited: esimUsage.is_unlimited
    };
  }, [esimUsage]);

  const formatData = (mb) => {
    if (!mb && mb !== 0) return '—';
    const absMb = Math.abs(mb);
    return absMb >= 1024 ? `${(absMb / 1024).toFixed(1)} GB` : `${Math.round(absMb)} MB`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return '—';
    try { const d = new Date(dateValue); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(); }
    catch { return '—'; }
  };

  const getStatusConfig = (status) => {
    const map = {
      'ACTIVE': { bg: 'bg-emerald-500', text: 'text-white', dot: 'bg-white', label: t('dashboard.status.active', 'Active') },
      'NOT_ACTIVE': { bg: 'bg-amber-500', text: 'text-white', dot: 'bg-white', label: t('dashboard.status.notActive', 'Not Activated') },
      'EXPIRED': { bg: 'bg-red-500', text: 'text-white', dot: 'bg-white', label: t('dashboard.status.expired', 'Expired') },
      'FINISHED': { bg: 'bg-gray-500', text: 'text-white', dot: 'bg-white', label: t('dashboard.status.finished', 'Finished') },
    };
    return map[status?.toUpperCase()] || map['NOT_ACTIVE'];
  };

  const copyToClipboard = useCallback((text, field) => {
    if (!text) { toast.error(t('common.nothingToCopy', 'Nothing to copy')); return; }
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success(t('common.copied', 'Copied to clipboard'));
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => { toast.error(t('common.copyFailed', 'Failed to copy')); });
  }, [t]);

  const handleDelete = () => {
    if (window.confirm(t('dashboard.confirmDelete', 'Are you sure you want to delete this eSIM? This action cannot be undone.'))) {
      onDeleteOrder?.(selectedOrder);
      onClose();
    }
  };

  const handleTopUpClick = async () => {
    if (!orderData?.iccid) return;
    setShowTopupPackages(true);
    setLoadingTopups(true);
    setTopupError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`/api/esims/${encodeURIComponent(orderData.iccid)}/topups`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load packages');
      setTopupPackages(result.data || []);
    } catch (err) {
      setTopupError(err.message);
    } finally {
      setLoadingTopups(false);
    }
  };

  const handleTopupPurchase = async (pkg) => {
    setProcessingTopup(pkg.id);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/topups/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          iccid: orderData.iccid,
          packageId: pkg.id,
          language: locale || 'en',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Checkout failed');
      if (result.sessionUrl) window.location.href = result.sessionUrl;
    } catch (err) {
      toast.error(err.message || t('dashboard.topupFailed', 'Top-up failed'));
      setProcessingTopup(null);
    }
  };

  if (!show || !selectedOrder || !orderData) return null;

  const { planDetails, qrCodeString, appleInstallUrl, iccid, matchingId } = orderData;
  const statusConfig = usageData?.status ? getStatusConfig(usageData.status) : null;

  // Remaining percentage for the circular-style indicator
  const remainingPercent = usageData && !usageData.isUnlimited && usageData.total > 0
    ? Math.round((usageData.remaining / usageData.total) * 100) : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] bg-white flex flex-col overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex-shrink-0 border-b border-gray-100 p-5">
          <div className="flex items-start justify-between rtl-native-flex">
            <div className="flex items-center gap-3 min-w-0 rtl-native-flex">
              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center rounded-full overflow-hidden flex-shrink-0">
                {countryImage ? (
                  <Image
                    src={countryImage}
                    alt={localizedCountryName || 'Country'}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                ) : getFlagEmoji(countryCode) ? (
                  <span className="text-2xl leading-none">{getFlagEmoji(countryCode)}</span>
                ) : (
                  <GlobeIcon className="w-6 h-6 text-gray-500" />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-eerie-black leading-tight truncate">
                  {localizedCountryName || selectedOrder.planName || t('dashboard.esim', 'eSIM')}
                </h3>
                <div className="flex items-center gap-2 mt-0.5 rtl-native-flex">
                  {localizedCountryName && selectedOrder.planName && localizedCountryName !== selectedOrder.planName && (
                    <span className="text-sm text-gray-500 truncate">{selectedOrder.planName}</span>
                  )}
                  {statusConfig && (
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <XIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Content ── */}
        <div className="flex-1 min-h-0 overflow-y-auto">

          {/* Top-Up Packages View (replaces main content when active) */}
          {showTopupPackages ? (
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 mb-2 rtl-native-flex">
                <button
                  onClick={() => { setShowTopupPackages(false); setTopupError(null); }}
                  className="p-2 hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5 text-gray-600 rtl:-scale-x-100" />
                </button>
                <h3 className="text-lg font-semibold text-eerie-black">
                  {t('dashboard.selectTopup', 'Select Top-Up Package')}
                </h3>
              </div>

              {loadingTopups && (
                <div className="space-y-3 animate-pulse">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-4 bg-gray-50">
                      <div className="flex items-center justify-between rtl-native-flex">
                        <div>
                          <div className="h-5 w-16 bg-gray-200 rounded mb-1.5" />
                          <div className="h-4 w-12 bg-gray-200 rounded" />
                        </div>
                        <div className="h-6 w-14 bg-gray-200 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {topupError && (
                <div className="text-center py-8">
                  <AlertCircleIcon className="w-10 h-10 text-red-400 mx-auto mb-3" />
                  <p className="text-red-600">{topupError}</p>
                  <button onClick={handleTopUpClick} className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
                    {t('common.retry', 'Retry')}
                  </button>
                </div>
              )}
              {!loadingTopups && !topupError && topupPackages.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircleIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('dashboard.noTopups', 'No top-up packages available for this eSIM')}</p>
                </div>
              )}
              {!loadingTopups && !topupError && topupPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleTopupPurchase(pkg)}
                  disabled={processingTopup !== null}
                  className={`w-full text-start p-4 transition-all border-s-2 ${
                    processingTopup === pkg.id ? 'border-s-tufts-blue bg-blue-50' : 'border-s-transparent bg-gray-50 hover:border-s-tufts-blue hover:bg-white'
                  } disabled:opacity-60`}
                >
                  <div className="flex items-center justify-between rtl-native-flex">
                    <div>
                      <p className="font-semibold text-eerie-black">{pkg.dataDisplay}</p>
                      <p className="text-sm text-gray-500">{pkg.validityDays} {t('dashboard.days', 'days')}</p>
                    </div>
                    <div className="text-end">
                      {processingTopup === pkg.id ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-tufts-blue border-t-transparent" />
                      ) : (
                        <p className="text-lg font-bold text-tufts-blue">${pkg.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="p-5 space-y-4">

              {/* ── Section 1: Usage (primary) ── */}
              {loadingEsimUsage && !usageData && (
                <div className="space-y-3 animate-pulse">
                  {/* Data usage skeleton */}
                  <div className="bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-3 rtl-native-flex">
                      <div className="flex items-center gap-2.5 rtl-native-flex">
                        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
                        <div className="h-4 w-20 bg-gray-200 rounded" />
                      </div>
                      <div className="h-5 w-24 bg-gray-200 rounded" />
                    </div>
                    <div className="h-2.5 bg-gray-200 rounded-full" />
                    <div className="flex justify-between mt-2 rtl-native-flex">
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                      <div className="h-3 w-20 bg-gray-200 rounded" />
                    </div>
                  </div>
                  {/* Expiry skeleton */}
                  <div className="flex items-center gap-2 px-1 rtl-native-flex">
                    <div className="w-3.5 h-3.5 bg-gray-200 rounded" />
                    <div className="h-3 w-28 bg-gray-200 rounded" />
                  </div>
                </div>
              )}

              {usageData && (
                <div className="space-y-3">
                  {/* Data usage — prominent card */}
                  <div className="bg-gray-50 p-4">
                    <div className="flex items-center justify-between mb-3 rtl-native-flex">
                      <div className="flex items-center gap-2.5 rtl-native-flex">
                        <div className="w-9 h-9 bg-tufts-blue/10 rounded-lg flex items-center justify-center">
                          <WifiIcon className="w-[18px] h-[18px] text-tufts-blue" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">{t('dashboard.dataUsage', 'Data Usage')}</span>
                      </div>
                      {usageData.isUnlimited ? (
                        <span className="text-sm font-bold text-tufts-blue">{t('dashboard.unlimited', 'Unlimited')}</span>
                      ) : (
                        <div className="text-end">
                          <span className="text-lg font-bold text-eerie-black">{formatData(usageData.remaining)}</span>
                          <span className="text-sm text-gray-400 font-normal"> / {formatData(usageData.total)}</span>
                        </div>
                      )}
                    </div>

                    {!usageData.isUnlimited && usageData.total > 0 && (
                      <>
                        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden rtl:-scale-x-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              usageData.dataPercentage > 80 ? 'bg-gradient-to-r from-red-400 to-red-500'
                                : usageData.dataPercentage > 50 ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                : 'bg-gradient-to-r from-tufts-blue to-blue-500'
                            }`}
                            style={{ width: `${100 - usageData.dataPercentage}%` }}
                          />
                        </div>
                        <div className="flex justify-between mt-1.5 text-xs text-gray-400 rtl-native-flex">
                          <span>{formatData(usageData.dataUsed)} {t('dashboard.used', 'used')}</span>
                          <span>{remainingPercent}% {t('dashboard.remaining', 'remaining')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Voice + SMS — side by side if both exist */}
                  {(usageData.hasVoice || usageData.hasText) && (
                    <div className={`grid gap-3 ${usageData.hasVoice && usageData.hasText ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {usageData.hasVoice && (
                        <div className="bg-emerald-50 p-3">
                          <div className="flex items-center gap-2 mb-2 rtl-native-flex">
                            <PhoneIcon className="w-4 h-4 text-emerald-600" />
                            <span className="text-xs font-medium text-emerald-700">{t('dashboard.voiceUsage', 'Voice')}</span>
                          </div>
                          <p className="text-sm font-bold text-eerie-black">
                            {usageData.remainingVoice} <span className="font-normal text-gray-400">/ {usageData.totalVoice} {t('dashboard.min', 'min')}</span>
                          </p>
                          {usageData.totalVoice > 0 && (
                            <div className="h-1.5 bg-emerald-200 rounded-full overflow-hidden mt-2 rtl:-scale-x-100">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${100 - usageData.voicePercentage}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                      {usageData.hasText && (
                        <div className="bg-purple-50 p-3">
                          <div className="flex items-center gap-2 mb-2 rtl-native-flex">
                            <MessageSquareIcon className="w-4 h-4 text-purple-600" />
                            <span className="text-xs font-medium text-purple-700">{t('dashboard.smsUsage', 'SMS')}</span>
                          </div>
                          <p className="text-sm font-bold text-eerie-black">
                            {usageData.remainingText} <span className="font-normal text-gray-400">/ {usageData.totalText} SMS</span>
                          </p>
                          {usageData.totalText > 0 && (
                            <div className="h-1.5 bg-purple-200 rounded-full overflow-hidden mt-2 rtl:-scale-x-100">
                              <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${100 - usageData.textPercentage}%` }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Expiry info */}
                  {usageData.expiredAt && (
                    <div className="flex items-center gap-2 px-1 rtl-native-flex">
                      <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-400">
                        {usageData.status?.toUpperCase() === 'EXPIRED'
                          ? t('dashboard.expiredOn', 'Expired on {{date}}', { date: formatDate(usageData.expiredAt) })
                          : t('dashboard.expiresOn', 'Expires {{date}}', { date: formatDate(usageData.expiredAt) })
                        }
                      </span>
                    </div>
                  )}

                  {/* Refresh usage — subtle link */}
                  <button
                    onClick={onCheckEsimUsage}
                    disabled={loadingEsimUsage}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-tufts-blue transition-colors disabled:opacity-50 rtl-native-flex"
                  >
                    <RefreshCwIcon className={`w-3 h-3 ${loadingEsimUsage ? 'animate-spin' : ''}`} />
                    {t('dashboard.refreshUsage', 'Refresh usage')}
                  </button>
                </div>
              )}

              {/* Usage not available and not loading — show plan stats as fallback */}
              {!usageData && !loadingEsimUsage && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3">
                    <div className="flex items-center gap-2 mb-1 rtl-native-flex">
                      <WifiIcon className="w-4 h-4 text-tufts-blue" />
                      <span className="text-xs text-gray-500">{t('dashboard.data', 'Data')}</span>
                    </div>
                    <p className="text-sm font-semibold text-eerie-black">
                      {planDetails.data || `${planDetails.dataAmountMb || 0} MB`}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-3 text-end">
                    <div className="flex items-center gap-2 mb-1 justify-end rtl-native-flex">
                      <ClockIcon className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-gray-500">{t('dashboard.validity', 'Validity')}</span>
                    </div>
                    <p className="text-sm font-semibold text-eerie-black">
                      {planDetails.validity ? `${planDetails.validity} ${t('dashboard.days', 'days')}` : '—'}
                    </p>
                  </div>
                  {iccid && (
                    <div className="col-span-2">
                      <button
                        onClick={onCheckEsimUsage}
                        disabled={loadingEsimUsage || !iccid}
                        className="w-full py-2.5 text-sm font-medium text-tufts-blue bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {t('dashboard.loadUsage', 'Load Usage Data')}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* ── Section 2: QR Code (collapsible) ── */}
              <div className="bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500">
                <button
                  type="button"
                  onClick={() => setShowQrSection(!showQrSection)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/40 transition-colors duration-150 ease-out rtl-native-flex"
                >
                  <div className="flex items-center gap-3 rtl-native-flex">
                    <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0">
                      <QrCodeIcon className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <span className="text-lg font-semibold text-eerie-black">{t('dashboard.qrCode', 'QR Code & Installation')}</span>
                  </div>
                  {showQrSection ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                </button>

                {showQrSection && (
                  <div className="border-t border-gray-100 p-4 space-y-4">
                    {/* QR Code Display */}
                    <div className="flex justify-center">
                      {qrCodeString ? (
                        <div className="bg-white p-3 border border-gray-100">
                          <div className="w-40 h-40">
                            <LPAQRCodeDisplay lpaData={qrCodeString} />
                          </div>
                        </div>
                      ) : (
                        <div className="w-40 h-40 bg-gray-50 flex items-center justify-center border-2 border-dashed border-gray-200">
                          <div className="text-center">
                            <QrCodeIcon className="w-8 h-8 text-gray-300 mx-auto mb-1" />
                            <p className="text-xs text-gray-400">{t('dashboard.noQrCode', 'No QR Code')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-center text-xs text-gray-400">
                      {t('dashboard.scanToInstall', 'Scan with your phone camera to install')}
                    </p>

                    {/* Action buttons */}
                    <div className="flex gap-2">
                      {appleInstallUrl && (
                        <a
                          href={appleInstallUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-eerie-black text-white text-sm font-medium rounded-full hover:bg-gray-800 transition-colors"
                        >
                          <SmartphoneIcon className="w-4 h-4" />
                          {t('dashboard.installOnApple', 'Install on iPhone')}
                        </a>
                      )}
                      {qrCodeString && (
                        <button
                          onClick={() => copyToClipboard(qrCodeString, 'lpa')}
                          className={`${appleInstallUrl ? '' : 'flex-1'} flex items-center justify-center gap-2 py-2.5 px-4 bg-gray-100 text-gray-700 text-sm font-medium rounded-full hover:bg-gray-200 transition-colors`}
                        >
                          {copiedField === 'lpa' ? <CheckIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
                          {copiedField === 'lpa' ? t('common.copied', 'Copied!') : t('dashboard.copyActivationCode', 'Copy Code')}
                        </button>
                      )}
                    </div>

                    {/* Installation Instructions — translated */}
                    <div className="border-t border-gray-100 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowInstructions(!showInstructions)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-white/40 transition-colors duration-150 ease-out rtl-native-flex"
                      >
                        <div className="flex items-center gap-2 rtl-native-flex">
                          <BookOpenIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-sm font-medium text-gray-700">{t('dashboard.installStepsTitle', 'How to install your eSIM')}</span>
                        </div>
                        {showInstructions ? <ChevronUpIcon className="w-4 h-4 text-gray-400" /> : <ChevronDownIcon className="w-4 h-4 text-gray-400" />}
                      </button>
                      {showInstructions && (
                        <div className="p-3 border-t border-gray-100 space-y-3">
                          {/* iOS / Android tabs */}
                          <div className="flex gap-2 rtl-native-flex">
                            <button
                              type="button"
                              onClick={() => setInstallTab('ios')}
                              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                                installTab === 'ios' ? 'bg-eerie-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {t('dashboard.iosTab', 'iPhone')}
                            </button>
                            <button
                              type="button"
                              onClick={() => setInstallTab('android')}
                              className={`flex-1 py-1.5 text-sm font-medium transition-colors ${
                                installTab === 'android' ? 'bg-eerie-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              {t('dashboard.androidTab', 'Android')}
                            </button>
                          </div>

                          {installTab === 'ios' ? (
                            <ol className="space-y-2 text-sm text-gray-600 list-decimal ps-4">
                              <li>{t('dashboard.installStepIos1', 'Open Settings → Cellular (or Mobile Data)')}</li>
                              <li>{t('dashboard.installStepIos2', 'Tap Add eSIM or Add Cellular Plan')}</li>
                              <li>{t('dashboard.installStepIos3', 'Tap Use QR Code and scan the code above')}</li>
                              <li>{t('dashboard.installStepIos4', 'Choose a label for your eSIM (e.g., "Travel Data")')}</li>
                              <li>{t('dashboard.installStepIos5', 'Enable Data Roaming and you\'re ready!')}</li>
                            </ol>
                          ) : (
                            <ol className="space-y-2 text-sm text-gray-600 list-decimal ps-4">
                              <li>{t('dashboard.installStepAndroid1', 'Open Settings → Connections → SIM Manager')}</li>
                              <li>{t('dashboard.installStepAndroid2', 'Tap Add eSIM and scan the QR code above')}</li>
                              <li>{t('dashboard.installStepAndroid3', 'Wait for the eSIM to download and activate')}</li>
                              <li>{t('dashboard.installStepAndroid4', 'Enable Mobile Data and Data Roaming for your eSIM')}</li>
                            </ol>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Full Installation Guide Link */}
                    <Link
                      href="/help/install-esim"
                      className="flex items-center justify-between p-3 bg-tufts-blue/5 hover:bg-tufts-blue/10 transition-colors duration-150 ease-out text-sm rtl-native-flex"
                    >
                      <div className="flex items-center gap-2 rtl-native-flex">
                        <BookOpenIcon className="w-4 h-4 text-tufts-blue" />
                        <span className="font-medium text-tufts-blue">{t('dashboard.viewGuide', 'View Installation Guide')}</span>
                      </div>
                      <ExternalLinkIcon className="w-4 h-4 text-tufts-blue/60" />
                    </Link>
                  </div>
                )}
              </div>

              {/* ── Section 3: Details (collapsible) ── */}
              <div className="bg-gray-50 overflow-hidden hover:bg-white transition-all duration-500">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/40 transition-colors duration-150 ease-out rtl-native-flex"
                >
                  <div className="flex items-center gap-3 rtl-native-flex">
                    <div className="w-11 h-11 rounded-lg bg-tufts-blue/10 flex items-center justify-center flex-shrink-0">
                      <GlobeIcon className="w-5 h-5 text-tufts-blue" />
                    </div>
                    <span className="text-lg font-semibold text-eerie-black">{t('dashboard.details', 'eSIM Details')}</span>
                  </div>
                  {showDetails ? <ChevronUpIcon className="w-5 h-5 text-gray-400" /> : <ChevronDownIcon className="w-5 h-5 text-gray-400" />}
                </button>

                {showDetails && (
                  <div className="border-t border-gray-100 p-4 space-y-3">
                    {/* Operator branding */}
                    {planMetadata?.operatorName && (
                      <div className="flex items-center gap-3 p-3 bg-gray-100 rtl-native-flex">
                        {planMetadata.operatorLogo ? (
                          <Image src={planMetadata.operatorLogo} alt={planMetadata.operatorName} width={32} height={28} className="h-7 w-auto object-contain flex-shrink-0" unoptimized />
                        ) : (
                          <div className="h-7 w-7 flex items-center justify-center bg-gray-200 text-gray-600 text-xs font-bold flex-shrink-0">
                            {planMetadata.operatorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-sm text-gray-500">
                          {t('dashboard.poweredBy', 'Powered by')}{' '}
                          <span
                            className="font-semibold"
                            style={{
                              background: planMetadata.operatorGradientStart && planMetadata.operatorGradientEnd
                                ? `linear-gradient(135deg, ${planMetadata.operatorGradientStart}, ${planMetadata.operatorGradientEnd})`
                                : 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                            }}
                          >
                            {planMetadata.operatorName}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* ICCID */}
                    <DetailRow label={t('dashboard.iccid', 'ICCID')} value={iccid} mono onCopy={() => copyToClipboard(iccid, 'iccid')} copied={copiedField === 'iccid'} />

                    {/* Matching ID */}
                    {matchingId && (
                      <DetailRow label={t('dashboard.matchingId', 'Matching ID')} value={matchingId} mono onCopy={() => copyToClipboard(matchingId, 'matchingId')} copied={copiedField === 'matchingId'} />
                    )}

                    {/* LPA */}
                    {qrCodeString && (
                      <div>
                        <div className="flex items-center justify-between mb-1 rtl-native-flex">
                          <span className="text-xs text-gray-400">{t('dashboard.activationCode', 'Activation Code (LPA)')}</span>
                          <button onClick={() => copyToClipboard(qrCodeString, 'lpa2')} className="p-1 hover:bg-gray-100 transition-colors">
                            {copiedField === 'lpa2' ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5 text-gray-400" />}
                          </button>
                        </div>
                        <p className="text-[11px] font-mono text-gray-500 break-all bg-gray-100 p-2" dir="ltr">
                          {qrCodeString}
                        </p>
                      </div>
                    )}

                    {/* Order info grid */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-xs text-gray-400">{t('dashboard.orderDate', 'Order Date')}</span>
                        <p className="text-sm font-medium text-eerie-black">{formatDate(selectedOrder.createdAt)}</p>
                      </div>
                      <div className="text-end">
                        <span className="text-xs text-gray-400">{t('dashboard.price', 'Price')}</span>
                        <p className="text-sm font-medium text-eerie-black">{formatPrice(selectedOrder.amount || 0)}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">{t('dashboard.orderId', 'Order ID')}</span>
                        <p className="text-xs font-mono text-gray-600 truncate">{selectedOrder.orderId || selectedOrder.id || '—'}</p>
                      </div>
                      <div className="text-end">
                        <span className="text-xs text-gray-400">{t('dashboard.validity', 'Validity')}</span>
                        <p className="text-sm font-medium text-eerie-black">
                          {planDetails.validity ? `${planDetails.validity} ${t('dashboard.days', 'days')}` : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Coverage info */}
                    {planMetadata?.isRegional && planMetadata.coveredCountryCount > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 rtl-native-flex">
                        <GlobeIcon className="w-3.5 h-3.5" />
                        <span>
                          {planMetadata.coveredCountryCount} {planMetadata.coveredCountryCount === 1
                            ? t('dashboard.country', 'country')
                            : t('dashboard.countries', 'countries')} {t('dashboard.covered', 'covered')}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer Actions ── */}
        {!showTopupPackages && (
          <div className="flex-shrink-0 border-t border-gray-100 p-4 bg-gray-50">
            <div className="flex gap-3 rtl-native-flex">
              {/* Top Up — rounded black with arrow */}
              {iccid && (selectedOrder?.status === 'completed' || selectedOrder?.status === 'active') && (
                <button
                  type="button"
                  onClick={handleTopUpClick}
                  className="relative flex-1 flex items-center justify-center py-3 bg-eerie-black text-white font-medium rounded-full hover:bg-gray-800 transition-colors"
                >
                  <span>{t('dashboard.topUp', 'Top Up')}</span>
                  <span className="absolute top-1/2 -translate-y-1/2 end-3 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                    <PlusIcon className="w-3.5 h-3.5 text-eerie-black" />
                  </span>
                </button>
              )}

              {/* Delete */}
              {onDeleteOrder && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="p-3 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                  aria-label={t('dashboard.deleteEsim', 'Delete eSIM')}
                >
                  <Trash2Icon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Small reusable detail row
const DetailRow = ({ label, value, mono, onCopy, copied }) => (
  <div className="flex items-center justify-between py-1.5 rtl-native-flex">
    <span className="text-xs text-gray-400">{label}</span>
    <div className="flex items-center gap-1.5 rtl-native-flex">
      <span className={`text-sm text-eerie-black ${mono ? 'font-mono' : 'font-medium'} truncate max-w-[180px]`}>
        {value || '—'}
      </span>
      {onCopy && value && (
        <button onClick={onCopy} className="p-1 hover:bg-gray-100 transition-colors flex-shrink-0">
          {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-500" /> : <CopyIcon className="w-3.5 h-3.5 text-gray-400" />}
        </button>
      )}
    </div>
  </div>
);

export default QRCodeModal;
