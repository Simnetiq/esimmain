import { NextResponse } from 'next/server';

// Get list of eSIMs
// GET /v2/sims
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const iccidFilter = searchParams.get('iccid');
    const createdAtFilter = searchParams.get('created_at');
    const includeRelated = searchParams.get('include') || 'order,order.status';
    const limit = searchParams.get('limit') || '100';
    const page = searchParams.get('page') || '1';

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

    // Build query parameters
    const queryParams = new URLSearchParams();
    queryParams.set('limit', limit);
    queryParams.set('page', page);
    
    if (includeRelated) {
      queryParams.set('include', includeRelated);
    }
    if (iccidFilter) {
      queryParams.set('filter[iccid]', iccidFilter);
    }
    if (createdAtFilter) {
      queryParams.set('filter[created_at]', createdAtFilter);
    }

    // Fetch eSIMs list
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
        return NextResponse.json({
          success: false,
          error: 'Invalid query parameters'
        }, { status: 422 });
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
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

// Also support POST for clients that prefer POST
export async function POST(request) {
  try {
    const body = await request.json();
    
    // Convert body to URL for GET handler
    const url = new URL(request.url);
    if (body.iccid) url.searchParams.set('iccid', body.iccid);
    if (body.created_at) url.searchParams.set('created_at', body.created_at);
    if (body.include) url.searchParams.set('include', body.include);
    if (body.limit) url.searchParams.set('limit', body.limit.toString());
    if (body.page) url.searchParams.set('page', body.page.toString());
    
    // Create new request with modified URL
    const newRequest = new Request(url.toString(), {
      method: 'GET',
      headers: request.headers
    });
    
    return GET(newRequest);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

