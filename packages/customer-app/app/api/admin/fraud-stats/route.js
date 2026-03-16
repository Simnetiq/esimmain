import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { getUserFraudStats } from '@esim/shared/services/fraudDetectionService';
import { verifyAdminKey } from '@esim/shared/lib/apiAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request) {
  try {
    const authError = verifyAdminKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const stats = await getUserFraudStats(supabase, userId);

    if (!stats) {
      return NextResponse.json(
        { error: 'Failed to retrieve fraud statistics' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      userId,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting fraud stats:', error);
    return NextResponse.json(
      { error: `Failed to get fraud stats: ${error.message}` },
      { status: 500 }
    );
  }
}
