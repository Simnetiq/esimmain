import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export async function POST(request) {
  try {
    const body = await request.json();
    const { iccid } = body;

    if (!iccid) {
      return NextResponse.json({
        success: false,
        error: 'ICCID is required'
      }, { status: 400 });
    }

    // Determine Airalo mode (sandbox vs production)
    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    
    // Get Airalo credentials based on mode (consistent with stripe-webhook)
    let clientId = isSandbox
      ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
      : process.env.AIRALO_CLIENT_ID;
      
    let clientSecret = isSandbox
      ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
      : process.env.AIRALO_CLIENT_SECRET;
    
    // Select correct base URL
    const baseUrl = isSandbox 
      ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
      : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
    
    // Fallback to Firestore config if env vars not set
    if (!clientId || !clientSecret) {
      const airaloConfigRef = doc(db, 'config', 'airalo');
      const airaloConfig = await getDoc(airaloConfigRef);
      
      if (airaloConfig.exists()) {
        const configData = airaloConfig.data();
        clientId = clientId || configData.client_id || configData.api_key;
        clientSecret = clientSecret || configData.client_secret;
      } else {
      }
    }
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo credentials not configured. Please set AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET environment variables.'
      }, { status: 500 });
    }

    // Authenticate with Airalo API
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
      const errorText = await authResponse.text();
      
      // Return a more user-friendly error
      return NextResponse.json({
        success: false,
        error: 'Unable to connect to eSIM provider. Please try again later.',
        statusCode: 401
      }, { status: 401 });
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;

    if (!accessToken) {
      throw new Error('No access token received from Airalo API');
    }

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
      
      // Handle specific error cases
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

    // Extract relevant data from SIM details
    const simData = simDetails.data;
    const lpaString = simData?.qrcode || simData?.lpa || simData?.qr_code;
    const appleInstallUrl = simData?.direct_apple_installation_url || 
      (lpaString ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaString)}` : null);
    
    // Return both snake_case and camelCase for complete compatibility
    const qrCodeData = {
      // snake_case fields (for consistency with EsimQrCode.jsx)
      qr_code: lpaString,
      qr_code_url: simData?.qrcode_url || simData?.qr_code_url,
      direct_apple_installation_url: appleInstallUrl,
      matching_id: simData?.matching_id,
      activation_code: simData?.activation_code,
      // camelCase fields (for backwards compatibility)
      qrCode: lpaString,
      qrCodeUrl: simData?.qrcode_url || simData?.qr_code_url,
      activationCode: simData?.activation_code,
      iccid: simData?.iccid,
      lpa: lpaString,
      directAppleInstallationUrl: appleInstallUrl,
      matchingId: simData?.matching_id,
      status: simData?.status,
      packageName: simData?.package?.title,
      packageDetails: simData?.package,
      // Country info
      country_code: simData?.package?.country_code,
      country_name: simData?.package?.country?.name || simData?.package?.country_name
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
