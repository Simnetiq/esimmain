import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/regions/tariffs - Get tariffs for a specific region
 *
 * Query Parameters:
 * - regionId: Region ID to fetch tariffs for (required)
 * - sortBy: Column to sort by (default: price)
 * - sortDir: Sort direction (asc|desc, default: asc)
 * - limit: Max number of tariffs to return (default: all)
 * - status: Filter by status (default: active)
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
    const regionId = searchParams.get('regionId');
    const sortBy = searchParams.get('sortBy') || 'price';
    const sortDir = searchParams.get('sortDir') || 'asc';
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : null;
    const status = searchParams.get('status') || 'active';

    if (!regionId) {
      return NextResponse.json({
        success: false,
        error: 'Region ID is required'
      }, { status: 400 });
    }

    // Build query - use correct column names from schema
    // Join with regional_plans to get is_featured and priority_rank
    // IMPORTANT: Only fetch regional tariffs (is_regional = true), not country-specific plans
    let query = supabase
      .from('dataplans')
      .select(`
        id,
        name,
        title,
        plan_type,
        country_id,
        country_name,
        country_iso,
        region_id,
        is_regional,
        covered_countries_count,
        data_display,
        data_amount_mb,
        is_unlimited,
        validity_days,
        has_voice,
        voice_minutes,
        has_sms,
        sms_count,
        price,
        net_price,
        currency,
        operator_name,
        operator_image_url,
        status,
        is_enabled,
        synced_at,
        regional_plans (
          is_featured,
          priority_rank,
          is_discover_plus,
          coverage_type
        )
      `, { count: 'exact' })
      .eq('region_id', regionId)
      .eq('is_regional', true);

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Apply sorting
    const validSortColumns = [
      'name', 'price', 'data_amount_mb', 'validity_days',
      'covered_countries_count', 'synced_at'
    ];
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'price';
    const ascending = sortDir !== 'desc';

    query = query.order(safeSortBy, { ascending });

    // Apply limit if specified
    if (limit) {
      query = query.limit(limit);
    }

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Flatten regional_plans data into the tariff object
    const flattenedData = (data || []).map(tariff => {
      const regionalPlan = tariff.regional_plans;
      return {
        ...tariff,
        is_featured: regionalPlan?.is_featured || false,
        priority_rank: regionalPlan?.priority_rank || 0,
        is_discover_plus: regionalPlan?.is_discover_plus || false,
        coverage_type: regionalPlan?.coverage_type || null,
        regional_plans: undefined // Remove nested object
      };
    });

    // Sort: featured first, then by priority_rank, then by price
    flattenedData.sort((a, b) => {
      // Featured plans first
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      // Then by priority_rank (higher = more important)
      if (a.priority_rank !== b.priority_rank) return b.priority_rank - a.priority_rank;
      // Then by price
      return (a.price || 0) - (b.price || 0);
    });

    return NextResponse.json({
      success: true,
      data: flattenedData,
      count: count || 0,
      regionId,
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
    console.error('Error in /api/regions/tariffs:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
