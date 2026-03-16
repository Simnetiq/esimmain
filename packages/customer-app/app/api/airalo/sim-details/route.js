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

    // Get eSIM details using ICCID
    const simResponse = await fetch(`${baseUrl}/v2/sims/${iccid}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!simResponse.ok) {
      const errorText = await simResponse.text();

      if (simResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'eSIM not found with provided ICCID',
          statusCode: 404
        }, { status: 404 });
      } else if (simResponse.status === 429) {
        return NextResponse.json({
          success: false,
          error: 'Rate limit exceeded - too many requests',
          statusCode: 429
        }, { status: 429 });
      } else {
        return NextResponse.json({
          success: false,
          error: `Failed to get eSIM details: ${simResponse.statusText} - ${errorText}`,
          statusCode: simResponse.status
        }, { status: simResponse.status });
      }
    }

    const simDetails = await simResponse.json();
    const simData = simDetails.data;
    // Airalo returns: qrcode, lpa, qrcode_url, direct_apple_installation_url, matching_id
    const lpaString = simData?.lpa || simData?.qrcode;
    const appleInstallUrl = simData?.direct_apple_installation_url ||
      (lpaString ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaString)}` : null);

    const qrCodeData = {
      qr_code: lpaString,
      qr_code_url: simData?.qrcode_url,
      direct_apple_installation_url: appleInstallUrl,
      matching_id: simData?.matching_id,
      activation_code: simData?.confirmation_code,
      qrCode: lpaString,
      qrCodeUrl: simData?.qrcode_url,
      activationCode: simData?.confirmation_code,
      iccid: simData?.iccid,
      lpa: simData?.lpa,
      directAppleInstallationUrl: appleInstallUrl,
      matchingId: simData?.matching_id,
      status: simData?.simable?.status?.slug,
      packageName: simData?.simable?.package,
      packageDetails: simData?.simable,
      country_code: simData?.simable?.package_id,
    };

    return NextResponse.json({
      success: true,
      data: qrCodeData,
      fullSimData: simData,
      message: 'eSIM details retrieved successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
