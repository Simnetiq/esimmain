import { NextResponse } from 'next/server';

/**
 * ⛔ THIS ENDPOINT IS DISABLED FOR SECURITY
 * 
 * eSIM orders should ONLY be created from:
 * 1. Stripe webhook (stripe-webhook/route.js) - after payment confirmation
 * 2. Coinbase webhook (coinbase/webhook/route.js) - after payment confirmation
 * 
 * NEVER create eSIMs from:
 * - Frontend/client-side code
 * - Unverified API calls
 * 
 * This endpoint was a security vulnerability that allowed anyone to create
 * free eSIMs without payment.
 */

// Internal secret for server-to-server calls ONLY
const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET;

export async function POST(request) {
  // ============================================
  // SECURITY: Verify this is an internal server call
  // ============================================
  const authHeader = request.headers.get('x-internal-secret');
  
  if (!INTERNAL_API_SECRET || authHeader !== INTERNAL_API_SECRET) {
    console.error('🚨 BLOCKED: Unauthorized attempt to call /api/airalo/order');
    console.error('IP:', request.headers.get('x-forwarded-for') || 'unknown');
    console.error('User-Agent:', request.headers.get('user-agent') || 'unknown');
    
    return NextResponse.json({
      success: false,
      error: 'This endpoint is disabled. eSIM orders are processed automatically after payment.',
      code: 'ENDPOINT_DISABLED'
    }, { status: 403 });
  }

  // If we get here, this is a legitimate internal server call
  try {
    const body = await request.json();
    const { 
      package_id, 
      quantity = "1", 
      description, 
      to_email,
      orderId // Required for verification
    } = body;

    if (!package_id) {
      return NextResponse.json({
        success: false,
        error: 'Package ID is required'
      }, { status: 400 });
    }

    // Get Airalo API configuration
    const clientId = process.env.AIRALO_CLIENT_ID;
    const clientSecret = process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com';
    const airaloMode = process.env.AIRALO_MODE;

    // Sandbox mode - return mock data
    if (airaloMode !== 'production' && airaloMode !== 'live') {
      const mockOrderId = `TEST_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
      const mockIccid = `8901260${Math.floor(Math.random() * 10000000000000).toString().padStart(13, '0')}`;
      const mockMatchingId = `MATCH_${Math.random().toString(36).substring(2, 12).toUpperCase()}`;
      
      return NextResponse.json({
        success: true,
        orderId: mockOrderId,
        airaloOrderId: mockOrderId,
        orderData: {
          id: mockOrderId,
          package_id: package_id,
          quantity: parseInt(quantity),
          type: 'sim',
          status: 'completed',
          price: 0,
          sims: [{
            iccid: mockIccid,
            lpa: `LPA:1$test.smdp.io$${mockMatchingId}`,
            matching_id: mockMatchingId,
            qrcode: `LPA:1$test.smdp.io$${mockMatchingId}`,
            qrcode_url: 'https://test.example.com/qr.png',
            is_roaming: true,
          }],
          created_at: new Date().toISOString(),
          is_test_mode: true
        },
        isTestMode: true,
        mode: 'sandbox'
      });
    }

    if (!clientId || !clientSecret) {
      return NextResponse.json({
        success: false,
        error: 'Airalo API credentials not configured'
      }, { status: 500 });
    }

    // Authenticate with Airalo
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
      return NextResponse.json({
        success: false,
        error: `Airalo authentication failed: ${errorText}`
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

    // Create order with Airalo
    // Airalo requires multipart/form-data for order submission
    const orderFormData = new FormData();
    orderFormData.append('package_id', package_id);
    orderFormData.append('quantity', String(parseInt(quantity)));
    orderFormData.append('type', 'sim');
    orderFormData.append('description', description || `eSIM order ${orderId || ''} for ${to_email || 'customer'}`);
    const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      },
      body: orderFormData
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      let errorMessage = orderResponse.statusText;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.message || errorJson.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }
      throw new Error(`Order creation failed: ${errorMessage}`);
    }

    const orderResult = await orderResponse.json();
    const airaloOrderId = orderResult.data?.id;
    const orderData = orderResult.data || {};

    return NextResponse.json({
      success: true,
      orderId: airaloOrderId,
      airaloOrderId: airaloOrderId,
      orderData: orderData,
      isTestMode: false,
      mode: 'production'
    });

  } catch (error) {
    console.error('Internal order creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create order'
    }, { status: 500 });
  }
}

// Block all other methods
export async function GET() {
  return NextResponse.json({
    error: 'This endpoint is disabled for security reasons.',
    code: 'ENDPOINT_DISABLED'
  }, { status: 403 });
}

export async function PUT() {
  return NextResponse.json({
    error: 'This endpoint is disabled for security reasons.',
    code: 'ENDPOINT_DISABLED'
  }, { status: 403 });
}

export async function DELETE() {
  return NextResponse.json({
    error: 'This endpoint is disabled for security reasons.',
    code: 'ENDPOINT_DISABLED'
  }, { status: 403 });
}
