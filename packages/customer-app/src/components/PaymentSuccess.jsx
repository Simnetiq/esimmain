'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import { QrCode, Download, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import QRCodeLib from 'qrcode';
import Image from 'next/image';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';
import { appStoreLinks } from '@esim/shared/utils/appStoreLinks';

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue mx-auto mb-4"></div>
          <p className="text-gray-600">{t('paymentSuccess.loading', 'Processing payment...')}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('paymentSuccess.error', 'Error')}</h2>
          <p className="text-gray-600 mb-6">{error}</p>
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {t('paymentSuccess.processingTitle', 'Processing Your Order')}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('paymentSuccess.processingMessage', 'Your payment was successful! We are now activating your eSIM. This usually takes a few seconds.')}
          </p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-tufts-blue mx-auto mb-4"></div>
          <p className="text-sm text-gray-500">
            {t('paymentSuccess.processingNote', 'This page will automatically update when your eSIM is ready.')}
          </p>
          {orderInfo && (
            <p className="text-xs text-gray-400 mt-4">
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
      <div className="bg-white min-h-screen flex flex-col" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="relative isolate flex-1 flex flex-col">
          {/* Header */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-20 mt-10">
              <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="text-center mb-8">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-eerie-black mb-2">
                    {t('paymentSuccess.title', 'Payment Successful!')}
                  </h1>
                  <p className="text-cool-black text-lg">
                    {t('paymentSuccess.subtitle', 'Your eSIM has been activated successfully')}
                  </p>
                  {orderInfo && (
                    <p className="text-sm text-cool-black mt-2">
                      {t('paymentSuccess.orderId', 'Order ID')}: {orderInfo.orderId}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100"></div>
          </div>

          {/* QR Code Section */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl">
              <div className="px-4 py-8 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <div className="bg-jordy-blue/10 p-6 rounded-lg">
                  <div className="text-center mb-6">
                    <p className="text-cool-black text-base">
                      {t('paymentSuccess.qrCodeDescription', 'Scan this QR code with your device to activate your eSIM')}
                    </p>
                  </div>
                  
                  <div className="flex justify-center mb-6">
                    <div className="bg-white p-4 rounded-lg border-4 border-gray-200">
                      {generatedQrCode ? (
                        <Image 
                          src={generatedQrCode} 
                          alt="eSIM QR Code" 
                          width={300}
                          height={300}
                          className="w-64 h-64 md:w-72 md:h-72"
                        />
                      ) : qrCodeData.qrCodeUrl && !qrCodeData.qrCodeUrl.includes('test.example.com') ? (
                        <Image 
                          src={qrCodeData.qrCodeUrl} 
                          alt="eSIM QR Code" 
                          width={256}
                          height={256}
                          className="w-64 h-64"
                        />
                      ) : (
                        <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded">
                          <QrCode className="w-16 h-16 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
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
                      className="inline-flex items-center justify-center px-6 py-3 bg-tufts-blue text-white rounded-md hover:bg-cobalt-blue transition-colors"
                      disabled={!generatedQrCode && !qrCodeData.qrCodeUrl}
                    >
                      <Download className="w-5 h-5 mr-2" />
                      {t('paymentSuccess.downloadQR', 'Download QR Code')}
                    </button>
                    
                    {currentUser && (
                      <button
                        onClick={() => router.push('/dashboard')}
                        className="inline-flex items-center justify-center px-6 py-3 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        {t('paymentSuccess.goToDashboard', 'Go to Dashboard')}
                      </button>
                    )}
                  </div>

                  <div className="mt-6 p-4 bg-white rounded-md space-y-2">
                    {(qrCodeData.lpa || qrCodeData.qrCode) && (
                      <div className="text-sm text-gray-700">
                        <strong>{t('paymentSuccess.lpaCode', 'LPA Code')}:</strong>
                        <p className="mt-1 font-mono text-xs break-all bg-gray-50 p-2 rounded">
                          {qrCodeData.lpa || qrCodeData.qrCode}
                        </p>
                      </div>
                    )}
                    {qrCodeData.iccid && (
                      <p className="text-sm text-gray-700">
                        <strong>{t('paymentSuccess.iccid', 'ICCID')}:</strong> {qrCodeData.iccid}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full h-px bg-gray-100"></div>
          </div>

          {/* Instructions Section */}
          <div className="mx-auto w-full max-w-9xl">
            <div className="mx-auto w-full max-w-7xl lg:mt-10 mt-6">
              <div className="px-4 py-6 mx-auto sm:max-w-2xl lg:max-w-5xl 2xl:max-w-7xl">
                <h3 className="text-xl sm:text-2xl font-semibold text-eerie-black mb-6">
                  {t('paymentSuccess.activationInstructions', 'Activation Instructions')}
                </h3>
                
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* iOS */}
                  <div className="border border-gray-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Image src="/images/logo_icon/apple.svg" alt="iOS" width={32} height={32} className="w-8 h-8" />
                      <h4 className="text-lg font-semibold">iOS</h4>
                    </div>
                    <ol className="space-y-2 text-sm text-gray-600">
                      <li>1. {t('paymentSuccess.iosStep1', 'Settings → Cellular → Add eSIM')}</li>
                      <li>2. {t('paymentSuccess.iosStep2', 'Scan the QR code')}</li>
                      <li>3. {t('paymentSuccess.iosStep3', 'Label your eSIM')}</li>
                      <li>4. {t('paymentSuccess.iosStep4', 'Enable Data Roaming')}</li>
                    </ol>
                    <a href={appStoreLinks.ios} target="_blank" rel="noopener noreferrer" 
                       className="mt-4 inline-block px-4 py-2 bg-tufts-blue text-white rounded-md text-sm">
                      Download App
                    </a>
                  </div>
                  
                  {/* Android */}
                  <div className="border border-gray-200 p-6 rounded-lg">
                    <div className="flex items-center gap-3 mb-4">
                      <Image src="/images/logo_icon/android.svg" alt="Android" width={32} height={32} className="w-8 h-8" />
                      <h4 className="text-lg font-semibold">Android</h4>
                    </div>
                    <ol className="space-y-2 text-sm text-gray-600">
                      <li>1. {t('paymentSuccess.androidStep1', 'Settings → Network → SIMs → Add')}</li>
                      <li>2. {t('paymentSuccess.androidStep2', 'Scan QR code')}</li>
                      <li>3. {t('paymentSuccess.androidStep3', 'Name your eSIM')}</li>
                      <li>4. {t('paymentSuccess.androidStep4', 'Enable Data Roaming')}</li>
                    </ol>
                    <a href={appStoreLinks.android} target="_blank" rel="noopener noreferrer"
                       className="mt-4 inline-block px-4 py-2 bg-tufts-blue text-white rounded-md text-sm">
                      Download App
                    </a>
                  </div>
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-tufts-blue mx-auto mb-4"></div>
        <p className="text-gray-600">{t('paymentSuccess.loading', 'Loading...')}</p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
