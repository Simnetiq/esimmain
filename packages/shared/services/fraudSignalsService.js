/**
 * Fraud Signals Service - Supabase version
 */

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

export const FRAUD_SIGNALS_CONFIG = {
  MAX_BLOCKED_ATTEMPTS_BEFORE_BAN: 5,
  TEMPORARY_BLOCK_DURATION_MS: 24 * 60 * 60 * 1000,
  MAX_TEMPORARY_BLOCKS_BEFORE_PERMANENT: 3,
  ATTEMPT_RESET_HOURS: 24,
  HIGH_RISK_REGIONS: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'LB', 'IQ', 'SY', 'YE'],
  RISK_THRESHOLDS: { LOW: 25, MEDIUM: 50, HIGH: 75, CRITICAL: 90 }
};

function hashEmail(email) {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  let hash = 0;
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `email_${Math.abs(hash).toString(36)}`;
}

/**
 * Look up a fraud signal by user_id (uuid) or email_hash (text).
 * Uses .maybeSingle() to avoid PostgREST 406 when no rows exist.
 */
export async function getFraudSignal(db, userId, email) {
  try {
    const supabase = db || getSupabase();
    if (userId) {
      const { data } = await supabase.from('fraud_signals').select('*').eq('user_id', userId).maybeSingle();
      if (data) return data;
    }
    if (email) {
      const emailHash = hashEmail(email);
      const { data } = await supabase.from('fraud_signals').select('*').eq('email_hash', emailHash).maybeSingle();
      if (data) return data;
    }
    return null;
  } catch (error) { return null; }
}

