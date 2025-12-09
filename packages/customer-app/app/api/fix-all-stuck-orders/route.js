import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

/**
 * FIX ALL STUCK ORDERS
 * 
 * Automatically finds and processes all orders stuck in "pending" or "processing" status
 * 
 * Usage: Just visit this URL in your browser:
 * GET https://www.simnetiq.store/api/fix-all-stuck-orders?key=YOUR_SECRET_KEY
 * 
 * Or POST with JSON:
 * POST https://www.simnetiq.store/api/fix-all-stuck-orders
 * Body: { adminKey: "YOUR_SECRET_KEY" }
 */

async function processStuckOrder(orderId, orderData) {
  try {
    console.log('🔄 Processing stuck order:', orderId);

    // Get package ID
    const packageId = orderData.packageId || orderData.planId;
    if (!packageId) {
      throw new Error('No package ID found');
    }

    // Get Airalo credentials
    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    
    const clientId = isSandbox 
      ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
      : process.env.AIRALO_CLIENT_ID;
    const clientSecret = isSandbox 
      ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
      : process.env.AIRALO_CLIENT_SECRET;
    
    const airaloBaseUrl = isSandbox 
      ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
      : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
    
    if (!clientId || !clientSecret) {
      throw new Error('Airalo credentials not configured');
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
      throw new Error(`Auth failed: ${errorText}`);
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    // Create eSIM order
    const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        package_id: packageId,
        quantity: 1,
        type: 'sim',
        description: `Auto-fix order ${orderId} for ${orderData.customerEmail || 'customer'}`
      })
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Order creation failed: ${errorText}`);
    }

    const airaloOrderResult = await orderResponse.json();
    const airaloOrder = airaloOrderResult.data;
    const airaloOrderId = airaloOrder?.id;
    const simData = airaloOrder?.sims?.[0];

    if (!airaloOrderId) {
      throw new Error('No order ID returned from Airalo');
    }

    // Update Firebase
    const orderRef = doc(db, 'orders', orderId);
    const esimUpdateData = {
      status: 'completed',
      airaloOrderId: airaloOrderId,
      airaloOrderData: airaloOrder,
      esimCreated: true,
      esimCreatedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      autoFixed: true,
      fixedAt: serverTimestamp()
    };

    if (simData) {
      if (simData.iccid) esimUpdateData.iccid = simData.iccid;
      if (simData.lpa) esimUpdateData.lpa = simData.lpa;
      if (simData.matching_id) esimUpdateData.matchingId = simData.matching_id;
      if (simData.qrcode || simData.lpa) esimUpdateData.qrCode = simData.qrcode || simData.lpa;
      if (simData.qrcode_url) esimUpdateData.qrCodeUrl = simData.qrcode_url;
      if (simData.activation_code) esimUpdateData.activationCode = simData.activation_code;
      esimUpdateData.simData = simData;
    }

    await updateDoc(orderRef, esimUpdateData);

    // Update user's order if exists
    if (orderData.userId) {
      try {
        const userOrderRef = doc(db, 'users', orderData.userId, 'esims', orderId);
        await updateDoc(userOrderRef, esimUpdateData);
      } catch (error) {
        console.error('Error updating user order:', error);
      }
    }

    console.log('✅ Fixed order:', orderId);

    return {
      success: true,
      orderId,
      airaloOrderId,
      iccid: simData?.iccid,
      packageId
    };

  } catch (error) {
    console.error('❌ Failed to fix order:', orderId, error.message);
    return {
      success: false,
      orderId,
      error: error.message
    };
  }
}

export async function GET(request) {
  try {
    // Get admin key from query params
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('key');

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'change-me-in-production';
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    console.log('🔍 Searching for stuck orders...');

    // Find all stuck orders (pending or processing with paymentStatus = completed)
    const ordersRef = collection(db, 'orders');
    const stuckQuery = query(
      ordersRef,
      where('paymentStatus', '==', 'completed'),
      where('esimCreated', '!=', true)
    );

    const stuckOrders = await getDocs(stuckQuery);
    console.log(`📋 Found ${stuckOrders.size} stuck orders`);

    if (stuckOrders.empty) {
      return NextResponse.json({
        success: true,
        message: 'No stuck orders found',
        fixed: [],
        failed: []
      });
    }

    const results = {
      fixed: [],
      failed: [],
      total: stuckOrders.size
    };

    // Process each stuck order
    for (const orderDoc of stuckOrders.docs) {
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      
      // Skip if already has eSIM
      if (orderData.esimCreated || orderData.status === 'completed') {
        continue;
      }

      const result = await processStuckOrder(orderId, orderData);
      
      if (result.success) {
        results.fixed.push(result);
      } else {
        results.failed.push(result);
      }

      // Add delay between orders to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Finished processing stuck orders:', results);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.total} orders. Fixed: ${results.fixed.length}, Failed: ${results.failed.length}`,
      ...results
    });

  } catch (error) {
    console.error('❌ Fix all orders error:', error);
    return NextResponse.json(
      { error: `Failed: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { adminKey } = body;

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'change-me-in-production';
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid admin key' },
        { status: 401 }
      );
    }

    console.log('🔍 Searching for stuck orders...');

    // Find all stuck orders
    const ordersRef = collection(db, 'orders');
    const stuckQuery = query(
      ordersRef,
      where('paymentStatus', '==', 'completed'),
      where('esimCreated', '!=', true)
    );

    const stuckOrders = await getDocs(stuckQuery);
    console.log(`📋 Found ${stuckOrders.size} stuck orders`);

    if (stuckOrders.empty) {
      return NextResponse.json({
        success: true,
        message: 'No stuck orders found',
        fixed: [],
        failed: []
      });
    }

    const results = {
      fixed: [],
      failed: [],
      total: stuckOrders.size
    };

    // Process each stuck order
    for (const orderDoc of stuckOrders.docs) {
      const orderId = orderDoc.id;
      const orderData = orderDoc.data();
      
      // Skip if already has eSIM
      if (orderData.esimCreated || orderData.status === 'completed') {
        continue;
      }

      const result = await processStuckOrder(orderId, orderData);
      
      if (result.success) {
        results.fixed.push(result);
      } else {
        results.failed.push(result);
      }

      // Add delay between orders to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('✅ Finished processing stuck orders:', results);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.total} orders. Fixed: ${results.fixed.length}, Failed: ${results.failed.length}`,
      ...results
    });

  } catch (error) {
    console.error('❌ Fix all orders error:', error);
    return NextResponse.json(
      { error: `Failed: ${error.message}` },
      { status: 500 }
    );
  }
}





