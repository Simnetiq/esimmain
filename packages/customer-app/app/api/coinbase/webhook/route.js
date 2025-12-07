import { NextResponse } from 'next/server';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import { formatPriceNumber } from '@esim/shared/utils/priceUtils';

const COINBASE_WEBHOOK_SECRET = process.env.COINBASE_COMMERCE_WEBHOOK_SECRET;

/**
 * Coinbase Commerce Webhook Handler
 * Handles payment status updates from Coinbase
 */
export async function POST(request) {
  try {
    const signature = request.headers.get('x-cc-webhook-signature');
    const rawBody = await request.text();
    

    // Verify webhook signature
    if (COINBASE_WEBHOOK_SECRET && signature) {
      const crypto = await import('crypto');
      const { createHmac } = crypto;
      
      const computedSignature = createHmac('sha256', COINBASE_WEBHOOK_SECRET)
        .update(rawBody)
        .digest('hex');

      if (computedSignature !== signature) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }

    const event = JSON.parse(rawBody);
    const { type, data } = event.event;

    // Extract order info from metadata
    const metadata = data.metadata || {};
    const orderId = metadata.orderId;
    const userId = metadata.userId;
    const planId = metadata.planId;
    const customerEmail = metadata.customerEmail;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Missing orderId' },
        { status: 400 }
      );
    }

    // Handle different event types
    let orderStatus = 'pending';
    let shouldProcessOrder = false;

    switch (type) {
      case 'charge:created':
        orderStatus = 'pending';
        break;

      case 'charge:confirmed':
        orderStatus = 'confirmed';
        shouldProcessOrder = true;
        break;

      case 'charge:failed':
        orderStatus = 'failed';
        break;

      case 'charge:delayed':
        orderStatus = 'delayed';
        break;

      case 'charge:pending':
        orderStatus = 'pending';
        break;

      case 'charge:resolved':
        orderStatus = 'completed';
        shouldProcessOrder = true;
        break;

      default:
    }

    // Update order in Firebase
    try {
      const orderRef = doc(db, 'orders', orderId);
      const orderDoc = await getDoc(orderRef);

      if (!orderDoc.exists()) {
        // Create order if it doesn't exist (webhook arrived before order creation)
        await updateDoc(orderRef, {
          orderId,
          userId,
          planId,
          customerEmail,
          paymentProvider: 'coinbase',
          chargeId: data.id,
          chargeCode: data.code,
          status: orderStatus,
          paymentData: data,
          updatedAt: serverTimestamp(),
          webhookReceivedAt: serverTimestamp()
        });
      } else {
        // Update existing order
        await updateDoc(orderRef, {
          status: orderStatus,
          paymentData: data,
          updatedAt: serverTimestamp(),
          webhookReceivedAt: serverTimestamp()
        });
      }

    } catch {
      return NextResponse.json({
        error: 'Database error'
      });
    }

    // If payment is confirmed, create eSIM order
    // SECURITY: This is the ONLY place eSIMs should be created for Coinbase payments
    if (shouldProcessOrder) {
      
      try {
        // Get order details from Firebase
        const orderRef = doc(db, 'orders', orderId);
        const orderDoc = await getDoc(orderRef);
        
        if (!orderDoc.exists()) {
          return NextResponse.json({
            error: 'Order not found'
          }, { status: 404 });
        }
        
        const orderData = orderDoc.data();
        
        // ========================================
        // SECURITY: Prevent duplicate eSIM creation
        // ========================================
        if (orderData.esimCreated || orderData.status === 'completed' || orderData.processed) {
          console.log('eSIM already created for Coinbase order:', orderId);
          return NextResponse.json({ success: true, message: 'Already processed' });
        }
        
        // ========================================
        // SECURITY: Verify payment amount matches order
        // ========================================
        const paidAmount = parseFloat(data.pricing?.local?.amount || 0);
        const expectedAmount = orderData.amount;
        
        if (paidAmount > 0 && Math.abs(paidAmount - expectedAmount) > 0.01) {
          console.error('🚨 COINBASE PAYMENT AMOUNT MISMATCH!', {
            orderId,
            paidAmount,
            expectedAmount
          });
          
          // Log fraud attempt
          try {
            const { addDoc, collection } = await import('firebase/firestore');
            await addDoc(collection(db, 'fraud_attempts'), {
              type: 'coinbase_payment_mismatch',
              orderId,
              paidAmount,
              expectedAmount,
              chargeId: data.id,
              customerEmail: orderData.customerEmail,
              timestamp: serverTimestamp()
            });
          } catch (e) {
            console.error('Failed to log fraud attempt:', e);
          }
          
          if (paidAmount < expectedAmount - 0.01) {
            await updateDoc(orderRef, {
              status: 'payment_mismatch',
              paymentStatus: 'failed',
              errorMessage: `Payment amount mismatch`,
              updatedAt: serverTimestamp()
            });
            return NextResponse.json({ error: 'Payment amount mismatch' }, { status: 400 });
          }
        }
        
        // Create eSIM via Airalo Partners API
        // Get Airalo credentials based on mode (sandbox or production)
        const airaloMode = process.env.AIRALO_MODE || 'production';
        const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
        
        // Use sandbox or production credentials
        const clientId = isSandbox 
          ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
          : process.env.AIRALO_CLIENT_ID;
        const clientSecret = isSandbox 
          ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
          : process.env.AIRALO_CLIENT_SECRET;
        
        // Airalo sandbox URL: https://sandbox-partners-api.airalo.com
        // Airalo production URL: https://partners-api.airalo.com
        const airaloBaseUrl = isSandbox 
          ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
          : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');
        
        console.log(`🌐 Airalo Mode: ${airaloMode}, URL: ${airaloBaseUrl}`);
        
        if (!clientId || !clientSecret) {
          console.error('Airalo credentials not configured');
          return NextResponse.json({
            error: 'eSIM service not configured'
          }, { status: 503 });
        }
        
        // Step 1: Authenticate with Airalo OAuth2
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
          throw new Error(`Airalo authentication failed: ${errorText}`);
        }

        const authData = await authResponse.json();
        const accessToken = authData.data?.access_token;

        if (!accessToken) {
          throw new Error('No access token received from Airalo');
        }
        
        // Step 2: Create eSIM order
        const orderPayload = {
          package_id: orderData.planId || orderData.packageId,
          quantity: 1,
          type: 'sim',
          description: `eSIM order ${orderId} for ${customerEmail}`
        };
        
        const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(orderPayload)
        });
        
        if (!orderResponse.ok) {
          const errorText = await orderResponse.text();
          throw new Error(`Order creation failed: ${errorText}`);
        }
        
        const orderResult = await orderResponse.json();
        
        if (!orderResult.data) {
          throw new Error(orderResult.message || 'Unknown error from Airalo API');
        }
        
        
        // Update Firebase with eSIM data
        await updateDoc(orderRef, {
          status: 'completed',
          paymentStatus: 'paid',
          airaloOrderId: orderResult.data.id,
          orderData: orderResult.data,
          isTestMode: false,
          processed: true,
          processedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Also update user's collection if userId exists
        if (userId) {
          const userOrderRef = doc(db, 'users', userId, 'esims', orderId);
          await updateDoc(userOrderRef, {
            status: 'completed',
            paymentStatus: 'paid',
            airaloOrderId: orderResult.data.id,
            orderData: orderResult.data,
            isTestMode: false,
            processed: true,
            processedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
        
        
        // Send purchase confirmation email
        try {
          const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
          const userLanguage = orderData.language || 'en';
          const qrCodeUrl = `${baseUrl}/dashboard?order=${orderId}`;
          
          
          const emailResponse = await fetch(`${baseUrl}/api/send-purchase-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: customerEmail,
              name: orderData.customerName || orderData.planName || 'Customer',
              orderNumber: orderId,
              planName: orderData.planName || 'eSIM Plan',
              amount: formatPriceNumber(orderData.amount || 0),
              currency: (orderData.currency || 'USD').toUpperCase(),
              qrCodeUrl: qrCodeUrl,
              language: userLanguage
            })
          });
          
          if (emailResponse.ok) {
          } else {
            const emailError = await emailResponse.json();
          }
        } catch (emailError) {
          // Don't fail the webhook if email fails
        }
        
      } catch (error) {
        
        // Update order with error status
        try {
          const orderRef = doc(db, 'orders', orderId);
          await updateDoc(orderRef, {
            processingError: error.message,
            processingErrorAt: serverTimestamp()
          });
        } catch (updateError) {
        }
        
        return NextResponse.json({
          error: 'Failed to process order',
          details: error.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      orderId,
      status: orderStatus
    });

  } catch {
    return NextResponse.json({
      error: 'Internal server error'
    });
  }
}

