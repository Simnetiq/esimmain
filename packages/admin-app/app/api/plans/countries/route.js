import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/plans/countries - Get distinct countries from dataplans
 */
export async function GET() {
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

    // Get distinct countries from dataplans
    const { data, error } = await supabase
      .from('dataplans')
      .select('country_id, country_name, country_iso')
      .eq('status', 'active')
      .not('country_id', 'is', null)
      .order('country_name', { ascending: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }

    // Get unique countries
    const countriesMap = new Map();
    data?.forEach(plan => {
      if (plan.country_id && !countriesMap.has(plan.country_id)) {
        countriesMap.set(plan.country_id, {
          id: plan.country_id,
          name: plan.country_name || plan.country_id,
          iso: plan.country_iso
        });
      }
    });

    const countries = Array.from(countriesMap.values())
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    return NextResponse.json({
      success: true,
      data: countries,
      total: countries.length
    }, {
      headers: {
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
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
