import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';

export async function POST(request) {
  try {
    const { userId, error: authError } = await verifyUserJWT(request);
    if (authError) return authError;

    const body = await request.json();
    const { orderId, country_code, country_region } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { error } = await supabase
      .from('orders')
      .update({
        country_code: country_code || null,
        country_region: country_region || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId)
      .eq('user_id', userId);

    if (error) {
      console.error('[orders/update-country] Supabase error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[orders/update-country] Unexpected error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
