import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/plans - Server-side filtered plans from Supabase
 *
 * Query Parameters:
 * - search: Text search on name
 * - country: Filter by country_id or covered_countries
 * - region: Filter by region_id
 * - category: Filter by plan_category (country|regional|global)
 * - hasVoice: Filter plans with voice
 * - hasSms: Filter plans with SMS
 * - minData: Minimum data in MB
 * - maxPrice: Maximum price in USD
 * - sortBy: Column to sort by (default: name)
 * - sortDir: Sort direction (asc|desc, default: asc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 25, max: 100)
 * - status: Filter by status (default: all)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // Validate Supabase credentials
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      }
    });

    // Parse query parameters
    const search = searchParams.get('search')?.trim() || '';
    const country = searchParams.get('country') || '';
    const region = searchParams.get('region') || '';
    const category = searchParams.get('category') || '';
    const hasVoice = searchParams.get('hasVoice') === 'true';
    const hasSms = searchParams.get('hasSms') === 'true';
    const minData = searchParams.get('minData') ? parseInt(searchParams.get('minData')) : null;
    const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')) : null;
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortDir = searchParams.get('sortDir') || 'asc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const status = searchParams.get('status') || 'all';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('dataplans')
      .select('*', { count: 'exact' });

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    if (search) {
      // Case-insensitive search on name
      query = query.ilike('name', `%${search}%`);
    }

    if (country) {
      // Filter by country_id (exact match)
      query = query.eq('country_id', country);
    }

    if (region) {
      query = query.eq('region_id', region);
    }

    if (category && category !== 'all') {
      query = query.eq('plan_category', category);
    }

    if (hasVoice) {
      query = query.eq('has_voice', true);
    }

    if (hasSms) {
      query = query.eq('has_sms', true);
    }

    if (minData !== null) {
      query = query.gte('data_amount_mb', minData);
    }

    if (maxPrice !== null) {
      query = query.lte('price', maxPrice);
    }

    // Apply sorting
    const validSortColumns = [
      'name', 'title', 'price', 'net_price', 'data_amount_mb',
      'validity_days', 'country_name', 'operator_name', 'plan_category',
      'covered_countries_count', 'voice_minutes', 'sms_count', 'synced_at',
      'id', 'type', 'country_id', 'region_id', 'is_regional', 'is_unlimited',
      'has_voice', 'has_sms', 'status', 'enabled', 'provider'
    ];

    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'name';
    const ascending = sortDir !== 'desc';

    query = query.order(safeSortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        search,
        country,
        region,
        category,
        hasVoice,
        hasSms,
        minData,
        maxPrice,
        status
      },
      sort: {
        column: safeSortBy,
        direction: sortDir
      }
    }, {
      headers: {
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=60'
      }
    });

  } catch (error) {
    console.error('Error in /api/plans:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
