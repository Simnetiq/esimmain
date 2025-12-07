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

    // Get Airalo credentials from Firestore
    const airaloConfigRef = doc(db, 'config', 'airalo');
    const airaloConfig = await getDoc(airaloConfigRef);
    
    if (!airaloConfig.exists()) {
      return NextResponse.json({
        success: false,
        error: 'Airalo configuration not found'
      }, { status: 400 });
    }
    
    const configData = airaloConfig.data();
    const clientId = configData.api_key;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET_PRODUCTION;
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo credentials not found'
      }, { status: 400 });
    }

    // Authenticate with Airalo API
    const baseUrl = 'https://partners-api.airalo.com';
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
      throw new Error(`Authentication failed: ${authResponse.statusText} - ${errorText}`);
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
    const qrCodeData = {
      qrCode: simData?.qr_code,
      qrCodeUrl: simData?.qr_code_url,
      activationCode: simData?.activation_code,
      iccid: simData?.iccid,
      lpa: simData?.lpa,
      directAppleInstallationUrl: simData?.direct_apple_installation_url,
      matchingId: simData?.matching_id,
      status: simData?.status,
      packageName: simData?.package?.title,
      packageDetails: simData?.package
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
