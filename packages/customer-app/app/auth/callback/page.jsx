'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@esim/shared/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const [statusMessage, setStatusMessage] = useState('Signing you in...');

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    // Parse query params without useSearchParams (avoids Suspense requirement)
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error');
    const oauthErrorDescription = params.get('error_description');

    if (oauthError) {
      // Provider returned an error (e.g. user cancelled, access denied)
      setStatusMessage('Authentication cancelled. Redirecting...');
      router.replace(`/login?error=${encodeURIComponent(oauthErrorDescription || oauthError)}`);
      return;
    }

    let redirected = false;

    const redirect = (session) => {
      if (redirected || !session?.user) return;
      redirected = true;
      // Locale-aware redirect: read language stored before OAuth navigation
      const lang =
        typeof window !== 'undefined'
          ? localStorage.getItem('Simnetiq-language') || 'en'
          : 'en';
      const dashboardUrl = lang === 'en' ? '/dashboard' : `/${lang}/dashboard`;
      router.replace(dashboardUrl);
    };

    // Subscribe BEFORE getSession to avoid the race where SIGNED_IN
    // fires during AuthProvider's getSession() call on page mount.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        redirect(session);
      }
    });

    // Also check for an already-established session (handles the case where
    // SIGNED_IN fired before the subscription above was registered).
    supabase.auth.getSession().then(({ data: { session } }) => {
      redirect(session);
    });

    // Timeout fallback — 15s gives mobile Safari enough time for PKCE exchange
    const timeout = setTimeout(() => {
      if (!redirected) {
        router.replace('/login?error=auth_timeout');
      }
    }, 15000);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-text-muted">{statusMessage}</p>
      </div>
    </div>
  );
}
