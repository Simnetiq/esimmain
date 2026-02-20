import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const supabase = getSupabaseAdmin();
  const { iccid } = await params;

  if (!iccid) {
    return NextResponse.json({ success: false, error: 'ICCID is required' }, { status: 400 });
  }

  // ── Auth: require authenticated user ──────────────────────────────────────
  let userId = null;
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error: jwtError } = await supabase.auth.getUser(token);
    if (!jwtError && user) userId = user.id;
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // ── Verify ICCID ownership ────────────────────────────────────────────────
  const { data: ownerOrder, error: ownerError } = await supabase
    .from('orders')
    .select('id, plan_id, iccid, status')
    .eq('iccid', iccid)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (ownerError || !ownerOrder) {
    return NextResponse.json({ success: false, error: 'eSIM not found or not owned by user' }, { status: 404 });
  }

  // ── Look up the original plan to find operator_id + country_iso ───────────
  const { data: originalPlan } = await supabase
    .from('dataplans')
    .select('operator_id, country_iso')
    .eq('id', ownerOrder.plan_id)
    .maybeSingle();

  if (!originalPlan?.operator_id) {
    return NextResponse.json({ success: false, error: 'Could not determine eSIM operator' }, { status: 404 });
  }

  // ── Query available top-up packages ───────────────────────────────────────
  const { data: topupPlans, error: topupError } = await supabase
    .from('dataplans')
    .select('id, name, title, data_amount_mb, data_display, is_unlimited, validity_days, price, net_price, currency, operator_name, operator_image_url')
    .eq('package_type', 'topup')
    .eq('operator_id', originalPlan.operator_id)
    .eq('country_iso', originalPlan.country_iso)
    .eq('is_enabled', true)
    .eq('status', 'active')
    .order('price', { ascending: true });

  if (topupError) {
    console.error('[topups] Error fetching topup plans:', topupError);
    return NextResponse.json({ success: false, error: 'Failed to fetch top-up packages' }, { status: 500 });
  }

  // ── Normalize response ────────────────────────────────────────────────────
  const packages = (topupPlans || []).map(plan => ({
    id: plan.id,
    name: plan.name,
    title: plan.title,
    dataAmountMb: plan.data_amount_mb,
    dataDisplay: plan.data_display || formatDataDisplay(plan.data_amount_mb, plan.is_unlimited),
    isUnlimited: plan.is_unlimited,
    validityDays: plan.validity_days,
    price: parseFloat(plan.price),
    currency: plan.currency || 'USD',
    operatorName: plan.operator_name,
    operatorImageUrl: plan.operator_image_url,
  }));

  return NextResponse.json({
    success: true,
    data: packages,
    iccid,
    originalOrderId: ownerOrder.id,
    count: packages.length,
  });
}

function formatDataDisplay(mb, isUnlimited) {
  if (isUnlimited) return 'Unlimited';
  if (!mb) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}
