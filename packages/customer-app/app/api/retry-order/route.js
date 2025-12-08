import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

/**
 * MANUAL ORDER RETRY ENDPOINT
 * 
 * Use this to manually process stuck orders that are in "processing" or "pending" status
 * 
 * Usage:
 * POST /api/retry-order
 * Body: { orderId: "order-id-here", adminKey: "your-secret-key" }
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { orderId, adminKey } = body;

    // Simple admin key check (replace with your own secret)
    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'change-me-in-production';
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    // Fetch the order
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);

    if (!orderDoc.exists()) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data();
    console.log('📋 Retrying order:', orderId, 'Current status:', orderData.status);

    // Check if order is already completed
    if (orderData.status === 'completed' && orderData.esimCreated) {
      return NextResponse.json({
        success: true,
        message: 'Order already completed',
        orderData
      });
    }

    // Get package ID
    const packageId = orderData.packageId || orderData.planId;
    if (!packageId) {
      return NextResponse.json(
        { error: 'No package ID found in order' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Airalo credentials not configured' },
        { status: 500 }
      );
    }

    console.log('🔐 Authenticating with Airalo...', airaloBaseUrl);

    // Step 1: Authenticate
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
      console.error('❌ Airalo auth failed:', errorText);
      return NextResponse.json(
        { error: `Airalo authentication failed: ${errorText}` },
        { status: 500 }
      );
    }

    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'No access token received from Airalo' },
        { status: 500 }
      );
    }

    console.log('✅ Authenticated with Airalo');

    // Step 2: Create eSIM order
    console.log('📦 Creating Airalo order for package:', packageId);
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
        description: `Retry order ${orderId} for ${orderData.customerEmail || 'customer'}`
      })
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('❌ Airalo order creation failed:', errorText);
      return NextResponse.json(
        { error: `Airalo order creation failed: ${errorText}` },
        { status: 500 }
      );
    }

    const airaloOrderResult = await orderResponse.json();
    const airaloOrder = airaloOrderResult.data;
    const airaloOrderId = airaloOrder?.id;
    const simData = airaloOrder?.sims?.[0];

    if (!airaloOrderId) {
      return NextResponse.json(
        { error: 'No order ID returned from Airalo' },
        { status: 500 }
      );
    }

    console.log('✅ Airalo order created:', airaloOrderId);

    // Step 3: Update Firebase with eSIM data
    // IMPORTANT: Save both snake_case and camelCase for complete compatibility
    const lpaString = simData?.qrcode || simData?.lpa;
    
    const esimUpdateData = {
      status: 'completed',
      airaloOrderId: airaloOrderId,
      airaloOrderData: airaloOrder,
      orderData: airaloOrder, // Also save as orderData for Dashboard.jsx
      esimCreated: true,
      esimCreatedAt: serverTimestamp(),
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      manuallyRetried: true,
      retriedAt: serverTimestamp()
    };

    // Add SIM data if available - save BOTH formats for complete compatibility
    if (simData) {
      // snake_case fields (primary storage format)
      esimUpdateData.iccid = simData.iccid || null;
      esimUpdateData.qr_code = lpaString || null;
      esimUpdateData.qr_code_url = simData.qrcode_url || null;
      esimUpdateData.direct_apple_installation_url = simData.direct_apple_installation_url || simData.qrcode_url || null;
      esimUpdateData.matching_id = simData.matching_id || null;
      esimUpdateData.activation_code = simData.activation_code || simData.matching_id || null;
      
      // camelCase fields (for backwards compatibility)
      esimUpdateData.lpa = lpaString || null;
      esimUpdateData.qrCode = lpaString || null;
      esimUpdateData.qrCodeUrl = simData.qrcode_url || null;
      esimUpdateData.directAppleInstallationUrl = simData.direct_apple_installation_url || simData.qrcode_url || null;
      esimUpdateData.matchingId = simData.matching_id || null;
      esimUpdateData.activationCode = simData.activation_code || simData.matching_id || null;
      
      esimUpdateData.simData = simData;
    }

    await updateDoc(orderRef, esimUpdateData);

    // Update user's order if exists
    // CRITICAL: Use setDoc with merge to handle case where doc doesn't exist
    if (orderData.userId) {
      try {
        const userOrderRef = doc(db, 'users', orderData.userId, 'esims', orderId);
        const userOrderDoc = await getDoc(userOrderRef);
        
        if (userOrderDoc.exists()) {
          await updateDoc(userOrderRef, esimUpdateData);
        } else {
          // Document doesn't exist - create it with full order data
          console.log('⚠️ User order doc did not exist, creating...');
          await setDoc(userOrderRef, {
            ...orderData,
            ...esimUpdateData,
            userId: orderData.userId,
            createdAt: orderData.createdAt || serverTimestamp()
          });
        }
      } catch (error) {
        console.error('Error updating user order:', error);
        // Recovery attempt with setDoc merge
        try {
          const userOrderRef = doc(db, 'users', orderData.userId, 'esims', orderId);
          await setDoc(userOrderRef, {
            ...orderData,
            ...esimUpdateData,
            userId: orderData.userId
          }, { merge: true });
          console.log('✅ User order recovered with setDoc merge');
        } catch (e) {
          console.error('Recovery failed:', e);
        }
      }
    }

    console.log('🎉 Order successfully retried:', orderId);

    return NextResponse.json({
      success: true,
      message: 'Order processed successfully',
      orderId,
      airaloOrderId,
      iccid: simData?.iccid,
      qrCode: simData?.qrcode || simData?.lpa
    });

  } catch (error) {
    console.error('❌ Retry order error:', error);
    return NextResponse.json(
      { error: `Failed to retry order: ${error.message}` },
      { status: 500 }
    );
  }
}
