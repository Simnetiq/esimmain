import { NextResponse } from 'next/server';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';
import { getAiraloToken, getAiraloCredentials } from '@esim/shared/lib/airaloToken';

// Generate mock QR code data for sandbox mode
function generateMockQR() {
  const mockIccid = `8901260${Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0')}`;
  const mockMatchingId = `MATCH_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
  const mockLpa = `LPA:1$test.smdp.io$${mockMatchingId}`;
  const appleInstallUrl = `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(mockLpa)}`;

  return {
    qr_code: mockLpa,
    qr_code_url: 'https://test.example.com/qr.png',
    direct_apple_installation_url: appleInstallUrl,
    matching_id: mockMatchingId,
    activation_code: `TEST_${Math.random().toString(36).substring(2, 14).toUpperCase()}`,
    smdp_address: 'test.smdp.io',
    qrCode: mockLpa,
    lpa: mockLpa,
    iccid: mockIccid,
    matchingId: mockMatchingId,
    smdpAddress: 'test.smdp.io',
    qrCodeUrl: 'https://test.example.com/qr.png',
    directAppleInstallationUrl: appleInstallUrl,
  };
}

export async function POST(request) {
  const { userId, error: authError } = await verifyUserJWT(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { orderId, airaloOrderId, isTestMode, mockSimData } = body;

    if (!orderId && !airaloOrderId) {
      return NextResponse.json({
        success: false,
        error: 'Order ID is required'
      }, { status: 400 });
    }

    const orderIdToUse = airaloOrderId || orderId;

    // Verify user owns the ICCID
    const { getSupabaseAdmin } = await import('@esim/shared/lib/supabaseAdmin');
    const supabaseAuth = getSupabaseAdmin();
    const { data: ownerCheck } = await supabaseAuth.from('orders').select('id').eq('user_id', userId).eq('iccid', orderIdToUse).limit(1);
    if (!ownerCheck?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // SANDBOX/TEST MODE - Return mock QR code
    if (isTestMode) {
      let qrData;
      if (mockSimData) {
        const lpaString = mockSimData.qrcode || mockSimData.lpa;
        const appleUrl = lpaString ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaString)}` : null;
        qrData = {
          qr_code: lpaString,
          qr_code_url: mockSimData.qrcode_url || 'https://test.example.com/qr.png',
          direct_apple_installation_url: appleUrl,
          matching_id: mockSimData.matching_id,
          activation_code: mockSimData.confirmation_code,
          smdp_address: 'test.smdp.io',
          qrCode: lpaString,
          activationCode: mockSimData.confirmation_code,
          iccid: mockSimData.iccid,
          lpa: mockSimData.lpa,
          matchingId: mockSimData.matching_id,
          smdpAddress: 'test.smdp.io',
          qrCodeUrl: mockSimData.qrcode_url || 'https://test.example.com/qr.png',
          directAppleInstallationUrl: appleUrl,
        };
      } else {
        qrData = generateMockQR();
      }
      return NextResponse.json({
        success: true,
        ...qrData,
        isTestMode: true,
        message: 'Mock QR code generated successfully'
      });
    }

    // PRODUCTION MODE - Get real QR code from Airalo via cached OAuth token
    if (!orderIdToUse) {
      return NextResponse.json({
        success: false,
        error: 'Airalo order ID not found. Order may still be processing.'
      }, { status: 400 });
    }

    const { clientId, clientSecret, baseUrl } = getAiraloCredentials();
    const accessToken = await getAiraloToken(baseUrl, clientId, clientSecret);

    const simResponse = await fetch(`${baseUrl}/v2/sims/${orderIdToUse}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!simResponse.ok) {
      const errorText = await simResponse.text();

      let userMessage = `QR code retrieval failed: ${simResponse.statusText}`;
      let canRetry = false;

      if (simResponse.status === 404) {
        userMessage = 'This eSIM order was not found in the Airalo system. Only real production orders can be accessed.';
      } else if (simResponse.status === 429) {
        userMessage = 'Too many requests. Please wait a few minutes before trying again.';
      } else if (simResponse.status === 400 && errorText.includes('processing')) {
        userMessage = 'Your eSIM is still being activated. Please wait 1-2 minutes and try again.';
        canRetry = true;
      } else if (simResponse.status === 401) {
        userMessage = 'Authentication failed. Please contact support if this persists.';
      }

      console.error('[Airalo QR Code] Error:', {
        status: simResponse.status,
        orderId: orderIdToUse,
        error: errorText
      });

      return NextResponse.json({
        success: false,
        error: userMessage,
        details: errorText,
        canRetry,
      }, { status: simResponse.status });
    }

    const simResult = await simResponse.json();
    const simData = simResult.data;

    // Airalo fields: lpa, qrcode, qrcode_url, matching_id, direct_apple_installation_url, confirmation_code
    const lpa = simData.lpa;
    const qrCode = simData.qrcode || lpa;
    const iccid = simData.iccid;
    const matchingId = simData.matching_id;
    const activationCode = simData.confirmation_code;
    const appleInstallUrl = simData.direct_apple_installation_url ||
      (lpa ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}` : null);

    return NextResponse.json({
      success: true,
      qr_code: qrCode,
      qr_code_url: simData.qrcode_url,
      direct_apple_installation_url: appleInstallUrl,
      matching_id: matchingId,
      activation_code: activationCode,
      smdp_address: lpa,
      qrCode,
      qrCodeUrl: simData.qrcode_url,
      directAppleInstallationUrl: appleInstallUrl,
      activationCode,
      iccid,
      lpa,
      matchingId,
      smdpAddress: lpa,
      simDetails: simData,
      message: 'QR code retrieved successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to retrieve QR code'
    }, { status: 500 });
  }
}
