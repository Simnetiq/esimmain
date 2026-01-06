import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/plans/countries - Get countries from countries table
 *
 * Query params:
 * - hasPlans: boolean - filter to only countries with plans
 * - search: string - search by name or iso_code
 * - limit: number - max results (default 500)
 */
export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    const { searchParams } = new URL(request.url);
    const hasPlans = searchParams.get('hasPlans') === 'true';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit')) || 500;

    // Build query for countries table
    let query = supabase
      .from('countries')
      .select('id, name, iso_code, image_url, plan_count, min_price, is_active, is_popular, region_id')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(limit);

    // Filter by hasPlans if specified
    if (hasPlans) {
      query = query.gt('plan_count', 0);
    }

    // Search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,iso_code.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Transform to expected format
    const countries = (data || []).map(country => ({
      id: country.id,
      name: country.name,
      iso_code: country.iso_code,
      image_url: country.image_url,
      plan_count: country.plan_count || 0,
      min_price: country.min_price,
      is_active: country.is_active,
      is_popular: country.is_popular,
      region_id: country.region_id
    }));

    return NextResponse.json({
      success: true,
      data: countries,
      total: countries.length
    }, {
      headers: {
        'Cache-Control': 'private, max-age=60'
      }
    });

  } catch (error) {
    console.error('Error fetching countries:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
