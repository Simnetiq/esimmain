import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';
import { getAiraloToken, getAiraloCredentials } from '@esim/shared/lib/airaloToken';

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

    const { clientId, clientSecret, baseUrl } = getAiraloCredentials();
    const accessToken = await getAiraloToken(baseUrl, clientId, clientSecret);

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
          error: 'Rate limit exceeded - please wait before checking again',
          statusCode: 429
        }, { status: 429 });
      } else if (usageResponse.status === 422) {
        return NextResponse.json({
          success: false,
          error: 'Usage data not available for this eSIM package.',
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
    // Airalo response: { data: { remaining, total, expired_at, is_unlimited, status, remaining_voice, remaining_text, total_voice, total_text } }
    const rawData = usageData?.data || {};

    const normalizedData = {
      remaining: rawData.remaining ?? 0,
      total: rawData.total ?? 0,
      remaining_voice: rawData.remaining_voice ?? 0,
      total_voice: rawData.total_voice ?? 0,
      remaining_text: rawData.remaining_text ?? 0,
      total_text: rawData.total_text ?? 0,
      status: rawData.status || 'UNKNOWN',
      expired_at: rawData.expired_at || null,
      is_unlimited: rawData.is_unlimited || false,
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
