import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { blockUser, unblockUser, getFraudStats } from '@esim/shared/services/fraudSignalsService';

export const dynamic = 'force-dynamic';

function checkAdminAuth(request) {
  const authHeader = request.headers.get('authorization');
  const adminApiKey = process.env.ADMIN_API_KEY;
  if (!adminApiKey) {
    return NextResponse.json({ error: 'Server misconfiguration: ADMIN_API_KEY not set', code: 'SERVER_ERROR' }, { status: 503 });
  }
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  const provided = Buffer.from(authHeader.slice(7));
  const expected = Buffer.from(adminApiKey);
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
  }
  return null; // authorized
}

export async function GET(request) {
  try {
    const authError = checkAdminAuth(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limitParam = parseInt(searchParams.get('limit') || '50');

    const supabase = getSupabaseAdmin();
    const response = {};

    // Get blocked users
    if (type === 'all' || type === 'blocked') {
      const { data: blockedUsers } = await supabase
        .from('fraud_signals')
        .select('*')
        .eq('blocked', true)
        .limit(limitParam);

      response.blockedUsers = (blockedUsers || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        email: d.email,
        blocked: d.blocked,
        blockType: d.block_type,
        blockReason: d.block_reason,
        blockedAt: d.blocked_at,
        blockExpiresAt: d.block_expires_at,
        temporaryBlockCount: d.temporary_block_count,
        attempts: d.attempts,
        cardFingerprints: d.card_fingerprints || [],
        ips: d.ips || []
      }));
    }

    // Get pending appeals
    if (type === 'all' || type === 'appeals') {
      const { data: appeals } = await supabase
        .from('fraud_appeals')
        .select('*')
        .eq('status', 'pending')
        .limit(limitParam);

      response.pendingAppeals = (appeals || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        email: d.email,
        contactEmail: d.contact_email,
        reason: d.reason,
        additionalInfo: d.additional_info,
        status: d.status,
        createdAt: d.created_at
      }));
    }

    // Get recent blocked payments
    if (type === 'all' || type === 'blocked_payments') {
      const { data: blockedPayments } = await supabase
        .from('fraud_blocked_payments')
        .select('*')
        .limit(limitParam);

      response.blockedPayments = (blockedPayments || []).map(d => ({
        id: d.id,
        userId: d.user_id,
        email: d.email,
        cardLast4: d.card_last4,
        cardBrand: d.card_brand,
        blockReason: d.block_reason,
        riskLevel: d.risk_level,
        countryCode: d.country_code,
        isHighRiskRegion: d.is_high_risk_region,
        createdAt: d.created_at
      }));
    }

    // Get fraud warnings
    if (type === 'all' || type === 'warnings') {
      const { data: warnings } = await supabase
        .from('fraud_warnings')
        .select('*')
        .eq('reviewed', false)
        .limit(limitParam);

      response.fraudWarnings = (warnings || []).map(d => ({
        id: d.id,
        warningId: d.warning_id,
        orderId: d.order_id,
        userId: d.user_id,
        email: d.email,
        cardLast4: d.card_last4,
        fraudType: d.fraud_type,
        actionable: d.actionable,
        createdAt: d.created_at
      }));
    }

    // Get statistics
    if (type === 'all' || type === 'stats') {
      const { count: blockedCount } = await supabase
        .from('fraud_signals')
        .select('*', { count: 'exact', head: true })
        .eq('blocked', true);

      const { count: recentBlockedCount } = await supabase
        .from('fraud_blocked_payments')
        .select('*', { count: 'exact', head: true });

      response.stats = {
        totalBlockedUsers: blockedCount || 0,
        recentBlockedPayments: recentBlockedCount || 0,
        pendingAppeals: response.pendingAppeals?.length || 0,
        unviewedWarnings: response.fraudWarnings?.length || 0
      };
    }

    return NextResponse.json({
      success: true,
      ...response
    });

  } catch (error) {
    console.error('Error getting fraud data:', error);
    return NextResponse.json(
      { error: 'Failed to get fraud data', details: error.message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authError = checkAdminAuth(request);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();
    const body = await request.json();
    const { action, userId, email, reason, appealId, resolution, permanent } = body;

    switch (action) {
      case 'block': {
        if (!userId && !email) {
          return NextResponse.json(
            { error: 'userId or email is required', code: 'MISSING_PARAMS' },
            { status: 400 }
          );
        }

        const result = await blockUser(supabase, userId, email, {
          reason: reason || 'Manually blocked by admin',
          permanent,
          createdBy: 'admin'
        });

        return NextResponse.json({
          success: true,
          action: 'blocked',
          blockType: result.blockType,
          expiresAt: result.blockExpiresAt
        });
      }

      case 'unblock': {
        if (!userId && !email) {
          return NextResponse.json(
            { error: 'userId or email is required', code: 'MISSING_PARAMS' },
            { status: 400 }
          );
        }

        await unblockUser(supabase, userId, email);

        return NextResponse.json({
          success: true,
          action: 'unblocked'
        });
      }

      case 'resolve_appeal': {
        if (!appealId) {
          return NextResponse.json(
            { error: 'appealId is required', code: 'MISSING_PARAMS' },
            { status: 400 }
          );
        }

        const { data: appealData, error: appealError } = await supabase
          .from('fraud_appeals')
          .select('*')
          .eq('id', appealId)
          .single();

        if (appealError || !appealData) {
          return NextResponse.json(
            { error: 'Appeal not found', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        await supabase
          .from('fraud_appeals')
          .update({
            status: 'resolved',
            resolution: resolution || 'reviewed',
            resolved_at: new Date().toISOString(),
            resolved_by: 'admin'
          })
          .eq('id', appealId);

        if (resolution === 'approved') {
          await unblockUser(supabase, appealData.user_id, appealData.email);
        }

        return NextResponse.json({
          success: true,
          action: 'appeal_resolved',
          resolution
        });
      }

      case 'mark_warning_reviewed': {
        const { warningId } = body;
        if (!warningId) {
          return NextResponse.json(
            { error: 'warningId is required', code: 'MISSING_PARAMS' },
            { status: 400 }
          );
        }

        await supabase
          .from('fraud_warnings')
          .update({
            reviewed: true,
            reviewed_at: new Date().toISOString(),
            reviewed_by: 'admin',
            action: body.warningAction || 'reviewed'
          })
          .eq('id', warningId);

        return NextResponse.json({
          success: true,
          action: 'warning_reviewed'
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action', code: 'INVALID_ACTION' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error processing fraud action:', error);
    return NextResponse.json(
      { error: 'Failed to process action', details: error.message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const authError = checkAdminAuth(request);
    if (authError) return authError;

    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');
    const cardFingerprint = searchParams.get('cardFingerprint');

    if (blockId) {
      await supabase
        .from('fraud_blocklist')
        .update({
          active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: 'admin'
        })
        .eq('id', blockId);

      return NextResponse.json({
        success: true,
        action: 'block_removed'
      });
    }

    if (cardFingerprint) {
      await supabase
        .from('fraud_blocklist')
        .update({
          active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: 'admin'
        })
        .eq('id', `card_${cardFingerprint}`);

      return NextResponse.json({
        success: true,
        action: 'card_unblocked'
      });
    }

    return NextResponse.json(
      { error: 'blockId or cardFingerprint is required', code: 'MISSING_PARAMS' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error removing block:', error);
    return NextResponse.json(
      { error: 'Failed to remove block', details: error.message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
