import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET endpoint to fetch ALL dataplans from Supabase (no limit)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';

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

    // Fetch ALL dataplans - use pagination to get everything
    let allData = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase
        .from('dataplans')
        .select('*')
        .order('name', { ascending: true })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      // Filter by status if specified
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase query error:', error);
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        page++;
        hasMore = data.length === pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allData.length} total dataplans from Supabase`);

    return NextResponse.json({
      success: true,
      data: allData,
      total: allData.length
    });

  } catch (error) {
    console.error('Error fetching Supabase plans:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
