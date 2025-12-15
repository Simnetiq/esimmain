import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, limit as firestoreLimit, serverTimestamp } from 'firebase/firestore';
import { blockUser, unblockUser } from '@esim/shared/services/fraudSignalsService';

export const dynamic = 'force-dynamic';

/**
 * Admin Fraud Management API
 * 
 * GET /api/admin/fraud-management - List blocked users, fraud signals, appeals
 * POST /api/admin/fraud-management - Block/unblock user, resolve appeal
 * DELETE /api/admin/fraud-management - Remove from blocklist
 */

/**
 * GET - List fraud data for admin dashboard
 */
export async function GET(request) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (process.env.NODE_ENV === 'production' && adminApiKey) {
      if (!authHeader || authHeader !== `Bearer ${adminApiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const limitParam = parseInt(searchParams.get('limit') || '50');

    const response = {};

    // Get blocked users
    if (type === 'all' || type === 'blocked') {
      const blockedQuery = query(
        collection(db, 'fraudSignals'),
        where('blocked', '==', true),
        firestoreLimit(limitParam)
      );
      const blockedSnap = await getDocs(blockedQuery);
      
      response.blockedUsers = [];
      blockedSnap.forEach(docSnap => {
        const data = docSnap.data();
        response.blockedUsers.push({
          id: docSnap.id,
          userId: data.userId,
          email: data.email,
          blocked: data.blocked,
          blockType: data.blockType,
          blockReason: data.blockReason,
          blockedAt: data.blockedAt?.toDate?.()?.toISOString() || null,
          blockExpiresAt: data.blockExpiresAt?.toDate?.()?.toISOString() || null,
          temporaryBlockCount: data.temporaryBlockCount,
          attempts: data.attempts,
          cardFingerprints: data.cardFingerprints || [],
          ips: data.ips || []
        });
      });
    }

    // Get pending appeals
    if (type === 'all' || type === 'appeals') {
      const appealsQuery = query(
        collection(db, 'fraud_appeals'),
        where('status', '==', 'pending'),
        firestoreLimit(limitParam)
      );
      const appealsSnap = await getDocs(appealsQuery);
      
      response.pendingAppeals = [];
      appealsSnap.forEach(docSnap => {
        const data = docSnap.data();
        response.pendingAppeals.push({
          id: docSnap.id,
          userId: data.userId,
          email: data.email,
          contactEmail: data.contactEmail,
          reason: data.reason,
          additionalInfo: data.additionalInfo,
          status: data.status,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null
        });
      });
    }

    // Get recent blocked payments
    if (type === 'all' || type === 'blocked_payments') {
      const blockedPaymentsQuery = query(
        collection(db, 'fraud_blocked_payments'),
        firestoreLimit(limitParam)
      );
      const blockedPaymentsSnap = await getDocs(blockedPaymentsQuery);
      
      response.blockedPayments = [];
      blockedPaymentsSnap.forEach(docSnap => {
        const data = docSnap.data();
        response.blockedPayments.push({
          id: docSnap.id,
          userId: data.userId,
          email: data.email,
          cardLast4: data.cardLast4,
          cardBrand: data.cardBrand,
          blockReason: data.blockReason,
          riskLevel: data.riskLevel,
          countryCode: data.countryCode,
          isHighRiskRegion: data.isHighRiskRegion,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null
        });
      });
    }

    // Get fraud warnings
    if (type === 'all' || type === 'warnings') {
      const warningsQuery = query(
        collection(db, 'fraud_warnings'),
        where('reviewed', '==', false),
        firestoreLimit(limitParam)
      );
      const warningsSnap = await getDocs(warningsQuery);
      
      response.fraudWarnings = [];
      warningsSnap.forEach(docSnap => {
        const data = docSnap.data();
        response.fraudWarnings.push({
          id: docSnap.id,
          warningId: data.warningId,
          orderId: data.orderId,
          userId: data.userId,
          email: data.email,
          cardLast4: data.cardLast4,
          fraudType: data.fraudType,
          actionable: data.actionable,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null
        });
      });
    }

    // Get statistics
    if (type === 'all' || type === 'stats') {
      // Count blocked users
      const blockedCountQuery = query(
        collection(db, 'fraudSignals'),
        where('blocked', '==', true)
      );
      const blockedCountSnap = await getDocs(blockedCountQuery);

      // Count blocked payments in last 24h (simplified - just get recent)
      const recentBlockedQuery = query(
        collection(db, 'fraud_blocked_payments'),
        firestoreLimit(100)
      );
      const recentBlockedSnap = await getDocs(recentBlockedQuery);

      response.stats = {
        totalBlockedUsers: blockedCountSnap.size,
        recentBlockedPayments: recentBlockedSnap.size,
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

/**
 * POST - Block/unblock user, resolve appeal
 */
export async function POST(request) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (process.env.NODE_ENV === 'production' && adminApiKey) {
      if (!authHeader || authHeader !== `Bearer ${adminApiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

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

        const result = await blockUser(db, userId, email, {
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

        await unblockUser(db, userId, email);

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

        const appealRef = doc(db, 'fraud_appeals', appealId);
        const appealSnap = await getDoc(appealRef);

        if (!appealSnap.exists()) {
          return NextResponse.json(
            { error: 'Appeal not found', code: 'NOT_FOUND' },
            { status: 404 }
          );
        }

        const appealData = appealSnap.data();

        await updateDoc(appealRef, {
          status: 'resolved',
          resolution: resolution || 'reviewed',
          resolvedAt: serverTimestamp(),
          resolvedBy: 'admin'
        });

        // If approved, unblock the user
        if (resolution === 'approved') {
          await unblockUser(db, appealData.userId, appealData.email);
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

        const warningRef = doc(db, 'fraud_warnings', warningId);
        await updateDoc(warningRef, {
          reviewed: true,
          reviewedAt: serverTimestamp(),
          reviewedBy: 'admin',
          action: body.warningAction || 'reviewed'
        });

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

/**
 * DELETE - Remove from blocklist
 */
export async function DELETE(request) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (process.env.NODE_ENV === 'production' && adminApiKey) {
      if (!authHeader || authHeader !== `Bearer ${adminApiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const blockId = searchParams.get('blockId');
    const cardFingerprint = searchParams.get('cardFingerprint');

    if (blockId) {
      // Remove specific block entry
      const blockRef = doc(db, 'fraud_blocklist', blockId);
      await updateDoc(blockRef, {
        active: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: 'admin'
      });

      return NextResponse.json({
        success: true,
        action: 'block_removed'
      });
    }

    if (cardFingerprint) {
      // Remove card fingerprint block
      const cardBlockRef = doc(db, 'fraud_blocklist', `card_${cardFingerprint}`);
      await updateDoc(cardBlockRef, {
        active: false,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: 'admin'
      });

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
