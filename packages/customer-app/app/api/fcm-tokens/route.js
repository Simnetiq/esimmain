import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const limitParam = parseInt(searchParams.get('limit')) || 100;

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('fcm_tokens')
      .select('*')
      .eq('active', true);
    
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: tokens, error } = await query.limit(limitParam);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      tokens: tokens || [],
      totalCount: (tokens || []).length
    });

  } catch (error) {
    console.error('❌ Error fetching FCM tokens:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tokens' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { token, userId, platform, appVersion, deviceModel } = body;

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and userId are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // Check if token already exists
    const { data: existing } = await supabase
      .from('fcm_tokens')
      .select('id')
      .eq('token', token)
      .limit(1);

    const now = new Date().toISOString();

    if (!existing || existing.length === 0) {
      // Create new token
      await supabase
        .from('fcm_tokens')
        .insert({
          token,
          user_id: userId,
          platform: platform || 'unknown',
          app_version: appVersion || 'unknown',
          device_model: deviceModel || 'unknown',
          active: true,
          created_at: now,
          updated_at: now,
          last_used_at: now
        });
    } else {
      // Update existing token
      await supabase
        .from('fcm_tokens')
        .update({
          user_id: userId,
          platform: platform || undefined,
          app_version: appVersion || undefined,
          device_model: deviceModel || undefined,
          active: true,
          updated_at: now,
          last_used_at: now
        })
        .eq('token', token);
    }

    return NextResponse.json({
      success: true,
      message: 'Token saved successfully'
    });

  } catch {
    return NextResponse.json(
      { error: 'Failed to save token' },
      { status: 500 }
    );
  }
}
