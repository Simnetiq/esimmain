import { NextResponse } from 'next/server';

// Generate mock QR code data for sandbox mode
function generateMockQR() {
  const mockIccid = `8901260${Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0')}`;
  const mockActivationCode = `TEST_${Math.random().toString(36).substring(2, 14).toUpperCase()}`;
  const mockMatchingId = `MATCH_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
  const mockLpa = `LPA:1$test.smdp.io$${mockMatchingId}`;
  
  return {
    qrCode: mockLpa,
    lpa: mockLpa,
    iccid: mockIccid,
    activationCode: mockActivationCode,
    matchingId: mockMatchingId,
    smdpAddress: 'test.smdp.io',
    qrCodeUrl: 'https://test.example.com/qr.png',
    directAppleInstallationUrl: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(mockLpa)}`
  };
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, airaloOrderId, isTestMode, mockSimData, apiKey, baseUrl } = body;

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
      
      // Use existing mock sim data if provided
      if (mockSimData) {
        qrData = {
          qrCode: mockSimData.qrcode || mockSimData.lpa,
          activationCode: mockSimData.activation_code,
          iccid: mockSimData.iccid,
          lpa: mockSimData.lpa,
          matchingId: mockSimData.matching_id,
          smdpAddress: 'test.smdp.io',
          qrCodeUrl: mockSimData.qrcode_url || 'https://test.example.com/qr.png',
          directAppleInstallationUrl: `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(mockSimData.lpa)}`
        };
      } else {
        // Generate new mock QR data
        qrData = generateMockQR();
      }
      
      return NextResponse.json({
        success: true,
        ...qrData,
        isTestMode: true,
        message: 'Mock QR code generated successfully'
      });
    }

    // PRODUCTION MODE - Get real QR code from Airalo
    
    if (!orderIdToUse) {
      return NextResponse.json({
        success: false,
        error: 'Airalo order ID not found. Order may still be processing.'
      }, { status: 400 });
    }

    // Get API key from parameter or environment
    const airaloApiKey = apiKey || process.env.AIRALO_API_KEY;
    if (!airaloApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Airalo API key not provided'
      }, { status: 400 });
    }

    const airaloBaseUrl = baseUrl || process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';

    // Get SIM details from Airalo API (includes QR code)
    const simResponse = await fetch(`${airaloBaseUrl}/v2/sims/${orderIdToUse}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${airaloApiKey}`,
        'Accept': 'application/json'
      }
    });

    if (!simResponse.ok) {
      const errorText = await simResponse.text();
      
      // Check if this is a retryable error
      const canRetry = simResponse.status === 400 && errorText.includes('processing');
      
      return NextResponse.json({
        success: false,
        error: `QR code retrieval failed: ${simResponse.statusText} - ${errorText}`,
        canRetry: canRetry
      }, { status: simResponse.status });
    }

    const simResult = await simResponse.json();
    const simData = simResult.data;

    // Extract QR code information from the SIM data
    const qrCode = simData.qrcode || simData.lpa;
    const lpa = simData.lpa;
    const iccid = simData.iccid;
    const matchingId = simData.matching_id;
    const activationCode = simData.activation_code;

    return NextResponse.json({
      success: true,
      qrCode: qrCode,
      qrCodeUrl: simData.qrcode_url,
      activationCode: activationCode,
      iccid: iccid,
      lpa: lpa,
      matchingId: matchingId,
      directAppleInstallationUrl: lpa ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpa)}` : null,
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
