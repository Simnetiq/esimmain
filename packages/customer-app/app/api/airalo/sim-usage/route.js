import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';

// In-memory token cache to reduce auth requests
let tokenCache = {
  token: null,
  expiresAt: 0,
  baseUrl: null
};

export async function POST(request) {
  const { userId, error: authError } = await verifyUserJWT(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { iccid } = body;

    if (!iccid) {
      return NextResponse.json({
        success: false,
        error: 'ICCID is required'
      }, { status: 400 });
    }

    // Verify user owns this ICCID
    const supabaseAuth = getSupabaseAdmin();
    const { data: ownerCheck } = await supabaseAuth.from('orders').select('id').eq('user_id', userId).eq('iccid', iccid).limit(1);
    if (!ownerCheck?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    
    let clientId = isSandbox
      ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
      : process.env.AIRALO_CLIENT_ID;
      
    let clientSecret = isSandbox
      ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
      : process.env.AIRALO_CLIENT_SECRET;
    
    const baseUrl = isSandbox 
      ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
      : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
    
    // Fallback to Supabase config if env vars not set
    if (!clientId || !clientSecret) {
      const supabase = getSupabaseAdmin();
      const { data: configData } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 'airalo')
        .single();
      
      if (configData) {
        clientId = clientId || configData.client_id || configData.api_key;
        clientSecret = clientSecret || configData.client_secret;
      }
    }
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo credentials not configured.',
        statusCode: 500
      }, { status: 500 });
    }

    const now = Date.now();
    let accessToken = null;

    if (tokenCache.token && tokenCache.expiresAt > now && tokenCache.baseUrl === baseUrl) {
      accessToken = tokenCache.token;
    } else {
      const authResponse = await fetch(`${baseUrl}/v2/token`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'client_credentials'
        })
      });

      if (!authResponse.ok) {
        return NextResponse.json({
          success: false,
          error: 'Unable to connect to eSIM provider. Please try again later.',
          statusCode: 401
        }, { status: 401 });
      }

      const authData = await authResponse.json();
      accessToken = authData.data?.access_token;

      if (!accessToken) {
        throw new Error('No access token received from Airalo API');
      }

      tokenCache = {
        token: accessToken,
        expiresAt: now + (50 * 60 * 1000),
        baseUrl: baseUrl
      };
    }

    const usageResponse = await fetch(`${baseUrl}/v2/sims/${iccid}/usage`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!usageResponse.ok) {
      const errorText = await usageResponse.text();
      console.error('[Airalo Usage] Usage fetch failed:', usageResponse.status, errorText);
      
      if (usageResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'Invalid ICCID - eSIM not found',
          statusCode: 404
        }, { status: 404 });
      } else if (usageResponse.status === 429) {
        return NextResponse.json({
          success: false,
          error: 'Rate limit exceeded - please wait before checking again (1 request per 15 minutes per eSIM)',
          statusCode: 429
        }, { status: 429 });
      } else if (usageResponse.status === 422) {
        return NextResponse.json({
          success: false,
          error: 'Usage data not available for this eSIM package. This may be a prepaid package that does not support usage tracking.',
          statusCode: 422,
          isUnsupported: true
        }, { status: 422 });
      } else {
        return NextResponse.json({
          success: false,
          error: `Failed to get usage data: ${usageResponse.statusText} - ${errorText}`,
          statusCode: usageResponse.status
        }, { status: usageResponse.status });
      }
    }

    const usageData = await usageResponse.json();
    const rawData = usageData?.data || usageData || {};
    
    const normalizedData = {
      remaining: rawData.remaining ?? rawData.data_remaining ?? rawData.remaining_data ?? 0,
      total: rawData.total ?? rawData.data_total ?? rawData.total_data ?? 0,
      remaining_voice: rawData.remaining_voice ?? rawData.voice_remaining ?? 0,
      total_voice: rawData.total_voice ?? rawData.voice_total ?? 0,
      remaining_text: rawData.remaining_text ?? rawData.text_remaining ?? rawData.remaining_sms ?? 0,
      total_text: rawData.total_text ?? rawData.text_total ?? rawData.total_sms ?? 0,
      status: rawData.status || 'UNKNOWN',
      expired_at: rawData.expired_at || rawData.expiry_date || rawData.expires_at || null,
      is_unlimited: rawData.is_unlimited || rawData.unlimited || false,
      activated_at: rawData.activated_at || null,
      _raw: rawData
    };

    return NextResponse.json({
      success: true,
      data: normalizedData,
      meta: usageData.meta,
      message: 'Usage data retrieved successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
