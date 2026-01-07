import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * GET /api/regions/promoted-countries
 * Fetch promoted countries for a region
 *
 * Query params:
 * - regionId: Region ID (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const regionId = searchParams.get('regionId');

    if (!regionId) {
      return NextResponse.json(
        { success: false, error: 'regionId is required' },
        { status: 400 }
      );
    }

    // Fetch promoted countries with country details
    const { data, error } = await supabase
      .from('region_promoted_countries')
      .select(`
        id,
        position,
        is_active,
        created_at,
        country:countries (
          id,
          iso_code,
          name,
          slug,
          image_url,
          plan_count,
          min_price,
          is_popular
        )
      `)
      .eq('region_id', regionId)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) {
      console.error('Error fetching promoted countries:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform to simpler format
    const promotedCountries = (data || [])
      .filter(p => p.country)
      .map(p => ({
        id: p.id,
        position: p.position,
        countryId: p.country.id,
        countryCode: p.country.iso_code,
        countryName: p.country.name,
        countrySlug: p.country.slug,
        countryImage: p.country.image_url,
        planCount: p.country.plan_count || 0,
        minPrice: p.country.min_price,
        isPopular: p.country.is_popular
      }));

    return NextResponse.json({
      success: true,
      data: promotedCountries,
      count: promotedCountries.length
    });
  } catch (error) {
    console.error('Error in GET /api/regions/promoted-countries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/regions/promoted-countries
 * Add a country to promoted list for a region
 *
 * Body:
 * - regionId: Region ID
 * - countryId: Country ID
 * - position: Position (0-7)
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { regionId, countryId, position } = body;

    if (!regionId || !countryId) {
      return NextResponse.json(
        { success: false, error: 'regionId and countryId are required' },
        { status: 400 }
      );
    }

    // Validate position (0-15)
    const pos = parseInt(position) || 0;
    if (pos < 0 || pos > 15) {
      return NextResponse.json(
        { success: false, error: 'Position must be between 0 and 15' },
        { status: 400 }
      );
    }

    // Check if country is already promoted for this region
    const { data: existing } = await supabase
      .from('region_promoted_countries')
      .select('id')
      .eq('region_id', regionId)
      .eq('country_id', countryId)
      .single();

    if (existing) {
      // Update position instead
      const { data, error } = await supabase
        .from('region_promoted_countries')
        .update({ position: pos, is_active: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({ success: true, data, updated: true });
    }

    // Check if we already have 8 promoted countries
    const { count } = await supabase
      .from('region_promoted_countries')
      .select('*', { count: 'exact', head: true })
      .eq('region_id', regionId)
      .eq('is_active', true);

    if (count >= 16) {
      return NextResponse.json(
        { success: false, error: 'Maximum 16 promoted countries per region' },
        { status: 400 }
      );
    }

    // Insert new promoted country
    const { data, error } = await supabase
      .from('region_promoted_countries')
      .insert({
        region_id: regionId,
        country_id: countryId,
        position: pos,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding promoted country:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data, created: true });
  } catch (error) {
    console.error('Error in POST /api/regions/promoted-countries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/regions/promoted-countries
 * Update promoted countries positions (bulk update)
 *
 * Body:
 * - regionId: Region ID
 * - countries: Array of { countryId, position }
 */
export async function PUT(request) {
  try {
    const body = await request.json();
    const { regionId, countries } = body;

    if (!regionId || !Array.isArray(countries)) {
      return NextResponse.json(
        { success: false, error: 'regionId and countries array are required' },
        { status: 400 }
      );
    }

    // Validate max 16 countries
    if (countries.length > 16) {
      return NextResponse.json(
        { success: false, error: 'Maximum 16 promoted countries per region' },
        { status: 400 }
      );
    }

    // First, deactivate all existing promoted countries for this region
    await supabase
      .from('region_promoted_countries')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('region_id', regionId);

    // Then upsert the new list
    const upsertData = countries.map((c, index) => ({
      region_id: regionId,
      country_id: c.countryId,
      position: c.position !== undefined ? c.position : index,
      is_active: true,
      updated_at: new Date().toISOString()
    }));

    const results = [];
    for (const item of upsertData) {
      // Check if exists
      const { data: existing } = await supabase
        .from('region_promoted_countries')
        .select('id')
        .eq('region_id', item.region_id)
        .eq('country_id', item.country_id)
        .single();

      if (existing) {
        // Update
        const { data, error } = await supabase
          .from('region_promoted_countries')
          .update({
            position: item.position,
            is_active: true,
            updated_at: item.updated_at
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        results.push(data);
      } else {
        // Insert
        const { data, error } = await supabase
          .from('region_promoted_countries')
          .insert(item)
          .select()
          .single();

        if (error) throw error;
        results.push(data);
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length
    });
  } catch (error) {
    console.error('Error in PUT /api/regions/promoted-countries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/regions/promoted-countries
 * Remove a country from promoted list
 *
 * Query params:
 * - id: Promoted country record ID
 * OR
 * - regionId + countryId
 */
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const regionId = searchParams.get('regionId');
    const countryId = searchParams.get('countryId');

    if (!id && (!regionId || !countryId)) {
      return NextResponse.json(
        { success: false, error: 'id or (regionId and countryId) are required' },
        { status: 400 }
      );
    }

    let query = supabase.from('region_promoted_countries');

    if (id) {
      query = query.delete().eq('id', id);
    } else {
      query = query.delete().eq('region_id', regionId).eq('country_id', countryId);
    }

    const { error } = await query;

    if (error) {
      console.error('Error removing promoted country:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/regions/promoted-countries:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