export async function upsertFraudSignal(db, data) {
  try {
    const supabase = db || getSupabase();

    const existing = await getFraudSignal(db, data.userId, data.email);

    if (existing) {
      const updateData = { last_attempt_at: new Date().toISOString(), updated_at: new Date().toISOString() };

      if (data.cardFingerprint) {
        const fingerprints = existing.card_fingerprints || [];
        if (!fingerprints.includes(data.cardFingerprint)) fingerprints.push(data.cardFingerprint);
        updateData.card_fingerprints = fingerprints;
      }
      if (data.ipAddress) {
        const ips = existing.ips || [];
        if (!ips.includes(data.ipAddress)) ips.push(data.ipAddress);
        updateData.ips = ips;
      }
      if (data.deviceId) {
        const deviceIds = existing.device_ids || [];
        if (!deviceIds.includes(data.deviceId)) deviceIds.push(data.deviceId);
        updateData.device_ids = deviceIds;
      }
      if (data.incrementAttempts) {
        updateData.attempts = (existing.attempts || 0) + 1;
      }

      await supabase.from('fraud_signals').update(updateData).eq('id', existing.id);
    } else {
      await supabase.from('fraud_signals').insert({
        user_id: data.userId || null,
        email: data.email?.toLowerCase() || null,
        email_hash: data.email ? hashEmail(data.email) : null,
        card_fingerprints: data.cardFingerprint ? [data.cardFingerprint] : [],
        ips: data.ipAddress ? [data.ipAddress] : [],
        device_ids: data.deviceId ? [data.deviceId] : [],
        attempts: data.incrementAttempts ? 1 : 0,
        blocked: false,
        block_type: null,
        blocked_at: null,
        block_expires_at: null,
        temporary_block_count: 0,
        last_attempt_at: new Date().toISOString(),
        metadata: data.metadata || {}
      });
    }

    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function recordBlockedPayment(db, data) {
  try {
    const supabase = db || getSupabase();

    await supabase.from('fraud_blocked_payments').insert({
      id: data.stripePaymentIntentId || `blocked_${Date.now()}`,
      user_id: data.userId || null,
      email: data.email?.toLowerCase() || null,
      card_fingerprint: data.cardFingerprint || null,
      card_last4: data.cardLast4 || null,
      card_brand: data.cardBrand || null,
      ip_address: data.ipAddress || null,
      device_id: data.deviceId || null,
      stripe_payment_intent_id: data.stripePaymentIntentId || null,
      stripe_charge_id: data.stripeChargeId || null,
      block_reason: data.blockReason || 'unknown',
      risk_level: data.riskLevel || 'highest',
      risk_score: data.riskScore || 100,
      country_code: data.countryCode || null,
      is_high_risk_region: data.countryCode ? FRAUD_SIGNALS_CONFIG.HIGH_RISK_REGIONS.includes(data.countryCode) : false,
      metadata: data.metadata || {}
    });

    await upsertFraudSignal(db, {
      userId: data.userId, email: data.email, cardFingerprint: data.cardFingerprint,
      ipAddress: data.ipAddress, deviceId: data.deviceId, incrementAttempts: true,
      metadata: { lastBlockedPayment: data.stripePaymentIntentId, lastBlockReason: data.blockReason }
    });

    const fraudSignal = await getFraudSignal(db, data.userId, data.email);
    if (fraudSignal && fraudSignal.attempts >= FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN) {
      await blockUser(db, data.userId, data.email, {
        reason: `Auto-blocked after ${fraudSignal.attempts} blocked payment attempts`,
        cardFingerprint: data.cardFingerprint, cardLast4: data.cardLast4, cardBrand: data.cardBrand,
        ipAddress: data.ipAddress, blockedPaymentId: data.stripePaymentIntentId
      });
    }

    return { success: true, attempts: fraudSignal?.attempts || 1 };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function blockUser(db, userId, email, options = {}) {
  try {
    const supabase = db || getSupabase();

    const existing = await getFraudSignal(db, userId, email);
    let temporaryBlockCount = (existing?.temporary_block_count || 0) + 1;

    let blockType = 'temporary';
    let blockExpiresAt = new Date(Date.now() + FRAUD_SIGNALS_CONFIG.TEMPORARY_BLOCK_DURATION_MS);

    if (temporaryBlockCount >= FRAUD_SIGNALS_CONFIG.MAX_TEMPORARY_BLOCKS_BEFORE_PERMANENT || options.permanent) {
      blockType = 'permanent';
      blockExpiresAt = null;
    }

    const blockData = {
      user_id: userId || null,
      email: email?.toLowerCase() || null,
      email_hash: email ? hashEmail(email) : null,
      blocked: true,
      block_type: blockType,
      blocked_at: new Date().toISOString(),
      block_expires_at: blockType === 'temporary' ? blockExpiresAt.toISOString() : null,
      block_reason: options.reason || 'Blocked due to suspicious activity',
      temporary_block_count: temporaryBlockCount,
      updated_at: new Date().toISOString()
    };

    if (existing) {
      await supabase.from('fraud_signals').update(blockData).eq('id', existing.id);
    } else {
      await supabase.from('fraud_signals').insert(blockData);
    }

    await supabase.from('fraud_blocklist').insert({
      user_id: userId || null,
      email: email?.toLowerCase() || null,
      card_fingerprint: options.cardFingerprint || null,
      reason: options.reason || 'Auto-blocked due to suspicious activity',
      active: true,
      is_active: true,
      block_type: blockType,
      expires_at: blockType === 'temporary' ? blockExpiresAt.toISOString() : null,
      created_by: options.createdBy || 'fraud_signals_system',
      metadata: { blocked_payment_id: options.blockedPaymentId, temporary_block_count: temporaryBlockCount }
    });

    if (options.cardFingerprint) {
      await supabase.from('fraud_blocklist').upsert({
        id: `card_${options.cardFingerprint}`,
        card_fingerprint: options.cardFingerprint,
        card_last4: options.cardLast4 || null,
        card_brand: options.cardBrand || null,
        reason: `Card blocked: ${options.reason || 'Suspicious activity'}`,
        active: true,
        is_active: true,
        block_type: 'permanent',
        created_by: 'fraud_signals_system',
        related_user_id: userId || null,
        related_email: email?.toLowerCase() || null
      });
    }

    return { success: true, blockType, blockExpiresAt: blockType === 'temporary' ? blockExpiresAt.toISOString() : null, temporaryBlockCount };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function checkUserBlocked(db, userId, email, cardFingerprint = null, ipAddress = null) {
  try {
    const supabase = db || getSupabase();
    const fraudSignal = await getFraudSignal(db, userId, email);

    if (fraudSignal && fraudSignal.blocked) {
      if (fraudSignal.block_type === 'temporary' && fraudSignal.block_expires_at) {
        const expiryDate = new Date(fraudSignal.block_expires_at);
        if (new Date() > expiryDate) {
          await unblockUser(db, userId, email);
          return { blocked: false, wasTemporarilyBlocked: true, message: 'Your temporary block has expired.' };
        }
        const remainingMs = expiryDate.getTime() - Date.now();
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
        return {
          blocked: true, blockType: 'temporary',
          reason: fraudSignal.block_reason || 'Your account has been temporarily blocked.',
          expiresAt: expiryDate.toISOString(), remainingHours, canContactSupport: true,
          supportMessage: `Your account is temporarily blocked for ${remainingHours} more hour(s).`
        };
      }
      return {
        blocked: true, blockType: 'permanent',
        reason: fraudSignal.block_reason || 'Your account has been blocked.',
        canContactSupport: true,
        supportMessage: 'Your account has been permanently blocked. Please contact support.'
      };
    }

    if (cardFingerprint) {
      const { data } = await supabase.from('fraud_blocklist').select('id').eq('card_fingerprint', cardFingerprint).eq('active', true).limit(1);
      if (data && data.length > 0) {
        return { blocked: true, blockType: 'card_blocked', reason: 'This payment method has been blocked.', canContactSupport: true };
      }
    }

    if (ipAddress) {
      const { data } = await supabase.from('fraud_blocklist').select('id').eq('ip_address', ipAddress).eq('active', true).limit(1);
      if (data && data.length > 0) {
        return { blocked: true, blockType: 'ip_blocked', reason: 'Access from your location has been restricted.', canContactSupport: true };
      }
    }

    return { blocked: false };
  } catch (error) { return { blocked: false, error: error.message }; }
}

export async function unblockUser(db, userId, email) {
  try {
    const supabase = db || getSupabase();

    const existing = await getFraudSignal(db, userId, email);
    if (existing) {
      await supabase.from('fraud_signals').update({
        blocked: false, block_type: null, block_expires_at: null,
        unblocked_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', existing.id);
    }

    // Deactivate user-based blocklist entries (keep card blocks)
    if (userId) {
      const { data: blocklistEntries } = await supabase
        .from('fraud_blocklist')
        .select('id, card_fingerprint')
        .eq('user_id', userId)
        .eq('active', true);

      for (const entry of (blocklistEntries || [])) {
        if (!entry.card_fingerprint) {
          await supabase.from('fraud_blocklist').update({ active: false, is_active: false, deactivated_at: new Date().toISOString() }).eq('id', entry.id);
        }
      }
    }

    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function getFraudStats(db, userId, email) {
  try {
    const fraudSignal = await getFraudSignal(db, userId, email);
    if (!fraudSignal) {
      return { attempts: 0, blocked: false, cardFingerprints: [], ips: [], riskLevel: 'low' };
    }
    let riskLevel = 'low';
    if (fraudSignal.attempts >= FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN) riskLevel = 'critical';
    else if (fraudSignal.attempts >= 3) riskLevel = 'high';
    else if (fraudSignal.attempts >= 1) riskLevel = 'medium';

    return {
      attempts: fraudSignal.attempts || 0,
      blocked: fraudSignal.blocked || false,
      blockType: fraudSignal.block_type,
      blockExpiresAt: fraudSignal.block_expires_at,
      temporaryBlockCount: fraudSignal.temporary_block_count || 0,
      cardFingerprints: fraudSignal.card_fingerprints || [],
      ips: fraudSignal.ips || [],
      deviceIds: fraudSignal.device_ids || [],
      lastAttemptAt: fraudSignal.last_attempt_at,
      riskLevel
    };
  } catch (error) { return null; }
}

export async function syncToStripeRadar(db, stripe) {
  try {
    const supabase = db || getSupabase();
    const lists = await stripe.radar.valueLists.list({ limit: 100 });
    let blocklist = lists.data.find(list => list.alias === 'fraud_card_fingerprints' || list.name === 'Fraud Card Fingerprints');

    if (!blocklist) {
      blocklist = await stripe.radar.valueLists.create({
        alias: 'fraud_card_fingerprints', name: 'Fraud Card Fingerprints', item_type: 'card_fingerprint'
      });
    }

    const { data: signals } = await supabase.from('fraud_signals').select('*').eq('blocked', true);
    let synced = 0, skipped = 0;

    for (const signal of (signals || [])) {
      if (signal.card_fingerprints?.length > 0) {
        for (const fingerprint of signal.card_fingerprints) {
          try {
            await stripe.radar.valueListItems.create({ value_list: blocklist.id, value: fingerprint });
            synced++;
          } catch (err) {
            if (err.code === 'resource_already_exists') skipped++;
          }
        }
      }
    }

    const { data: blocklistEntries } = await supabase.from('fraud_blocklist').select('*').eq('active', true);
    for (const entry of (blocklistEntries || [])) {
      if (entry.card_fingerprint) {
        try {
          await stripe.radar.valueListItems.create({ value_list: blocklist.id, value: entry.card_fingerprint });
          synced++;
          await supabase.from('fraud_blocklist').update({ stripe_synced_at: new Date().toISOString(), stripe_radar_list_id: blocklist.id }).eq('id', entry.id);
        } catch (err) {
          if (err.code === 'resource_already_exists') skipped++;
        }
      }
    }

    return { success: true, synced, skipped };
  } catch (error) { return { success: false, error: error.message }; }
}

export async function submitBlockAppeal(db, data) {
  try {
    const supabase = db || getSupabase();
    const { data: result, error } = await supabase
      .from('fraud_appeals')
      .insert({
        user_id: data.userId || null,
        email: data.email?.toLowerCase() || null,
        contact_email: data.contactEmail?.toLowerCase() || data.email?.toLowerCase() || null,
        contact_phone: data.contactPhone || null,
        reason: data.reason || 'Request to unblock account',
        additional_info: data.additionalInfo || null,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, appealId: result.id };
  } catch (error) { return { success: false, error: error.message }; }
}

export function analyzeIpRisk(ipAddress, countryCode = null) {
  const riskFactors = [];
  let riskScore = 0;

  if (countryCode && FRAUD_SIGNALS_CONFIG.HIGH_RISK_REGIONS.includes(countryCode)) {
    riskFactors.push('high_risk_region');
    riskScore += 30;
  }

  if (ipAddress) {
    const firstOctet = parseInt(ipAddress.split('.')[0]);
    if ([5, 45, 46, 91, 92, 93, 94, 95, 178, 185, 188, 193, 195, 213].includes(firstOctet)) {
      riskFactors.push('potential_vpn_datacenter');
      riskScore += 15;
    }
  }

  return { riskScore, riskFactors, isHighRisk: riskScore >= FRAUD_SIGNALS_CONFIG.RISK_THRESHOLDS.MEDIUM };
}
