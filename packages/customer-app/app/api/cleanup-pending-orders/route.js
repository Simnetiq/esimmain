import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { collection, query, where, getDocs, deleteDoc, doc, Timestamp } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * API Route: Cleanup Stale Pending Orders
 * 
 * This endpoint removes pending orders that are older than a specified threshold.
 * Use cases:
 * - Clean up abandoned checkout sessions
 * - Free up storage from users who never completed payment
 * - Admin maintenance task
 * 
 * Security: This should be protected in production (add admin auth check)
 * 
 * Query Parameters:
 * - hours: Number of hours old to consider "stale" (default: 24)
 * - dryRun: If "true", only counts orders without deleting (default: false)
 * - userId: Optional - clean only for specific user
 */
export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursOld = parseInt(searchParams.get('hours') || '24', 10);
    const dryRun = searchParams.get('dryRun') === 'true';
    const specificUserId = searchParams.get('userId');
    
    // Calculate cutoff timestamp
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const cutoffTimestamp = Timestamp.fromDate(cutoffTime);
    
    console.log(`🧹 Cleanup: Finding pending orders older than ${hoursOld} hours (before ${cutoffTime.toISOString()})`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no deletions)' : 'LIVE (will delete)'}`);
    
    const results = {
      globalOrdersFound: 0,
      globalOrdersDeleted: 0,
      userOrdersFound: 0,
      userOrdersDeleted: 0,
      errors: [],
      deletedOrderIds: [],
      skippedOrderIds: []
    };
    
    // Step 1: Find stale pending orders in global 'orders' collection
    const ordersRef = collection(db, 'orders');
    const pendingOrdersQuery = query(
      ordersRef,
      where('status', '==', 'pending'),
      where('createdAt', '<', cutoffTimestamp)
    );
    
    const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
    results.globalOrdersFound = pendingOrdersSnapshot.size;
    
    console.log(`   Found ${results.globalOrdersFound} stale pending orders in 'orders' collection`);
    
    // Process global orders
    for (const orderDoc of pendingOrdersSnapshot.docs) {
      const orderData = orderDoc.data();
      const orderId = orderDoc.id;
      
      // Skip if user filter is applied and doesn't match
      if (specificUserId && orderData.userId !== specificUserId) {
        results.skippedOrderIds.push(orderId);
        continue;
      }
      
      // Skip if payment was actually completed (safety check)
      if (orderData.paymentStatus === 'completed' || orderData.paymentStatus === 'paid') {
        console.log(`   ⚠️ Skipping ${orderId} - payment completed but status still 'pending'`);
        results.skippedOrderIds.push(orderId);
        continue;
      }
      
      // Skip if eSIM was created (safety check)
      if (orderData.esimCreated === true) {
        console.log(`   ⚠️ Skipping ${orderId} - eSIM was created`);
        results.skippedOrderIds.push(orderId);
        continue;
      }
      
      if (!dryRun) {
        try {
          await deleteDoc(doc(db, 'orders', orderId));
          results.globalOrdersDeleted++;
          results.deletedOrderIds.push(orderId);
          
          // Also delete from user's esims collection if userId exists
          if (orderData.userId) {
            try {
              await deleteDoc(doc(db, 'users', orderData.userId, 'esims', orderId));
              results.userOrdersDeleted++;
            } catch {
              // User order might not exist or already deleted
              console.log(`   Note: User order ${orderId} not found or already deleted`);
            }
          }
        } catch (deleteError) {
          console.error(`   ❌ Error deleting ${orderId}:`, deleteError);
          results.errors.push({ orderId, error: deleteError.message });
        }
      } else {
        results.deletedOrderIds.push(orderId);
        results.globalOrdersDeleted++; // Count what would be deleted
      }
    }
    
    // Step 2: If a specific user is specified, also check their esims collection
    if (specificUserId) {
      const userEsimsRef = collection(db, 'users', specificUserId, 'esims');
      const userPendingQuery = query(
        userEsimsRef,
        where('status', '==', 'pending'),
        where('createdAt', '<', cutoffTimestamp)
      );
      
      const userPendingSnapshot = await getDocs(userPendingQuery);
      results.userOrdersFound = userPendingSnapshot.size;
      
      console.log(`   Found ${results.userOrdersFound} stale pending orders in user's 'esims' collection`);
      
      for (const userOrderDoc of userPendingSnapshot.docs) {
        const orderData = userOrderDoc.data();
        const orderId = userOrderDoc.id;
        
        // Skip if payment was completed
        if (orderData.paymentStatus === 'completed' || orderData.paymentStatus === 'paid') {
          continue;
        }
        
        // Skip if eSIM was created
        if (orderData.esimCreated === true) {
          continue;
        }
        
        // Skip if already in deleted list (from global collection processing)
        if (results.deletedOrderIds.includes(orderId)) {
          continue;
        }
        
        if (!dryRun) {
          try {
            await deleteDoc(doc(db, 'users', specificUserId, 'esims', orderId));
            results.userOrdersDeleted++;
            results.deletedOrderIds.push(orderId);
          } catch (deleteError) {
            results.errors.push({ orderId, error: deleteError.message });
          }
        } else {
          results.deletedOrderIds.push(orderId);
        }
      }
    }
    
    console.log(`✅ Cleanup complete:`, results);
    
    return NextResponse.json({
      success: true,
      message: dryRun 
        ? `Dry run complete. Would delete ${results.globalOrdersDeleted} orders.`
        : `Cleanup complete. Deleted ${results.globalOrdersDeleted} stale pending orders.`,
      results,
      cutoffTime: cutoffTime.toISOString(),
      hoursOld
    });
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check stale pending orders without deleting
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursOld = parseInt(searchParams.get('hours') || '24', 10);
    const specificUserId = searchParams.get('userId');
    
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const cutoffTimestamp = Timestamp.fromDate(cutoffTime);
    
    // Count stale pending orders
    const ordersRef = collection(db, 'orders');
    const pendingOrdersQuery = query(
      ordersRef,
      where('status', '==', 'pending'),
      where('createdAt', '<', cutoffTimestamp)
    );
    
    const pendingOrdersSnapshot = await getDocs(pendingOrdersQuery);
    
    const orders = pendingOrdersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        email: data.customerEmail,
        packageId: data.packageId,
        amount: data.amount,
        status: data.status,
        paymentStatus: data.paymentStatus,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || 'unknown'
      };
    }).filter(order => !specificUserId || order.userId === specificUserId);
    
    return NextResponse.json({
      success: true,
      count: orders.length,
      hoursOld,
      cutoffTime: cutoffTime.toISOString(),
      orders: orders.slice(0, 50), // Limit to 50 for response size
      hasMore: orders.length > 50
    });
    
  } catch (error) {
    console.error('❌ Error checking pending orders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
