export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = parseInt(searchParams.get('limit')) || 100;

    const supabase = getSupabaseAdmin();

    const { data: countries, error } = await supabase
      .from('countries')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true })
      .limit(limitParam);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      countries: countries || [],
      total: (countries || []).length,
      message: 'Countries retrieved successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
