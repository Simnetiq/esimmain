'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import { QrCode, Download, CheckCircle, AlertCircle, Clock, ArrowRight, Smartphone, BookOpen } from 'lucide-react';
import QRCodeLib from 'qrcode';
import Image from 'next/image';
import Link from 'next/link';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

/**
 * PaymentSuccess Component
 * 
 * SECURITY: This component NEVER creates eSIMs.
 * eSIMs are ONLY created by webhooks (stripe-webhook, coinbase webhook).
 * 
 * This component:
 * 1. Fetches order from Supabase (orders table)
 * 2. Displays QR code if order is completed
 * 3. Shows "processing" message if order is pending
 * 4. Polls for order updates every 3s
 */
const PaymentSuccess = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();
  
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(true);
  const [orderStatus, setOrderStatus] = useState('loading'); // loading, pending, completed, failed
  const [qrCodeData, setQrCodeData] = useState(null);
  const [orderInfo, setOrderInfo] = useState(null);
  const [generatedQrCode, setGeneratedQrCode] = useState(null);
  const hasProcessed = useRef(false);
  const unsubscribeRef = useRef(null);
  
  // Language detection
  const currentLanguage = React.useMemo(() => {
    try {
      if (i18nLoading) {
        if (typeof window !== 'undefined') {
          const savedLanguage = localStorage.getItem('Simnetiq-language');
          if (savedLanguage) return savedLanguage;
        }
        return detectLanguageFromPath(pathname) || 'en';
      }
      return locale || 'en';
    } catch {
      return 'en';
    }
  }, [locale, pathname, i18nLoading]);
  
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  // Generate QR code from LPA string
  const generateQRCode = useCallback(async (lpaString) => {
    try {
      const qrCodeDataUrl = await QRCodeLib.toDataURL(lpaString, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });
      setGeneratedQrCode(qrCodeDataUrl);
    } catch (err) {
      console.error('Error generating QR code:', err);
    }
  }, []);

  // Extract QR data from order
  // NOTE: Supabase/PostgREST returns snake_case column names — use those here.
  const extractQrData = useCallback((orderData) => {
    const simData = orderData.order_data?.sims?.[0] || orderData.airalo_order_data?.sims?.[0];
    
    if (!simData) return null;
    
    const fullLpaString = simData.qrcode || simData.lpa;
    
    return {
      qrCode: fullLpaString,
      qrCodeUrl: simData.qrcode_url,
      activationCode: simData.activation_code || simData.matching_id,
      iccid: simData.iccid,
      lpa: fullLpaString,
      directAppleInstallationUrl: simData.direct_apple_installation_url || simData.qrcode_url
    };
  }, []);

  // Process order data
  // IMPORTANT: all field names are snake_case as returned by Supabase/PostgREST.
  const processOrderData = useCallback(async (orderData, orderId) => {
    const info = {
      orderId:       orderId,
      planId:        orderData.plan_id,
      planName:      orderData.plan_name || orderData.customer_name || 'eSIM Plan',
      amount:        orderData.amount ?? orderData.price ?? 0,
      currency:      orderData.currency || 'usd',
      customerEmail: orderData.customer_email || orderData.user_email,
      userId:        orderData.user_id || currentUser?.id || null,
    };
    setOrderInfo(info);

    // Check order status
    const hasSimData = orderData.order_data?.sims?.[0] || orderData.airalo_order_data?.sims?.[0];
    if (orderData.status === 'completed' && hasSimData) {
      // Order is complete with eSIM data
      setOrderStatus('completed');
      const qrData = extractQrData(orderData);
      if (qrData) {
        setQrCodeData(qrData);
        if (qrData.lpa || qrData.qrCode) {
          await generateQRCode(qrData.lpa || qrData.qrCode);
        }
      }
    } else if (['failed', 'esim_creation_failed', 'payment_mismatch', 'blocked'].includes(orderData.status)) {
      setOrderStatus('failed');
      setError(orderData.esim_error || orderData.failure_reason || orderData.error_message || orderData.blocked_reason || t('paymentSuccess.errorActivation', 'eSIM activation failed. Please contact support.'));
    } else {
      // Order is pending - webhook hasn't processed yet
      setOrderStatus('pending');
    }
    
    setProcessing(false);
  }, [currentUser, extractQrData, generateQRCode, t]);

  // Poll for order updates
  const subscribeToOrder = useCallback((orderId) => {
    const supabase = getSupabase();
    let cancelled = false;
    
    const poll = async () => {
      while (!cancelled) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        if (cancelled) break;
        try {
          const { data: orderData, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single();
          if (!error && orderData) {
            await processOrderData(orderData, orderId);
            const terminalStatuses = ['completed', 'failed', 'esim_creation_failed', 'payment_mismatch', 'blocked', 'refunded', 'disputed'];
            if (terminalStatuses.includes(orderData.status)) break;
          }
        } catch (error) {
          console.error('Order poll error:', error);
        }
      }
    };
    
    poll();
    return () => { cancelled = true; };
  }, [processOrderData]);

  // Fetch order and set up listener
  const handlePaymentSuccess = useCallback(async () => {
    try {
      const orderParam = searchParams.get('order_id') || searchParams.get('order');
      const email = searchParams.get('email');
      
      if (!orderParam) {
        setError(t('paymentSuccess.errorMissingInfo', 'Missing order information'));
        setProcessing(false);
        return;
      }

      // Try to fetch order
      const supabase = getSupabase();
      let orderData = null;
      
      // Check user's orders first (authenticated path uses RLS)
      if (currentUser) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderParam)
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (data) orderData = data;
      }

      // Fallback: query without user filter (for guest checkout or RLS mismatch)
      if (!orderData) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderParam)
          .maybeSingle();
        if (data) orderData = data;
      }
      
      // If order not found, wait and try again (webhook might not have fired yet)
      if (!orderData) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderParam)
          .maybeSingle();

        if (!data) {
          setError(`${t('paymentSuccess.errorOrderNotFound', 'Order not found. Please wait a moment and refresh, or contact support with order ID:')} ${orderParam}`);
          setProcessing(false);
          return;
        }
        orderData = data;
      }

      // SECURITY CHECK: Verify this order belongs to the user or has valid email
      // Use snake_case field names — Supabase/PostgREST always returns snake_case.
      if (currentUser && orderData.user_id && orderData.user_id !== currentUser.id) {
        setError(t('paymentSuccess.errorUnauthorized', 'You are not authorized to view this order.'));
        setProcessing(false);
        return;
      }
      
      if (email && orderData.customer_email && orderData.customer_email.toLowerCase() !== email.toLowerCase()) {
        setError(t('paymentSuccess.errorUnauthorized', 'You are not authorized to view this order.'));
        setProcessing(false);
        return;
      }

      // Process the order data
      await processOrderData(orderData, orderParam);

      // Subscribe to real-time updates if order is still in a non-terminal state
      const terminalStatuses = ['completed', 'failed', 'esim_creation_failed', 'payment_mismatch', 'blocked', 'refunded', 'disputed'];
      if (!terminalStatuses.includes(orderData.status)) {
        unsubscribeRef.current = subscribeToOrder(orderParam);
      }
      
    } catch (err) {
      console.error('Payment success error:', err);
      setError(`${t('paymentSuccess.errorGeneric', 'Error loading order')}: ${err.message}`);
      setProcessing(false);
    }
  }, [currentUser, searchParams, processOrderData, subscribeToOrder, t]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Start processing when auth is ready
  useEffect(() => {
    if (authLoading || i18nLoading) return;
    
    if (!hasProcessed.current) {
      hasProcessed.current = true;
      handlePaymentSuccess();
    }
  }, [authLoading, i18nLoading, handlePaymentSuccess]);

  // Loading state
  if (authLoading || i18nLoading || processing) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-secondary)' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue mx-auto mb-4"></div>
          <p className="text-text-muted">{t('paymentSuccess.loading', 'Processing payment...')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-secondary)' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto rounded-lg shadow-lg p-8 text-center" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}>
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">{t('paymentSuccess.error', 'Error')}</h2>
          <p className="text-text-muted mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-8 py-4 bg-tufts-blue text-white font-semibold rounded-lg hover:bg-cobalt-blue transition-colors"
          >
            {t('paymentSuccess.goToDashboard', 'Go to Dashboard')}
          </button>
        </div>
      </div>
    );
  }

  // Pending state - waiting for webhook to process
  if (orderStatus === 'pending') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-secondary)' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto rounded-lg shadow-lg p-8 text-center" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}>
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-text-primary mb-2">
            {t('paymentSuccess.processingTitle', 'Processing Your Order')}
          </h2>
          <p className="text-text-muted mb-4">
            {t('paymentSuccess.processingMessage', 'Your payment was successful! We are now activating your eSIM. This usually takes a few seconds.')}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tufts-blue mx-auto mb-4"></div>
          <p className="text-sm text-text-muted">
            {t('paymentSuccess.processingNote', 'This page will automatically update when your eSIM is ready.')}
          </p>
          {orderInfo && (
            <p className="text-xs text-text-muted mt-4">
              {t('paymentSuccess.orderId', 'Order ID')}: {orderInfo.orderId}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Success state with QR code
  if (orderStatus === 'completed' && qrCodeData) {
    return (
      <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-secondary)' }} dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="relative isolate flex-1 flex flex-col">

          {/* Success Header with gradient */}
          <div className="pt-12 pb-8 sm:pt-16 sm:pb-10" style={{ background: 'linear-gradient(to bottom, rgba(16, 185, 129, 0.05), var(--bg-primary), var(--bg-secondary))' }}>
            <div className="max-w-2xl mx-auto px-4 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-5" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-text-primary mb-2 tracking-tight">
                {t('paymentSuccess.title', 'Payment Successful!')}
              </h1>
              <p className="text-text-muted text-base sm:text-lg">
                {t('paymentSuccess.subtitle', 'Your eSIM has been activated successfully')}
              </p>
              {orderInfo && (
                <p className="text-xs text-text-muted mt-3 font-mono">
                  {t('paymentSuccess.orderId', 'Order ID')}: {orderInfo.orderId}
                </p>
              )}
            </div>
          </div>

          {/* QR Code Card */}
          <div className="max-w-lg mx-auto w-full px-4 -mt-2">
            <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}>
              {/* QR Code */}
              <div className="p-6 sm:p-8 flex flex-col items-center">
                <p className="text-sm text-text-muted mb-5 text-center">
                  {t('paymentSuccess.qrCodeDescription', 'Scan this QR code with your device to activate your eSIM')}
                </p>
                <div className="bg-white p-3 rounded-xl border-2 shadow-sm" style={{ borderColor: 'var(--subtle-border)' }}>
                  {generatedQrCode ? (
                    <Image
                      src={generatedQrCode}
                      alt="eSIM QR Code"
                      width={300}
                      height={300}
                      className="w-56 h-56 sm:w-64 sm:h-64"
                    />
                  ) : qrCodeData.qrCodeUrl && !qrCodeData.qrCodeUrl.includes('test.example.com') ? (
                    <Image
                      src={qrCodeData.qrCodeUrl}
                      alt="eSIM QR Code"
                      width={256}
                      height={256}
                      className="w-56 h-56 sm:w-64 sm:h-64"
                    />
                  ) : (
                    <div className="w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center rounded-lg" style={{ backgroundColor: 'var(--subtle-bg)' }}>
                      <QrCode className="w-16 h-16 text-text-muted" />
                    </div>
                  )}
                </div>
              </div>

              {/* LPA & ICCID details */}
              {(qrCodeData.lpa || qrCodeData.qrCode || qrCodeData.iccid) && (
                <div className="px-6 py-4 space-y-2" style={{ borderTop: '1px solid var(--subtle-border)' }}>
                  {(qrCodeData.lpa || qrCodeData.qrCode) && (
                    <div>
                      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{t('paymentSuccess.lpaCode', 'LPA Code')}</span>
                      <p className="mt-1 font-mono text-xs text-text-muted break-all p-2 rounded-lg" style={{ backgroundColor: 'var(--subtle-bg)' }}>
                        {qrCodeData.lpa || qrCodeData.qrCode}
                      </p>
                    </div>
                  )}
                  {qrCodeData.iccid && (
                    <div>
                      <span className="text-xs font-medium text-text-muted uppercase tracking-wide">{t('paymentSuccess.iccid', 'ICCID')}</span>
                      <p className="mt-1 font-mono text-xs text-text-muted">{qrCodeData.iccid}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="p-4 flex flex-col sm:flex-row gap-3" style={{ borderTop: '1px solid var(--subtle-border)' }}>
                <button
                  onClick={() => {
                    const qrSource = generatedQrCode || qrCodeData.qrCodeUrl;
                    if (qrSource) {
                      const link = document.createElement('a');
                      link.href = qrSource;
                      link.download = `esim-qr-${orderInfo?.orderId || 'order'}.png`;
                      link.click();
                    }
                  }}
                  className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-tufts-blue text-white text-sm font-medium rounded-xl hover:bg-cobalt-blue transition-colors ${isRTL ? 'flex-row-reverse' : ''}`}
                  disabled={!generatedQrCode && !qrCodeData.qrCodeUrl}
                >
                  <Download className="w-4 h-4" />
                  {t('paymentSuccess.downloadQR', 'Download QR Code')}
                </button>
                {currentUser && (
                  <button
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-xl transition-colors"
                    style={{ backgroundColor: 'var(--subtle-bg)', color: 'var(--text-primary)' }}
                  >
                    {t('paymentSuccess.goToDashboard', 'Go to Dashboard')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Next Steps — Install Guide CTA */}
          <div className="max-w-lg mx-auto w-full px-4 mt-5">
            <Link
              href="/help/install-esim"
              className="group block rounded-2xl shadow-sm p-5 sm:p-6 hover:shadow-md transition-all duration-200"
              style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--card-border)' }}
            >
              <div className={`flex items-start gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-tufts-blue/10 flex items-center justify-center group-hover:bg-tufts-blue/20 transition-colors">
                  <BookOpen className="w-5 h-5 text-tufts-blue" />
                </div>
                <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
                  <h3 className="text-base font-semibold text-text-primary mb-1">
                    {t('paymentSuccess.installGuideTitle', 'How to Install Your eSIM')}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {t('paymentSuccess.installGuideDescription', 'Step-by-step instructions for iPhone and Android — takes less than 2 minutes.')}
                  </p>
                </div>
                <ArrowRight className={`w-5 h-5 text-text-muted group-hover:text-tufts-blue group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-3 ${isRTL ? 'rotate-180 group-hover:-translate-x-0.5' : ''}`} />
              </div>
            </Link>
          </div>

          {/* Quick tips */}
          <div className="max-w-lg mx-auto w-full px-4 mt-5 mb-12">
            <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
              <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <Smartphone className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 mb-2">
                    {t('paymentSuccess.quickTipsTitle', 'Before you scan')}
                  </p>
                  <ul className={`text-sm text-amber-700 space-y-1 ${isRTL ? 'pr-4' : 'pl-4'}`}>
                    <li className="list-disc">{t('paymentSuccess.tip1', 'Make sure you have a stable WiFi connection')}</li>
                    <li className="list-disc">{t('paymentSuccess.tip2', 'Turn off any VPN before scanning')}</li>
                    <li className="list-disc">{t('paymentSuccess.tip3', 'Enable Data Roaming after installation')}</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // Default/fallback state
  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue mx-auto mb-4"></div>
        <p className="text-text-muted">{t('paymentSuccess.loading', 'Loading...')}</p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
