import { NextResponse } from 'next/server';
import { verifyAdminKey } from '@esim/shared/lib/apiAuth';
import { getAiraloToken, getAiraloCredentials } from '@esim/shared/lib/airaloToken';

// Get list of eSIMs
// GET /v2/sims
export async function GET(request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);

    const iccidFilter = searchParams.get('iccid');
    const createdAtFilter = searchParams.get('created_at');
    const includeRelated = searchParams.get('include') || 'order,order.status';
    const limit = searchParams.get('limit') || '100';
    const page = searchParams.get('page') || '1';

    const { clientId, clientSecret, baseUrl } = getAiraloCredentials();
    const accessToken = await getAiraloToken(baseUrl, clientId, clientSecret);

    const queryParams = new URLSearchParams();
    queryParams.set('limit', limit);
    queryParams.set('page', page);
    if (includeRelated) queryParams.set('include', includeRelated);
    if (iccidFilter) queryParams.set('filter[iccid]', iccidFilter);
    if (createdAtFilter) queryParams.set('filter[created_at]', createdAtFilter);

    const simsResponse = await fetch(`${baseUrl}/v2/sims?${queryParams.toString()}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!simsResponse.ok) {
      const errorText = await simsResponse.text();

      if (simsResponse.status === 422) {
        return NextResponse.json({ success: false, error: 'Invalid query parameters' }, { status: 422 });
      }

      return NextResponse.json({
        success: false,
        error: `Failed to fetch eSIMs: ${simsResponse.statusText} - ${errorText}`
      }, { status: simsResponse.status });
    }

    const simsData = await simsResponse.json();

    return NextResponse.json({
      success: true,
      data: simsData.data || [],
      links: simsData.links,
      meta: simsData.meta,
      message: 'eSIMs list retrieved successfully'
    });

  } catch (error) {
    console.error('[Airalo SIM List] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const authError = verifyAdminKey(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const url = new URL(request.url);
    if (body.iccid) url.searchParams.set('iccid', body.iccid);
    if (body.created_at) url.searchParams.set('created_at', body.created_at);
    if (body.include) url.searchParams.set('include', body.include);
    if (body.limit) url.searchParams.set('limit', body.limit.toString());
    if (body.page) url.searchParams.set('page', body.page.toString());

    const newRequest = new Request(url.toString(), {
      method: 'GET',
      headers: request.headers
    });

    return GET(newRequest);
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
