import { NextResponse } from 'next/server';

// Generate mock QR code data for sandbox mode
function generateMockQR() {
  const mockIccid = `8901260${Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0')}`;
  const mockActivationCode = `TEST_${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
  const mockMatchingId = `MATCH_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
  const mockLpa = `LPA:1$test.smdp.io$${mockMatchingId}`;
  const appleInstallUrl = `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(mockLpa)}`;
  
  return {
    qr_code: mockLpa,
    qr_code_url: 'https://test.example.com/qr.png',
    direct_apple_installation_url: appleInstallUrl,
    matching_id: mockMatchingId,
    activation_code: mockActivationCode,
    smdp_address: 'test.smdp.io',
    qrCode: mockLpa,
    lpa: mockLpa,
    iccid: mockIccid,
    activationCode: mockActivationCode,
    matchingId: mockMatchingId,
    smdpAddress: 'test.smdp.io',
    qrCodeUrl: 'https://test.example.com/qr.png',
    directAppleInstallationUrl: appleInstallUrl
  };
}

export async function POST(request) {
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
          activation_code: mockSimData.activation_code,
          smdp_address: 'test.smdp.io',
          qrCode: lpaString,
          activationCode: mockSimData.activation_code,
          iccid: mockSimData.iccid,
          lpa: mockSimData.lpa,
          matchingId: mockSimData.matching_id,
          smdpAddress: 'test.smdp.io',
          qrCodeUrl: mockSimData.qrcode_url || 'https://test.example.com/qr.png',
          directAppleInstallationUrl: appleUrl
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

    // PRODUCTION MODE - Get real QR code from Airalo via OAuth
    if (!orderIdToUse) {
      return NextResponse.json({
        success: false,
        error: 'Airalo order ID not found. Order may still be processing.'
      }, { status: 400 });
    }

    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    
    let clientId = isSandbox
      ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
      : process.env.AIRALO_CLIENT_ID;
      
    let clientSecret = isSandbox
      ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
      : process.env.AIRALO_CLIENT_SECRET;
    
    const airaloBaseUrl = isSandbox 
      ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
      : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
    
    // Fallback to Supabase config if env vars not set
    if (!clientId || !clientSecret) {
      const { getSupabaseAdmin } = await import('@esim/shared/lib/supabaseAdmin');
      const supabase = getSupabaseAdmin();
      const { data: configData } = await supabase
        .from('app_config')
        .select('*')
        .eq('id', 'airalo')
        .single();
      
      if (configData) {
        clientId = clientId || configData.api_key || configData.client_id;
        clientSecret = clientSecret || configData.client_secret;
      }
    }
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo credentials not found'
      }, { status: 400 });
    }

    // Authenticate with Airalo OAuth
    const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
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
      const errorText = await authResponse.text();
      console.error('[Airalo QR Code] Auth failed:', errorText);
      return NextResponse.json({
        success: false,
        error: `Authentication failed: ${authResponse.statusText}`
      }, { status: 401 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;

    if (!accessToken) {
      return NextResponse.json({
        success: false,
        error: 'No access token received from Airalo'
      }, { status: 401 });
    }

    const simResponse = await fetch(`${airaloBaseUrl}/v2/sims/${orderIdToUse}`, {
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
        userMessage = 'This eSIM order was not found in the Airalo system. This usually happens when viewing sandbox/test orders in production mode. Only real production orders can be accessed.';
      } else if (simResponse.status === 429) {
        userMessage = 'Too many requests. Please wait a few minutes before trying again. Airalo API has rate limits: 100 requests per minute per eSIM.';
      } else if (simResponse.status === 400 && errorText.includes('processing')) {
        userMessage = 'Your eSIM is still being activated. Please wait 1-2 minutes and try again.';
        canRetry = true;
      } else if (simResponse.status === 401) {
        userMessage = 'Authentication failed. Please contact support if this persists.';
      }
      
      console.error('[Airalo QR Code] Error:', {
        status: simResponse.status,
        orderId: orderIdToUse,
        mode: airaloMode,
        error: errorText
      });
      
      return NextResponse.json({
        success: false,
        error: userMessage,
        details: errorText,
        canRetry: canRetry
      }, { status: simResponse.status });
    }

    const simResult = await simResponse.json();
    const simData = simResult.data;

    const qrCode = simData.qrcode || simData.lpa;
    const lpa = simData.lpa;
    const iccid = simData.iccid;
    const matchingId = simData.matching_id;
    const activationCode = simData.activation_code;
    const appleInstallUrl = lpa ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}` : null;

    return NextResponse.json({
      success: true,
      qr_code: qrCode,
      qr_code_url: simData.qrcode_url,
      direct_apple_installation_url: appleInstallUrl,
      matching_id: matchingId,
      activation_code: activationCode,
      smdp_address: simData.smdp_address,
      qrCode: qrCode,
      qrCodeUrl: simData.qrcode_url,
      directAppleInstallationUrl: appleInstallUrl,
      activationCode: activationCode,
      iccid: iccid,
      lpa: lpa,
      matchingId: matchingId,
      smdpAddress: simData.smdp_address,
      orderDetails: simData,
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
