import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function generateAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!teamId || !keyId || !clientId || !privateKey) {
    throw new Error('Missing Apple Sign-in configuration');
  }

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 300,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  })).toString('base64url');

  const sign = crypto.createSign('SHA256');
  sign.update(`${header}.${payload}`);
  return `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`;
}

// Step 1: Initiate Apple OAuth
export async function GET(request) {
  const clientId = process.env.APPLE_CLIENT_ID;
  const redirectUri = `${new URL(request.url).origin}/api/auth/apple`;
  const state = crypto.randomBytes(16).toString('hex');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    response_mode: 'form_post',
    scope: 'email name',
    state: state,
  });

  return NextResponse.redirect(`https://appleid.apple.com/auth/authorize?${params.toString()}`);
}

// Step 2: Handle Apple callback (POST from Apple)
export async function POST(request) {
  try {
    const formData = await request.formData();
    const code = formData.get('code');
    const error = formData.get('error');
    const userStr = formData.get('user'); // First sign-in only

    const origin = new URL(request.url).origin;

    if (error) {
      console.error('Apple auth error:', error);
      return NextResponse.redirect(`${origin}/login?error=apple_denied`);
    }

    if (!code) {
      return NextResponse.redirect(`${origin}/login?error=no_code`);
    }

    // Exchange code for tokens with Apple
    const clientSecret = generateAppleClientSecret();
    const clientId = process.env.APPLE_CLIENT_ID;

    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: `${origin}/api/auth/apple`,
    });

    const tokenResponse = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('Apple token exchange error:', tokenData.error, tokenData.error_description);
      return NextResponse.redirect(`${origin}/login?error=apple_exchange_failed`);
    }

    // Decode the id_token to get user info
    const idToken = tokenData.id_token;
    const tokenPayload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString());

    // Parse user data (only available on first sign-in)
    let userData = {};
    if (userStr) {
      try {
        userData = JSON.parse(userStr);
      } catch {}
    }

    // Sign in to Supabase using the Apple id_token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: idToken,
      nonce: '', // Apple doesn't use nonce in web flow
    });

    if (supabaseError) {
      console.error('Supabase signInWithIdToken error:', supabaseError.message);
      return NextResponse.redirect(`${origin}/login?error=supabase_apple_failed`);
    }

    // Set session cookies and redirect
    const response = NextResponse.redirect(`${origin}/dashboard`);
    
    if (data.session) {
      // Set the session tokens as cookies
      response.cookies.set('sb-access-token', data.session.access_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: data.session.expires_in,
      });
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }

    return response;
  } catch (err) {
    console.error('Apple auth handler error:', err);
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(`${origin}/login?error=apple_server_error`);
  }
}
