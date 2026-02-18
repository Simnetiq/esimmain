/**
 * Fraud Detection Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

const FRAUD_RULES = {
  MAX_PURCHASES_PER_USER_PER_DAY: 3,
  MAX_PURCHASES_PER_CARD_PER_DAY: 5,
  MAX_PURCHASES_PER_EMAIL_PER_DAY: 3,
  MAX_FAILED_ATTEMPTS_PER_HOUR: 5,
  SUSPICIOUS_AMOUNT_THRESHOLD: 1000,
  TIME_WINDOW_HOURS: 24,
  RAPID_PURCHASE_WINDOW_MINUTES: 5,
};

// Note: This service receives `db` as first arg for compatibility but uses Supabase internally
// The `db` param is ignored - kept for API compatibility

export async function checkFraudRules(db, userId, email, metadata = {}) {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

    let riskScore = 0;
    const riskFactors = [];

    if (userId) {
      const userPurchaseCount = await getUserPurchaseCount(userId, last24Hours);
      if (userPurchaseCount >= FRAUD_RULES.MAX_PURCHASES_PER_USER_PER_DAY) {
        return { allowed: false, reason: `Daily purchase limit exceeded. Maximum ${FRAUD_RULES.MAX_PURCHASES_PER_USER_PER_DAY} purchases per day allowed.`, riskScore: 100, blockedBy: 'user_daily_limit' };
      }
      if (userPurchaseCount >= 2) { riskScore += 20; riskFactors.push('multiple_purchases_today'); }
      const rapidPurchases = await getUserPurchaseCount(userId, last5Minutes);
      if (rapidPurchases > 0) { riskScore += 30; riskFactors.push('rapid_purchase_attempt'); }
    }

    if (email) {
      const emailPurchaseCount = await getEmailPurchaseCount(email, last24Hours);
      if (emailPurchaseCount >= FRAUD_RULES.MAX_PURCHASES_PER_EMAIL_PER_DAY) {
        return { allowed: false, reason: `Daily purchase limit exceeded for this email.`, riskScore: 100, blockedBy: 'email_daily_limit' };
      }
      if (emailPurchaseCount >= 2) { riskScore += 15; riskFactors.push('multiple_email_purchases'); }
    }

    if (metadata.paymentMethodFingerprint) {
      const cardPurchaseCount = await getCardPurchaseCount(metadata.paymentMethodFingerprint, last24Hours);
      if (cardPurchaseCount >= FRAUD_RULES.MAX_PURCHASES_PER_CARD_PER_DAY) {
        return { allowed: false, reason: 'This payment method has exceeded daily transaction limits.', riskScore: 100, blockedBy: 'card_daily_limit' };
      }
      if (cardPurchaseCount >= 3) { riskScore += 25; riskFactors.push('frequent_card_usage'); }
    }

    if (userId || email) {
      const failedAttempts = await getFailedAttempts(userId, email, lastHour);
      if (failedAttempts >= FRAUD_RULES.MAX_FAILED_ATTEMPTS_PER_HOUR) {
        return { allowed: false, reason: 'Too many failed payment attempts.', riskScore: 100, blockedBy: 'failed_attempts_limit' };
      }
      if (failedAttempts >= 2) { riskScore += 20; riskFactors.push('recent_failed_attempts'); }
    }

    if (metadata.amount && metadata.amount >= FRAUD_RULES.SUSPICIOUS_AMOUNT_THRESHOLD) {
      riskScore += 15; riskFactors.push('high_value_transaction');
    }

    if (userId && metadata.accountAge) {
      const accountAgeHours = (now - metadata.accountAge) / (1000 * 60 * 60);
      if (accountAgeHours < 1 && metadata.amount > 100) { riskScore += 25; riskFactors.push('new_account_large_purchase'); }
    }

    const requiresReview = riskScore >= 50 && riskScore < 100;
    const allowed = riskScore < 100;

    return { allowed, requiresReview, riskScore, riskFactors, reason: allowed ? 'Transaction approved' : 'Transaction blocked due to fraud detection rules' };
  } catch (error) {
    console.error('Fraud check error:', error);
    return { allowed: true, requiresReview: true, riskScore: 0, error: error.message, reason: 'Fraud check failed - allowing transaction with review flag' };
  }
}

async function getUserPurchaseCount(userId, startTime) {
  try {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from('fraud_tracking_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('created_at', startTime.toISOString())
      .in('status', ['completed', 'pending']);
    if (error) throw error;
    return count || 0;
  } catch (error) { return 0; }
}

async function getEmailPurchaseCount(email, startTime) {
  try {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from('fraud_tracking_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('email', email.toLowerCase())
      .gte('created_at', startTime.toISOString())
      .in('status', ['completed', 'pending']);
    if (error) throw error;
    return count || 0;
  } catch (error) { return 0; }
}

async function getCardPurchaseCount(cardFingerprint, startTime) {
  try {
    const supabase = getSupabase();
    const { count, error } = await supabase
      .from('fraud_tracking_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('paymentMethodFingerprint', cardFingerprint)
      .gte('created_at', startTime.toISOString())
      .in('status', ['completed', 'pending']);
    if (error) throw error;
    return count || 0;
  } catch (error) { return 0; }
}

async function getFailedAttempts(userId, email, startTime) {
  try {
    const supabase = getSupabase();
    let total = 0;
    if (userId) {
      const { count } = await supabase
        .from('fraud_tracking_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('userId', userId)
        .eq('status', 'failed')
        .gte('created_at', startTime.toISOString());
      total += count || 0;
    }
    if (email) {
      const { count } = await supabase
        .from('fraud_tracking_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('email', email.toLowerCase())
        .eq('status', 'failed')
        .gte('created_at', startTime.toISOString());
      total += count || 0;
    }
    return total;
  } catch (error) { return 0; }
}

export async function trackPurchaseAttempt(db, data) {
  try {
    const supabase = getSupabase();
    const { data: result, error } = await supabase
      .from('fraud_tracking_attempts')
      .insert({
        userId: data.userId || null,
        email: data.email?.toLowerCase() || null,
        amount: data.amount || 0,
        currency: data.currency || 'usd',
        paymentMethodFingerprint: data.paymentMethodFingerprint || null,
        status: 'pending',
        metadata: data.metadata || {}
      })
      .select('id')
      .single();

    if (error) throw error;
    return result.id;
  } catch (error) {
    console.error('Error tracking purchase attempt:', error);
    return null;
  }
}

export async function trackCompletedPurchase(db, data) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('fraud_tracking_purchases')
      .upsert({
        id: data.orderId || `purchase_${Date.now()}`,
        orderId: data.orderId,
        userId: data.userId || null,
        email: data.email?.toLowerCase() || null,
        amount: data.amount || 0,
        currency: data.currency || 'usd',
        paymentMethodFingerprint: data.paymentMethodFingerprint || null,
        paymentMethodLast4: data.paymentMethodLast4 || null,
        paymentMethodBrand: data.paymentMethodBrand || null,
        status: 'completed',
        riskScore: data.riskScore || 0,
        riskFactors: data.riskFactors || [],
        metadata: data.metadata || {}
      });

    if (error) throw error;

    if (data.attemptId) {
      await supabase
        .from('fraud_tracking_attempts')
        .update({ status: 'completed', orderId: data.orderId, updated_at: new Date().toISOString() })
        .eq('id', data.attemptId);
    }

    return data.orderId || `purchase_${Date.now()}`;
  } catch (error) {
    console.error('Error tracking completed purchase:', error);
    return null;
  }
}

export async function trackFailedPurchase(db, data) {
  try {
    if (data.attemptId) {
      const supabase = getSupabase();
      await supabase
        .from('fraud_tracking_attempts')
        .update({ status: 'failed', failureReason: data.failureReason || 'unknown', updated_at: new Date().toISOString() })
        .eq('id', data.attemptId);
    }
    return true;
  } catch (error) {
    console.error('Error tracking failed purchase:', error);
    return false;
  }
}

export async function getUserFraudStats(db, userId) {
  try {
    const supabase = getSupabase();
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const { count: purchases24h } = await supabase
      .from('fraud_tracking_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('created_at', last24Hours.toISOString());

    const { count: purchases7d } = await supabase
      .from('fraud_tracking_purchases')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .gte('created_at', last7Days.toISOString());

    const { count: failedAttempts } = await supabase
      .from('fraud_tracking_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId)
      .eq('status', 'failed')
      .gte('created_at', last7Days.toISOString());

    return {
      purchasesLast24Hours: purchases24h || 0,
      purchasesLast7Days: purchases7d || 0,
      failedAttemptsLast7Days: failedAttempts || 0,
      isHighRisk: (purchases24h || 0) >= FRAUD_RULES.MAX_PURCHASES_PER_USER_PER_DAY - 1
    };
  } catch (error) {
    console.error('Error getting user fraud stats:', error);
    return null;
  }
}

export async function checkBlocklist(db, userId, email, cardFingerprint = null) {
  try {
    const supabase = getSupabase();
    const queries = [];

    if (userId) {
      queries.push(supabase.from('fraud_blocklist').select('id').eq('userId', userId).eq('active', true).limit(1));
    }
    if (email) {
      queries.push(supabase.from('fraud_blocklist').select('id').eq('email', email.toLowerCase()).eq('active', true).limit(1));
    }
    if (cardFingerprint) {
      queries.push(supabase.from('fraud_blocklist').select('id').eq('cardFingerprint', cardFingerprint).eq('active', true).limit(1));
    }

    const results = await Promise.all(queries);
    const blocked = results.some(({ data }) => data && data.length > 0);

    if (blocked) {
      return { blocked: true, reason: 'This payment method has been blocked due to suspicious activity.' };
    }
    return { blocked: false };
  } catch (error) {
    console.error('Error checking blocklist:', error);
    return { blocked: false };
  }
}

export async function addToBlocklist(db, data) {
  try {
    const supabase = getSupabase();
    const { data: result, error } = await supabase
      .from('fraud_blocklist')
      .insert({
        userId: data.userId || null,
        email: data.email?.toLowerCase() || null,
        cardFingerprint: data.cardFingerprint || null,
        reason: data.reason || 'Manual block',
        active: true,
        createdBy: data.createdBy || 'system',
        metadata: data.metadata || {}
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, blockId: result.id };
  } catch (error) {
    console.error('Error adding to blocklist:', error);
    return { success: false, error: error.message };
  }
}

export async function logPriceManipulationAttempt(db, data) {
  try {
    const supabase = getSupabase();
    const { data: result, error } = await supabase
      .from('fraud_attempts')
      .insert({
        type: 'price_manipulation',
        userId: data.userId || null,
        email: data.email?.toLowerCase() || null,
        packageId: data.packageId || null,
        databasePrice: data.databasePrice || null,
        submittedPrice: data.submittedPrice || null,
        priceDifference: data.priceDifference || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        cardFingerprint: data.cardFingerprint || null,
        cardLast4: data.cardLast4 || null,
        cardBrand: data.cardBrand || null,
        sessionId: data.sessionId || null,
        metadata: data.metadata || {}
      })
      .select('id')
      .single();

    if (error) throw error;

    console.error('🚨 PRICE MANIPULATION LOGGED:', {
      attemptId: result.id, userId: data.userId, email: data.email,
      packageId: data.packageId, databasePrice: data.databasePrice,
      submittedPrice: data.submittedPrice
    });

    if (data.autoBlock && (data.userId || data.email || data.cardFingerprint)) {
      const blockReason = `Auto-blocked: Price manipulation attempt. Tried to pay ${data.submittedPrice} for item priced at ${data.databasePrice}`;
      await addToBlocklist(db, {
        userId: data.userId, email: data.email, cardFingerprint: data.cardFingerprint,
        reason: blockReason, createdBy: 'fraud_detection_system',
        metadata: { attemptId: result.id, packageId: data.packageId, databasePrice: data.databasePrice, submittedPrice: data.submittedPrice }
      });
    }

    return { success: true, attemptId: result.id };
  } catch (error) {
    console.error('Error logging price manipulation:', error);
    return { success: false, error: error.message };
  }
}

export async function getFraudAttempts(db, options = {}) {
  try {
    const supabase = getSupabase();
    let query = supabase.from('fraud_attempts').select('*');
    if (options.type) query = query.eq('type', options.type);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({ id: row.id, ...row }));
  } catch (error) {
    console.error('Error getting fraud attempts:', error);
    return [];
  }
}
