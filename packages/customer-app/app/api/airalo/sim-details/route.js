import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

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
    
    // Get Airalo credentials based on mode
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
    const lpaString = simData?.qrcode || simData?.lpa || simData?.qr_code;
    const appleInstallUrl = simData?.direct_apple_installation_url || 
      (lpaString ? `https://esimsetup.apple.com/esim_qrcode_provisioning?carddata=${encodeURIComponent(lpaString)}` : null);
    
    const qrCodeData = {
      qr_code: lpaString,
      qr_code_url: simData?.qrcode_url || simData?.qr_code_url,
      direct_apple_installation_url: appleInstallUrl,
      matching_id: simData?.matching_id,
      activation_code: simData?.activation_code,
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
