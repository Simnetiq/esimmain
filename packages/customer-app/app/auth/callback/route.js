import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  const response = NextResponse.redirect(new URL(next, request.url));

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    console.log('🔑 Auth callback - code exchange result:', { 
      success: !!data?.session, 
      error: error?.message,
      userId: data?.user?.id,
      cookiesSet: response.cookies.getAll().map(c => c.name)
    });
    if (error) {
      console.error('Auth callback error:', error.message);
      return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }
  }

  return response;
}
