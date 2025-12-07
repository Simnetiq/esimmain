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

    // Get Airalo credentials - try environment variables first, then Firestore
    let clientId = process.env.AIRALO_CLIENT_ID;
    let clientSecret = process.env.AIRALO_CLIENT_SECRET || process.env.AIRALO_CLIENT_SECRET_PRODUCTION;
    
    // Fallback to Firestore config if env vars not set
    if (!clientId || !clientSecret) {
      const airaloConfigRef = doc(db, 'config', 'airalo');
      const airaloConfig = await getDoc(airaloConfigRef);
      
      if (airaloConfig.exists()) {
        const configData = airaloConfig.data();
        clientId = clientId || configData.api_key || configData.client_id;
        clientSecret = clientSecret || configData.client_secret;
      }
    }
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo credentials not found. Please configure AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET.'
      }, { status: 400 });
    }

    // Authenticate with Airalo API
    const baseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';
    
    console.log('[Airalo Usage] Authenticating with Airalo API...');
    
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
      console.error('[Airalo Usage] Auth failed:', errorText);
      throw new Error(`Authentication failed: ${authResponse.statusText} - ${errorText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;

    if (!accessToken) {
      throw new Error('No access token received from Airalo API');
    }

    console.log('[Airalo Usage] Auth successful, fetching usage for ICCID:', iccid);

    // Get eSIM usage data using ICCID
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
      
      // Handle specific error cases
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
        // Some packages don't support usage tracking (is_prepaid = true)
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
    
    console.log('[Airalo Usage] Raw API response:', JSON.stringify(usageData, null, 2));

    // Extract usage data - handle both nested and flat response structures
    const rawData = usageData.data || usageData;
    
    // Normalize the response to ensure consistent field names
    // Airalo API may return data in different formats
    const normalizedData = {
      // Data usage (in MB)
      remaining: rawData.remaining ?? rawData.data_remaining ?? rawData.remaining_data ?? 0,
      total: rawData.total ?? rawData.data_total ?? rawData.total_data ?? 0,
      
      // Voice usage (in minutes) - may not be available for all packages
      remaining_voice: rawData.remaining_voice ?? rawData.voice_remaining ?? 0,
      total_voice: rawData.total_voice ?? rawData.voice_total ?? 0,
      
      // Text/SMS usage - may not be available for all packages
      remaining_text: rawData.remaining_text ?? rawData.text_remaining ?? rawData.remaining_sms ?? 0,
      total_text: rawData.total_text ?? rawData.text_total ?? rawData.total_sms ?? 0,
      
      // Status and expiration
      status: rawData.status || 'UNKNOWN',
      expired_at: rawData.expired_at || rawData.expiry_date || rawData.expires_at || null,
      
      // Additional fields
      is_unlimited: rawData.is_unlimited || rawData.unlimited || false,
      activated_at: rawData.activated_at || null,
      
      // Keep the raw data for debugging
      _raw: rawData
    };

    console.log('[Airalo Usage] Normalized data:', JSON.stringify(normalizedData, null, 2));

    return NextResponse.json({
      success: true,
      data: normalizedData,
      meta: usageData.meta,
      message: 'Usage data retrieved successfully'
    });

  } catch (error) {
    console.error('[Airalo Usage] Error:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
