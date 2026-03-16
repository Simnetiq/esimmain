export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('country');
    const limitParam = parseInt(searchParams.get('limit')) || 50;

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('dataplans')
      .select('*')
      .eq('status', 'active')
      .neq('package_type', 'topup')
      .order('price', { ascending: true });

    if (countryCode) {
      query = query.contains('country_codes', [countryCode.toUpperCase()]);
    }

    const { data: plans, error } = await query.limit(limitParam);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      plans: plans || [],
      total: (plans || []).length,
      message: 'Plans retrieved successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
