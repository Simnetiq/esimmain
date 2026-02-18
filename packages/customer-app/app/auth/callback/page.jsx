'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@esim/shared/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    
    // The implicit flow puts tokens in the URL hash
    // Supabase client auto-detects them via detectSessionInUrl: true
    // Just wait for the session to be established, then redirect
    
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace('/dashboard');
      }
    });

    // Fallback: if session already exists, redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard');
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      router.replace('/login?error=auth_timeout');
    }, 10000);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Signing you in...</p>
      </div>
    </div>
  );
}
