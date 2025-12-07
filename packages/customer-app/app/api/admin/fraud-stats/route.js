import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { getUserFraudStats } from '@esim/shared/services/fraudDetectionService';

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Admin API: Get fraud statistics for a user
 * 
 * GET /api/admin/fraud-stats?userId={userId}
 * 
 * Returns:
 * {
 *   purchasesLast24Hours: number,
 *   purchasesLast7Days: number,
 *   failedAttemptsLast7Days: number,
 *   isHighRisk: boolean
 * }
 * 
 * NOTE: This is a protected endpoint. In production, you should:
 * 1. Verify admin authentication
 * 2. Add rate limiting
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing required parameter: userId' },
        { status: 400 }
      );
    }

    // TODO: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // const token = await verifyAdminToken(authHeader);
    // if (!token || !token.admin) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Get fraud stats
    const stats = await getUserFraudStats(db, userId);

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

