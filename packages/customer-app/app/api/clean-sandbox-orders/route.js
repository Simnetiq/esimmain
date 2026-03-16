import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const adminKey = searchParams.get('key');

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY;
    if (!expectedAdminKey) {
      return NextResponse.json({ error: 'Server misconfiguration: ADMIN_SECRET_KEY not set' }, { status: 503 });
    }
    const a1 = Buffer.from(adminKey || '');
    const b1 = Buffer.from(expectedAdminKey);
    if (a1.length !== b1.length || !timingSafeEqual(a1, b1)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    // Find test/sandbox orders
    const { data: testOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('is_test_mode', true);

    const { data: sandboxOrders } = await supabase
      .from('orders')
      .select('*')
      .eq('mode', 'sandbox');

    const allTestOrders = new Map();
    (testOrders || []).forEach(o => allTestOrders.set(o.id, o));
    (sandboxOrders || []).forEach(o => allTestOrders.set(o.id, o));

    if (allTestOrders.size === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sandbox orders found',
        deleted: []
      });
    }

    const deleted = [];

    for (const [orderId, orderData] of allTestOrders.entries()) {
      await supabase.from('orders').delete().eq('id', orderId);

      if (orderData.user_id) {
        await supabase.from('user_esims').delete().eq('id', orderId).eq('user_id', orderData.user_id);
      }

      deleted.push({
        orderId,
        planName: orderData.plan_name,
        amount: orderData.amount,
        mode: orderData.mode || 'unknown'
      });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.length} sandbox/test orders`,
      deleted
    });

  } catch (error) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { adminKey } = body;

    const expectedAdminKey = process.env.ADMIN_SECRET_KEY;
    if (!expectedAdminKey) {
      return NextResponse.json({ error: 'Server misconfiguration: ADMIN_SECRET_KEY not set' }, { status: 503 });
    }
    const a2 = Buffer.from(adminKey || '');
    const b2 = Buffer.from(expectedAdminKey);
    if (a2.length !== b2.length || !timingSafeEqual(a2, b2)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabaseAdmin();

    const { data: allOrders } = await supabase
      .from('orders')
      .select('*');

    const testOrders = (allOrders || []).filter(d =>
      d.is_test_mode === true || d.mode === 'sandbox' || d.test === true
    );

    if (testOrders.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No sandbox orders found',
        deleted: []
      });
    }

    const deleted = [];

    for (const order of testOrders) {
      await supabase.from('orders').delete().eq('id', order.id);

      if (order.user_id) {
        await supabase.from('user_esims').delete().eq('id', order.id).eq('user_id', order.user_id);
      }

      deleted.push({
        orderId: order.id,
        planName: order.plan_name,
        amount: order.amount,
        mode: order.mode || 'unknown'
      });
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleted.length} sandbox/test orders`,
      deleted
    });

  } catch (error) {
    return NextResponse.json({ error: `Failed: ${error.message}` }, { status: 500 });
  }
}
