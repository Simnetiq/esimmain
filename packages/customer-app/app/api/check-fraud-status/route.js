import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import {
  checkUserBlocked,
  getFraudStats,
  analyzeIpRisk,
  FRAUD_SIGNALS_CONFIG
} from '@esim/shared/services/fraudSignalsService';
import { checkBlocklist } from '@esim/shared/services/fraudDetectionService';
import { verifyAdminKey } from '@esim/shared/lib/apiAuth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const authError = verifyAdminKey(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const email = searchParams.get('email');
    const cardFingerprint = searchParams.get('cardFingerprint');

    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
    const countryCode = request.headers.get('cf-ipcountry') || null;

    if (countryCode && FRAUD_SIGNALS_CONFIG.BLOCKED_COUNTRIES.includes(countryCode.toUpperCase())) {
      return NextResponse.json({
        allowed: false,
        blocked: true,
        blockType: 'country_blocked',
        reason: 'Payments are not available in your region.',
        message: 'Payments are not available in your region.',
        canContactSupport: false
      }, { status: 403 });
    }

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'userId or email is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const blockStatus = await checkUserBlocked(supabase, userId, email, cardFingerprint, ipAddress);

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

    const legacyBlocklistCheck = await checkBlocklist(supabase, userId, email, cardFingerprint);

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

    const ipRisk = analyzeIpRisk(ipAddress, countryCode);
    const fraudStats = await getFraudStats(supabase, userId, email);

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

export async function POST(request) {
  try {
    const authError = verifyAdminKey(request);
    if (authError) return authError;

    const body = await request.json();
    const { userId, email, cardFingerprint } = body;

    const forwarded = request.headers.get('x-forwarded-for');
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || null;
    const countryCode = request.headers.get('cf-ipcountry') || null;

    if (countryCode && FRAUD_SIGNALS_CONFIG.BLOCKED_COUNTRIES.includes(countryCode.toUpperCase())) {
      return NextResponse.json({
        allowed: false,
        blocked: true,
        blockType: 'country_blocked',
        reason: 'Payments are not available in your region.',
        message: 'Payments are not available in your region.',
        canContactSupport: false
      }, { status: 403 });
    }

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'userId or email is required', code: 'MISSING_PARAMS' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const blockStatus = await checkUserBlocked(supabase, userId, email, cardFingerprint, ipAddress);

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

    const legacyBlocklistCheck = await checkBlocklist(supabase, userId, email, cardFingerprint);
    
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

    const ipRisk = analyzeIpRisk(ipAddress, countryCode);
    const fraudStats = await getFraudStats(supabase, userId, email);

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
