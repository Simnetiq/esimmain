'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

const TopUpProcessing = ({ topupId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { loading: authLoading } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();

  const [status, setStatus] = useState('loading');
  const [topupData, setTopupData] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const currentLanguage = useMemo(() => {
    if (i18nLoading) return detectLanguageFromPath(pathname) || 'en';
    return locale || 'en';
  }, [locale, pathname, i18nLoading]);
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  useEffect(() => {
    if (authLoading || !topupId) return;

    const supabase = getSupabase();

    const fetchTopup = async () => {
      const { data, error: fetchErr } = await supabase
        .from('esim_topups')
        .select('*')
        .eq('id', topupId)
        .single();

      if (fetchErr || !data) {
        setStatus('not_found');
        setError('Top-up not found');
        return;
      }

      setTopupData(data);

      if (data.status === 'topup_success') {
        setStatus('success');
        return;
      }
      if (data.status === 'topup_failed') {
        setStatus('failed');
        setError(data.error_message || 'Top-up failed');
        return;
      }

      setStatus('processing');
    };

    fetchTopup();

    // Poll every 3 seconds
    pollRef.current = setInterval(fetchTopup, 3000);

    // Also subscribe to realtime changes
    const channel = supabase
      .channel(`topup_${topupId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'esim_topups',
        filter: `id=eq.${topupId}`,
      }, (payload) => {
        const updated = payload.new;
        setTopupData(updated);
        if (updated.status === 'topup_success') {
          setStatus('success');
          clearInterval(pollRef.current);
        } else if (updated.status === 'topup_failed') {
          setStatus('failed');
          setError(updated.error_message || 'Top-up failed');
          clearInterval(pollRef.current);
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [authLoading, topupId]);

  // Auto-stop polling after 2 minutes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status === 'processing') {
        clearInterval(pollRef.current);
        setStatus('timeout');
        setError('Processing is taking longer than expected. Please check your dashboard.');
      }
    }, 120000);
    return () => clearTimeout(timeout);
  }, [status]);

  const getDashboardUrl = () => {
    return currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-secondary)] flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md bg-[var(--bg-primary)] rounded-2xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-tufts-blue border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">{t('topup.loading', 'Loading...')}</h2>
          </>
        )}

        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-tufts-blue border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">{t('topup.processing', 'Processing Top-Up')}</h2>
            <p className="text-text-muted">{t('topup.processingDesc', 'Your top-up is being applied to your eSIM. This usually takes a few seconds.')}</p>
            {topupData && (
              <div className="mt-6 bg-[var(--bg-secondary)] rounded-xl p-4 text-left">
                <p className="text-sm text-text-muted">{t('topup.package', 'Package')}</p>
                <p className="font-medium text-text-primary">{topupData.package_name}</p>
                <p className="text-sm text-text-muted mt-2">{t('topup.amount', 'Amount')}</p>
                <p className="font-medium text-text-primary">${parseFloat(topupData.price).toFixed(2)}</p>
              </div>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">{t('topup.success', 'Top-Up Successful!')}</h2>
            <p className="text-text-muted mb-6">{t('topup.successDesc', 'Your data has been added to your eSIM.')}</p>
            {topupData && (
              <div className="mb-6 bg-emerald-50 rounded-xl p-4 text-left border border-emerald-100">
                <p className="font-medium text-emerald-800">{topupData.package_name}</p>
                <p className="text-sm text-emerald-600">{topupData.data_amount} | {topupData.validity}</p>
              </div>
            )}
            <button
              onClick={() => router.push(getDashboardUrl())}
              className="w-full py-3 bg-tufts-blue text-white rounded-xl font-medium hover:bg-tufts-blue/90 transition-colors"
            >
              {t('topup.backToDashboard', 'Back to Dashboard')}
            </button>
          </>
        )}

        {(status === 'failed' || status === 'timeout' || status === 'not_found') && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary mb-2">
              {status === 'not_found'
                ? t('topup.notFound', 'Top-Up Not Found')
                : t('topup.failed', 'Top-Up Failed')}
            </h2>
            <p className="text-text-muted mb-6">{error || t('topup.failedDesc', 'Something went wrong. Please contact support.')}</p>
            <button
              onClick={() => router.push(getDashboardUrl())}
              className="w-full py-3 bg-[var(--login-bg)] text-[var(--login-text)] rounded-xl font-medium hover:opacity-90 transition-colors"
            >
              {t('topup.backToDashboard', 'Back to Dashboard')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TopUpProcessing;
