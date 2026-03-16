import { NextResponse } from 'next/server';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';
import { getAiraloToken, getAiraloCredentials } from '@esim/shared/lib/airaloToken';

// Update eSIM brand settings
// PUT /v2/sims/{sim_iccid}/brand
export async function PUT(request) {
  const { userId, error: authError } = await verifyUserJWT(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { iccid, brand_settings_name } = body;

    if (!iccid) {
      return NextResponse.json({ success: false, error: 'ICCID is required' }, { status: 400 });
    }

    // Verify user owns this ICCID
    const { getSupabaseAdmin } = await import('@esim/shared/lib/supabaseAdmin');
    const supabaseAuth = getSupabaseAdmin();
    const { data: ownerCheck } = await supabaseAuth.from('orders').select('id').eq('user_id', userId).eq('iccid', iccid).limit(1);
    if (!ownerCheck?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { clientId, clientSecret, baseUrl } = getAiraloCredentials();
    const accessToken = await getAiraloToken(baseUrl, clientId, clientSecret);

    // Airalo expects multipart/form-data for brand update
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
        return NextResponse.json({ success: false, error: 'eSIM not found with provided ICCID' }, { status: 404 });
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  return PUT(request);
}
