import { NextResponse } from 'next/server';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';

// Update eSIM brand settings
// PUT /v2/sims/{sim_iccid}/brand
export async function PUT(request) {
  const { userId, error: authError } = await verifyUserJWT(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { iccid, brand_settings_name } = body;

    if (!iccid) {
      return NextResponse.json({
        success: false,
        error: 'ICCID is required'
      }, { status: 400 });
    }

    // Verify user owns this ICCID
    const { getSupabaseAdmin } = await import('@esim/shared/lib/supabaseAdmin');
    const supabaseAuth = getSupabaseAdmin();
    const { data: ownerCheck } = await supabaseAuth.from('orders').select('id').eq('user_id', userId).eq('iccid', iccid).limit(1);
    if (!ownerCheck?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get Airalo credentials
    const clientId = process.env.AIRALO_CLIENT_ID;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET;
    const baseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';
    
    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo credentials not configured'
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
      throw new Error(`Authentication failed: ${errorText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;

    if (!accessToken) {
      throw new Error('No access token received from Airalo API');
    }

    // Update eSIM brand using FormData (multipart/form-data)
    const formData = new FormData();
    if (brand_settings_name !== null && brand_settings_name !== undefined) {
      formData.append('brand_settings_name', brand_settings_name);
    }

    const brandResponse = await fetch(`${baseUrl}/v2/sims/${iccid}/brand`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    if (!brandResponse.ok) {
      const errorText = await brandResponse.text();
      
      if (brandResponse.status === 404) {
        return NextResponse.json({
          success: false,
          error: 'eSIM not found with provided ICCID'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: false,
        error: `Failed to update brand: ${brandResponse.statusText} - ${errorText}`
      }, { status: brandResponse.status });
    }

    const brandData = await brandResponse.json();

    return NextResponse.json({
      success: true,
      data: brandData.data,
      message: 'eSIM brand updated successfully'
    });

  } catch (error) {
    console.error('[Airalo Brand] Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Also support POST for easier client integration
export async function POST(request) {
  // PUT already handles auth, just delegate
  return PUT(request);
}

