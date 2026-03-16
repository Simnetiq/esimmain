import { NextResponse } from 'next/server';
import { verifyUserJWT } from '@esim/shared/lib/apiAuth';
import { getAiraloToken, getAiraloCredentials } from '@esim/shared/lib/airaloToken';

// Get eSIM package history (including top-ups)
// GET /v2/sims/{iccid}/packages
// Rate limit: 1 request per 15 minutes per ICCID
export async function GET(request) {
  const { userId, error: authError } = await verifyUserJWT(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const iccid = searchParams.get('iccid');

    if (!iccid) {
      return NextResponse.json({ success: false, error: 'ICCID is required' }, { status: 400 });
    }

    const { getSupabaseAdmin } = await import('@esim/shared/lib/supabaseAdmin');
    const supabaseAuth = getSupabaseAdmin();
    const { data: ownerCheck } = await supabaseAuth.from('orders').select('id').eq('user_id', userId).eq('iccid', iccid).limit(1);
    if (!ownerCheck?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return fetchPackageHistory(iccid);
  } catch (error) {
    console.error('[Airalo Package History] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const { userId, error: authError } = await verifyUserJWT(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { iccid } = body;

    if (!iccid) {
      return NextResponse.json({ success: false, error: 'ICCID is required' }, { status: 400 });
    }

    const { getSupabaseAdmin } = await import('@esim/shared/lib/supabaseAdmin');
    const supabaseAuth = getSupabaseAdmin();
    const { data: ownerCheck } = await supabaseAuth.from('orders').select('id').eq('user_id', userId).eq('iccid', iccid).limit(1);
    if (!ownerCheck?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return fetchPackageHistory(iccid);
  } catch (error) {
    console.error('[Airalo Package History] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

async function fetchPackageHistory(iccid) {
  const { clientId, clientSecret, baseUrl } = getAiraloCredentials();
  const accessToken = await getAiraloToken(baseUrl, clientId, clientSecret);

  const packagesResponse = await fetch(`${baseUrl}/v2/sims/${iccid}/packages`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!packagesResponse.ok) {
    const errorText = await packagesResponse.text();

    if (packagesResponse.status === 404) {
      return NextResponse.json({ success: false, error: 'eSIM not found with provided ICCID' }, { status: 404 });
    }

    if (packagesResponse.status === 429) {
      const retryAfter = packagesResponse.headers.get('Retry-After');
      return NextResponse.json({
        success: false,
        error: 'Rate limit exceeded. Please wait before checking again.',
        retryAfter: retryAfter ? parseInt(retryAfter) : 900
      }, { status: 429 });
    }

    return NextResponse.json({
      success: false,
      error: `Failed to fetch package history: ${packagesResponse.statusText} - ${errorText}`
    }, { status: packagesResponse.status });
  }

  const packagesData = await packagesResponse.json();
  const packages = packagesData.data || [];

  const normalizedPackages = packages.map(pkg => ({
    id: pkg.id,
    status: pkg.status,
    remaining: pkg.remaining,
    activated_at: pkg.activated_at,
    expired_at: pkg.expired_at,
    finished_at: pkg.finished_at,
    package: pkg.package ? {
      id: pkg.package.id,
      slug: pkg.package.slug,
      title: pkg.package.title,
      data: pkg.package.data,
      day: pkg.package.day,
      validity: pkg.package.validity,
      amount: pkg.package.amount,
      price: pkg.package.price,
      is_unlimited: pkg.package.is_unlimited,
      type: pkg.package.type
    } : null
  }));

  const activePackages = normalizedPackages.filter(p => p.status === 'ACTIVE' || p.status === 'active');
  const totalRemaining = activePackages.reduce((sum, p) => sum + (p.remaining || 0), 0);

  return NextResponse.json({
    success: true,
    data: normalizedPackages,
    summary: {
      total_packages: normalizedPackages.length,
      active_packages: activePackages.length,
      total_remaining_mb: totalRemaining,
      total_remaining_formatted: totalRemaining >= 1024
        ? `${(totalRemaining / 1024).toFixed(2)} GB`
        : `${totalRemaining} MB`
    },
    message: 'Package history retrieved successfully'
  });
}
