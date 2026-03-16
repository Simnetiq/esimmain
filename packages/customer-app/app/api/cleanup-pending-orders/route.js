import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { verifyAdminKey } from '@esim/shared/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const authError = verifyAdminKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const hoursOld = parseInt(searchParams.get('hours') || '24', 10);
    const dryRun = searchParams.get('dryRun') === 'true';
    const specificUserId = searchParams.get('userId');
    
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    
    const supabase = getSupabaseAdmin();

    const results = {
      globalOrdersFound: 0,
      globalOrdersDeleted: 0,
      userOrdersFound: 0,
      userOrdersDeleted: 0,
      errors: [],
      deletedOrderIds: [],
      skippedOrderIds: []
    };
    
    // Find stale pending orders
    let query = supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime.toISOString());

    const { data: pendingOrders, error } = await query;
    if (error) throw error;

    results.globalOrdersFound = (pendingOrders || []).length;
    
    for (const order of (pendingOrders || [])) {
      if (specificUserId && order.user_id !== specificUserId) {
        results.skippedOrderIds.push(order.id);
        continue;
      }
      
      if (order.payment_status === 'completed' || order.payment_status === 'paid') {
        results.skippedOrderIds.push(order.id);
        continue;
      }
      
      if (order.esim_created === true) {
        results.skippedOrderIds.push(order.id);
        continue;
      }
      
      if (!dryRun) {
        try {
          await supabase.from('orders').delete().eq('id', order.id);
          results.globalOrdersDeleted++;
          results.deletedOrderIds.push(order.id);
          
          if (order.user_id) {
            try {
              await supabase.from('user_esims').delete().eq('id', order.id).eq('user_id', order.user_id);
              results.userOrdersDeleted++;
            } catch {
              // User order might not exist
            }
          }
        } catch (deleteError) {
          results.errors.push({ orderId: order.id, error: deleteError.message });
        }
      } else {
        results.deletedOrderIds.push(order.id);
        results.globalOrdersDeleted++;
      }
    }
    
    // User-specific esims collection
    if (specificUserId) {
      const { data: userOrders } = await supabase
        .from('user_esims')
        .select('*')
        .eq('user_id', specificUserId)
        .eq('status', 'pending')
        .lt('created_at', cutoffTime.toISOString());

      results.userOrdersFound = (userOrders || []).length;
      
      for (const order of (userOrders || [])) {
        if (order.payment_status === 'completed' || order.payment_status === 'paid') continue;
        if (order.esim_created === true) continue;
        if (results.deletedOrderIds.includes(order.id)) continue;
        
        if (!dryRun) {
          try {
            await supabase.from('user_esims').delete().eq('id', order.id).eq('user_id', specificUserId);
            results.userOrdersDeleted++;
            results.deletedOrderIds.push(order.id);
          } catch (deleteError) {
            results.errors.push({ orderId: order.id, error: deleteError.message });
          }
        } else {
          results.deletedOrderIds.push(order.id);
        }
      }
    }
    
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
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const authError = verifyAdminKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const hoursOld = parseInt(searchParams.get('hours') || '24', 10);
    const specificUserId = searchParams.get('userId');
    
    const cutoffTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    
    const supabase = getSupabaseAdmin();

    const { data: pendingOrders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'pending')
      .lt('created_at', cutoffTime.toISOString());

    if (error) throw error;

    const orders = (pendingOrders || [])
      .map(d => ({
        id: d.id,
        userId: d.user_id,
        email: d.customer_email,
        packageId: d.package_id,
        amount: d.amount,
        status: d.status,
        paymentStatus: d.payment_status,
        createdAt: d.created_at
      }))
      .filter(order => !specificUserId || order.userId === specificUserId);
    
    return NextResponse.json({
      success: true,
      count: orders.length,
      hoursOld,
      cutoffTime: cutoffTime.toISOString(),
      orders: orders.slice(0, 50),
      hasMore: orders.length > 50
    });
    
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
