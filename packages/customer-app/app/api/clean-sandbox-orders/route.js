import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { collection, query, where, getDocs, doc, writeBatch } from 'firebase/firestore';

/**
 * CLEAN SANDBOX/TEST ORDERS
 * 
 * Deletes all sandbox/test orders from Firebase so they don't show in production
 * 
 * Usage:
 * GET https://www.simnetiq.store/api/clean-sandbox-orders?key=YOUR_SECRET_KEY
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('key');

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY || 'change-me-in-production';
    if (adminKey !== expectedAdminKey) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🧹 Cleaning sandbox/test orders...');

    const ordersRef = collection(db, 'orders');
    
    // Find all orders that are marked as test/sandbox
    const testQuery = query(
      ordersRef,
      where('isTestMode', '==', true)
    );

    const sandboxQuery = query(
      ordersRef,
      where('mode', '==', 'sandbox')
    );

    const testOrders = await getDocs(testQuery);
    const sandboxOrders = await getDocs(sandboxQuery);

    const allTestOrders = new Map();
    
    testOrders.forEach(doc => allTestOrders.set(doc.id, doc.data()));
    sandboxOrders.forEach(doc => allTestOrders.set(doc.id, doc.data()));

    console.log(`📋 Found ${allTestOrders.size} sandbox/test orders`);

    if (allTestOrders.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sandbox orders found',
        deleted: []
      });
    }

    const deleted = [];
    const batch = writeBatch(db);
    let batchCount = 0;

    // Delete each test order
    for (const [orderId, orderData] of allTestOrders.entries()) {
      console.log('🗑️ Deleting test order:', orderId);
      
      const orderRef = doc(db, 'orders', orderId);
      batch.delete(orderRef);
      batchCount++;

      // Also delete from user's collection if exists
      if (orderData.userId) {
        try {
          const userOrderRef = doc(db, 'users', orderData.userId, 'esims', orderId);
          batch.delete(userOrderRef);
          batchCount++;
        } catch (error) {
          console.error('Error deleting user order:', error);
        }
      }

      deleted.push({
        orderId,
        planName: orderData.planName,
        amount: orderData.amount,
        mode: orderData.mode || 'unknown'
      });

      // Firestore batch limit is 500 operations
      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }

    // Commit remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }

    console.log('✅ Deleted', deleted.length, 'sandbox orders');

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.length} sandbox/test orders`,
      deleted
    });

  } catch (error) {
    console.error('❌ Clean orders error:', error);
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
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🧹 Cleaning sandbox/test orders...');

    const ordersRef = collection(db, 'orders');
    
    // Find all test/sandbox orders
    const allOrders = await getDocs(ordersRef);
    
    const testOrders = [];
    allOrders.forEach(doc => {
      const data = doc.data();
      if (data.isTestMode === true || data.mode === 'sandbox' || data.test === true) {
        testOrders.push({ id: doc.id, data });
      }
    });

    console.log(`📋 Found ${testOrders.length} sandbox/test orders`);

    if (testOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sandbox orders found',
        deleted: []
      });
    }

    const deleted = [];
    const batch = writeBatch(db);
    let batchCount = 0;

    for (const order of testOrders) {
      console.log('🗑️ Deleting test order:', order.id);
      
      const orderRef = doc(db, 'orders', order.id);
      batch.delete(orderRef);
      batchCount++;

      if (order.data.userId) {
        try {
          const userOrderRef = doc(db, 'users', order.data.userId, 'esims', order.id);
          batch.delete(userOrderRef);
          batchCount++;
        } catch (error) {
          console.error('Error deleting user order:', error);
        }
      }

      deleted.push({
        orderId: order.id,
        planName: order.data.planName,
        amount: order.data.amount,
        mode: order.data.mode || 'unknown'
      });

      if (batchCount >= 400) {
        await batch.commit();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }

    console.log('✅ Deleted', deleted.length, 'sandbox orders');

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.length} sandbox/test orders`,
      deleted
    });

  } catch (error) {
    console.error('❌ Clean orders error:', error);
    return NextResponse.json(
      { error: `Failed: ${error.message}` },
      { status: 500 }
    );
  }
}










