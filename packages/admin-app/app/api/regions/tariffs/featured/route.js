import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * PUT /api/regions/tariffs/featured - Toggle featured status for a tariff
 *
 * Body:
 * - planId: The plan ID to update
 * - is_featured: Boolean to set featured status
 */
export async function PUT(request) {
  try {
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

    const body = await request.json();
    const { planId, is_featured } = body;

    if (!planId) {
      return NextResponse.json({
        success: false,
        error: 'Plan ID is required'
      }, { status: 400 });
    }

    // Check if regional_plans record exists
    const { data: existing } = await supabase
      .from('regional_plans')
      .select('id')
      .eq('id', planId)
      .maybeSingle();

    if (existing) {
      // Update existing record
      const { error } = await supabase
        .from('regional_plans')
        .update({
          is_featured: is_featured,
          updated_at: new Date().toISOString()
        })
        .eq('id', planId);

      if (error) {
        console.error('Error updating regional_plans:', error);
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    } else {
      // Insert new record
      const { error } = await supabase
        .from('regional_plans')
        .insert({
          id: planId,
          is_featured: is_featured,
          priority_rank: is_featured ? 10 : 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error inserting regional_plans:', error);
        return NextResponse.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      planId,
      is_featured,
      message: `Plan ${is_featured ? 'marked as featured' : 'removed from featured'}`
    });

  } catch (error) {
    console.error('Error in PUT /api/regions/tariffs/featured:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
