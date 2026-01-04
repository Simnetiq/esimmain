import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/regions - Server-side filtered regions from Supabase
 *
 * Query Parameters:
 * - search: Text search on name/display_name
 * - type: Filter by type (global|continent|region|special)
 * - isActive: Filter by active status
 * - sortBy: Column to sort by (default: display_order)
 * - sortDir: Sort direction (asc|desc, default: asc)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 25, max: 100)
 * - includeStats: Include country and tariff statistics (default: false)
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
    const type = searchParams.get('type') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'display_order';
    const sortDir = searchParams.get('sortDir') || 'asc';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));
    const includeStats = searchParams.get('includeStats') === 'true';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase
      .from('regions')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,display_name.ilike.%${search}%`);
    }

    if (type) {
      query = query.eq('type', type);
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      query = query.eq('is_active', isActive === 'true');
    }

    // Apply sorting
    const validSortColumns = [
      'name', 'display_name', 'type', 'display_order',
      'country_count', 'plan_count', 'min_price', 'created_at', 'updated_at'
    ];

    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'display_order';
    const ascending = sortDir !== 'desc';

    query = query.order(safeSortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query
    const { data: regions, error, count } = await query;

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Fetch translations for all regions from region_translations table
    let translationsMap = {};
    if (regions && regions.length > 0) {
      const regionIds = regions.map(r => r.id);
      const { data: translationsData } = await supabase
        .from('region_translations')
        .select('region_id, language_code, name, display_name, source')
        .in('region_id', regionIds);

      // Group translations by region_id
      translationsData?.forEach(t => {
        if (!translationsMap[t.region_id]) {
          translationsMap[t.region_id] = {};
        }
        translationsMap[t.region_id][t.language_code] = {
          name: t.name,
          display_name: t.display_name,
          source: t.source
        };
      });
    }

    // If stats requested, fetch additional data
    let regionsWithStats = [];
    if (includeStats && regions && regions.length > 0) {
      // Get all region IDs for the query
      const regionIds = regions.map(r => r.id);

      // Fetch countries that have region_id set to one of our regions
      const { data: countriesData } = await supabase
        .from('countries')
        .select('id, name, iso_code, slug, image_url, plan_count, is_popular, region_id')
        .eq('is_active', true)
        .order('is_popular', { ascending: false })
        .order('name', { ascending: true });

      // Fetch ALL active plans that have region_id set
      const { data: allPlans } = await supabase
        .from('dataplans')
        .select('id, name, data_display, validity_days, price, has_voice, has_sms, region_id, is_regional, plan_type, covered_countries, country_id, data_amount_mb, is_unlimited')
        .eq('status', 'active');

      // Create a map for quick country lookup by id/slug/iso_code
      const countryMap = new Map();
      countriesData?.forEach(c => {
        countryMap.set(c.id, c);
        if (c.slug) countryMap.set(c.slug, c);
        if (c.iso_code) {
          countryMap.set(c.iso_code, c);
          countryMap.set(c.iso_code.toLowerCase(), c);
        }
      });

      // Build region data
      regionsWithStats = regions.map((region) => {
        // Get countries directly assigned to this region via region_id
        const directCountries = countriesData?.filter(c => c.region_id === region.id) || [];

        // Find plans for this region:
        // 1. Direct region_id match
        // 2. For global regions, include plan_type='global'
        const matchingPlans = allPlans?.filter(plan => {
          // Direct region_id match
          if (plan.region_id === region.id) return true;

          // For global type region, match global plan_type
          if (region.type === 'global' && plan.plan_type === 'global') return true;

          return false;
        }) || [];

        // Extract countries from covered_countries of matching plans
        const coveredCountryIds = new Set();
        matchingPlans.forEach(plan => {
          if (Array.isArray(plan.covered_countries)) {
            plan.covered_countries.forEach((code) => {
              if (code && typeof code === 'string') {
                coveredCountryIds.add(code);
              }
            });
          }
          if (plan.country_id) {
            coveredCountryIds.add(plan.country_id);
          }
        });

        // Convert covered country codes to country objects
        const coveredCountries = [];
        coveredCountryIds.forEach(code => {
          const country = countryMap.get(code) || countryMap.get(code.toLowerCase());
          if (country && !coveredCountries.find(c => c.id === country.id)) {
            coveredCountries.push(country);
          }
        });

        // Combine direct + covered countries, removing duplicates
        const allRegionCountriesMap = new Map();
        directCountries.forEach(c => allRegionCountriesMap.set(c.id, c));
        coveredCountries.forEach(c => {
          if (!allRegionCountriesMap.has(c.id)) {
            allRegionCountriesMap.set(c.id, c);
          }
        });

        const allRegionCountries = Array.from(allRegionCountriesMap.values());

        // Sort: popular first, then alphabetically
        allRegionCountries.sort((a, b) => {
          if (a.is_popular && !b.is_popular) return -1;
          if (!a.is_popular && b.is_popular) return 1;
          return (a.name || '').localeCompare(b.name || '');
        });

        // Get top 4 tariffs for this region (sorted by price)
        // Only include regional tariffs (is_regional = true)
        const regionTariffs = matchingPlans
          .filter(p => p.price > 0 && p.is_regional === true)
          .sort((a, b) => (a.price || 0) - (b.price || 0))
          .slice(0, 4)
          .map(t => ({
            id: t.id,
            name: t.name,
            data_amount_mb: t.data_amount_mb || 0,
            is_unlimited: t.is_unlimited || false,
            validity_days: t.validity_days,
            price: t.price,
            has_voice: t.has_voice || false,
            has_sms: t.has_sms || false
          }));

        // Calculate min price
        const prices = matchingPlans.map(p => p.price).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : region.min_price;

        return {
          ...region,
          translations: translationsMap[region.id] || {},
          countries: allRegionCountries.map(c => ({
            id: c.id,
            name: c.name,
            iso_code: c.iso_code || '',
            image_url: c.image_url,
            plan_count: c.plan_count || 0,
            is_popular: c.is_popular || false
          })),
          country_count: allRegionCountries.length,
          tariff_count: matchingPlans.length,
          top_tariffs: regionTariffs,
          min_price: minPrice
        };
      });
    }

    // If not including stats, still add translations to basic regions
    let regionsWithTranslations = regions;
    if (!includeStats && regions) {
      regionsWithTranslations = regions.map(region => ({
        ...region,
        translations: translationsMap[region.id] || {}
      }));
    }

    // Calculate pagination info
    const totalPages = Math.ceil((count || 0) / limit);

    return NextResponse.json({
      success: true,
      data: includeStats ? regionsWithStats : regionsWithTranslations || [],
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
        type,
        isActive
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
    console.error('Error in /api/regions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/regions - Create a new region
 */
export async function POST(request) {
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

    const body = await request.json();
    const { id, slug, name, display_name, type, image_url, display_order, is_active, metadata } = body;

    if (!id || !name) {
      return NextResponse.json({
        success: false,
        error: 'Region ID and name are required'
      }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('regions')
      .insert({
        id,
        slug: slug || id,
        name,
        display_name,
        type: type || 'region',
        image_url,
        display_order: display_order || 0,
        is_active: is_active !== false,
        metadata: metadata || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating region:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Region created successfully'
    });

  } catch (error) {
    console.error('Error in POST /api/regions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * PUT /api/regions - Update an existing region
 */
export async function PUT(request) {
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

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Region ID is required'
      }, { status: 400 });
    }

    // Remove fields that shouldn't be updated directly
    // Note: translations is stored in region_translations table, not in regions
    delete updateData.created_at;
    delete updateData.translations;
    delete updateData.countries;
    delete updateData.top_tariffs;
    delete updateData.tariff_count;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('regions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating region:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Region updated successfully'
    });

  } catch (error) {
    console.error('Error in PUT /api/regions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * DELETE /api/regions - Delete a region
 */
export async function DELETE(request) {
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Region ID is required'
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('regions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting region:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Region deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /api/regions:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
