import { NextResponse } from 'next/server';
import { db } from '@esim/shared/firebase/config';
import {
  checkUserBlocked,
  getFraudStats,
  analyzeIpRisk,
  FRAUD_SIGNALS_CONFIG
} from '@esim/shared/services/fraudSignalsService';
import { checkBlocklist } from '@esim/shared/services/fraudDetectionService';

export const dynamic = 'force-dynamic';

/**
 * Check Fraud Status API
 * 
 * This endpoint should be called BEFORE initiating Stripe checkout
 * to block known fraudsters from even reaching the payment page.
 * 
 * GET /api/check-fraud-status?userId=xxx&email=xxx
 * 
 * Returns:
 * - allowed: boolean - Whether the user can proceed to checkout
 * - blockType: string - Type of block (temporary, permanent, card_blocked, ip_blocked)
 * - message: string - User-facing message
 * - canContactSupport: boolean - Whether user can appeal
 * - expiresAt: string - When temporary block expires (ISO string)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const cardFingerprint = searchParams.get('cardFingerprint'); // Optional, from previous payment

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;

    // Get country from headers (set by Cloudflare or similar)
    const countryCode = request.headers.get('cf-ipcountry') || null;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'userId or email is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // 1. Check if user is blocked in fraud signals system
    const blockStatus = await checkUserBlocked(db, userId, email, cardFingerprint, ipAddress);

    if (blockStatus.blocked) {
      
      return NextResponse.json({
        allowed: false,
        blocked: true,
        blockType: blockStatus.blockType,
        reason: blockStatus.reason,
        message: blockStatus.supportMessage || blockStatus.reason,
        canContactSupport: blockStatus.canContactSupport || false,
        expiresAt: blockStatus.expiresAt || null,
        remainingHours: blockStatus.remainingHours || null
      });
    }

    // 2. Also check legacy blocklist
    const legacyBlocklistCheck = await checkBlocklist(db, userId, email, cardFingerprint);
    
    if (legacyBlocklistCheck.blocked) {
      return NextResponse.json({
        allowed: false,
        blocked: true,
        blockType: 'blocklisted',
        reason: legacyBlocklistCheck.reason,
        message: legacyBlocklistCheck.reason,
        canContactSupport: true
      });
    }

    // 3. Analyze IP risk (for logging/warning, not blocking)
    const ipRisk = analyzeIpRisk(ipAddress, countryCode);

    // 4. Get fraud stats for the user
    const fraudStats = await getFraudStats(db, userId, email);

    // 5. Check if user is approaching block threshold
    let warning = null;
    if (fraudStats && fraudStats.attempts >= FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN - 2) {
      warning = {
        type: 'approaching_limit',
        message: 'Your account has multiple failed payment attempts. Please ensure your payment details are correct.',
        attemptsRemaining: FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN - fraudStats.attempts
      };
    }

    // 6. Check for high-risk region
    if (countryCode && FRAUD_SIGNALS_CONFIG.HIGH_RISK_REGIONS.includes(countryCode)) {
      // Don't block, but log for monitoring
    }

    // User is allowed
    return NextResponse.json({
      allowed: true,
      blocked: false,
      riskLevel: fraudStats?.riskLevel || 'low',
      warning,
      ipRisk: ipRisk.isHighRisk ? {
        riskScore: ipRisk.riskScore,
        factors: ipRisk.riskFactors
      } : null
    });

  } catch (error) {
    
    // Fail open - allow checkout on error but log
    return NextResponse.json({
      allowed: true,
      blocked: false,
      error: 'Fraud check failed',
      warning: null
    });
  }
}

/**
 * POST endpoint for checking fraud status with body params
 * More secure for passing card fingerprint
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, email, cardFingerprint } = body;

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
    const countryCode = request.headers.get('cf-ipcountry') || null;

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'userId or email is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    // Full fraud check
    const blockStatus = await checkUserBlocked(db, userId, email, cardFingerprint, ipAddress);

    if (blockStatus.blocked) {
      
      return NextResponse.json({
        allowed: false,
        blocked: true,
        blockType: blockStatus.blockType,
        reason: blockStatus.reason,
        message: blockStatus.supportMessage || blockStatus.reason,
        canContactSupport: blockStatus.canContactSupport || false,
        expiresAt: blockStatus.expiresAt || null,
        remainingHours: blockStatus.remainingHours || null
      });
    }

    // Legacy blocklist
    const legacyBlocklistCheck = await checkBlocklist(db, userId, email, cardFingerprint);
    
    if (legacyBlocklistCheck.blocked) {
      return NextResponse.json({
        allowed: false,
        blocked: true,
        blockType: 'blocklisted',
        reason: legacyBlocklistCheck.reason,
        message: legacyBlocklistCheck.reason,
        canContactSupport: true
      });
    }

    // IP risk
    const ipRisk = analyzeIpRisk(ipAddress, countryCode);
    const fraudStats = await getFraudStats(db, userId, email);

    let warning = null;
    if (fraudStats && fraudStats.attempts >= FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN - 2) {
      warning = {
        type: 'approaching_limit',
        message: 'Your account has multiple failed payment attempts. Please ensure your payment details are correct.',
        attemptsRemaining: FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN - fraudStats.attempts
      };
    }

    return NextResponse.json({
      allowed: true,
      blocked: false,
      riskLevel: fraudStats?.riskLevel || 'low',
      warning,
      ipRisk: ipRisk.isHighRisk ? {
        riskScore: ipRisk.riskScore,
        factors: ipRisk.riskFactors
      } : null
    });

  } catch (error) {
    
    return NextResponse.json({
      allowed: true,
      blocked: false,
      error: 'Fraud check failed',
      warning: null
    });
  }
}
