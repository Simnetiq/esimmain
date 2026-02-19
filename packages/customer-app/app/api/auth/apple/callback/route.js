import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

function generateAppleClientSecret() {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const privateKey = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    iss: teamId, iat: now, exp: now + 300,
    aud: 'https://appleid.apple.com', sub: clientId,
  })).toString('base64url');

  const sign = crypto.createSign('SHA256');
  sign.update(`${header}.${payload}`);
  return `${header}.${payload}.${sign.sign(privateKey, 'base64url')}`;
}

// Apple sends POST with form data (response_mode=form_post)
export async function POST(request) {
  try {
    const formData = await request.formData();
    const code = formData.get('code');
    const state = formData.get('state');
    const error = formData.get('error');
    const origin = new URL(request.url).origin;

    if (error || !code) {
      return NextResponse.redirect(`${origin}/login?error=apple_denied`);
    }

    // Exchange code with Apple directly
    const clientSecret = generateAppleClientSecret();
    const tokenParams = new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: 'https://simnetiq.store/api/auth/apple/callback',
    });

    const tokenRes = await fetch('https://appleid.apple.com/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    const tokenData = await tokenRes.json();
    console.log('Apple token exchange result:', tokenData.error || 'success');

    if (tokenData.error) {
      console.error('Apple exchange error:', tokenData.error, tokenData.error_description);
      return NextResponse.redirect(`${origin}/login?error=apple_token_${tokenData.error}`);
    }

    // Use signInWithIdToken to create/link Supabase user
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Decode id_token for user info
    const idPayload = JSON.parse(Buffer.from(tokenData.id_token.split('.')[1], 'base64url').toString());

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === idPayload.email);

    let session;
    if (existingUser) {
      // Link Apple identity to existing user
      const { data, error: signInErr } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: idPayload.email,
      });
      if (signInErr) {
        console.error('Supabase link error:', signInErr.message);
        return NextResponse.redirect(`${origin}/login?error=supabase_link_failed`);
      }
      // Create a session for the user
      // Actually, use signInWithIdToken on a client-side supabase
    } 

    // Better approach: use the anon key client with signInWithIdToken
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const { data: signInData, error: signInError } = await anonSupabase.auth.signInWithIdToken({
      provider: 'apple',
      token: tokenData.id_token,
    });

    if (signInError) {
      console.error('Supabase signInWithIdToken error:', signInError.message);
      return NextResponse.redirect(`${origin}/login?error=supabase_apple_error&detail=${encodeURIComponent(signInError.message)}`);
    }

    // Redirect with session tokens in hash for client to pick up
    const accessToken = signInData.session.access_token;
    const refreshToken = signInData.session.refresh_token;

    return NextResponse.redirect(
      `${origin}/auth/callback#access_token=${accessToken}&refresh_token=${refreshToken}&token_type=bearer&type=apple`
    );
  } catch (err) {
    console.error('Apple callback error:', err);
    return NextResponse.redirect(`${new URL(request.url).origin}/login?error=apple_server_error`);
  }
}
