/**
 * Fraud Signals Service
 * 
 * Enhanced fraud prevention that tracks:
 * - User fraud attempts with device fingerprints, IPs, card fingerprints
 * - Auto-blocking after threshold violations
 * - Stripe Radar integration
 * - Temporary blocks with support contact option
 * 
 * Collection: fraudSignals
 * Document ID = userId or email hash (for guest users)
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  increment,
  arrayUnion
} from 'firebase/firestore';

/**
 * Configuration
 */
export const FRAUD_SIGNALS_CONFIG = {
  // Number of blocked payments before auto-blocking user
  MAX_BLOCKED_ATTEMPTS_BEFORE_BAN: 5,
  // Temporary block duration (24 hours in milliseconds)
  TEMPORARY_BLOCK_DURATION_MS: 24 * 60 * 60 * 1000,
  // Permanent block after this many temporary blocks
  MAX_TEMPORARY_BLOCKS_BEFORE_PERMANENT: 3,
  // Reset attempt counter after this many hours of no activity
  ATTEMPT_RESET_HOURS: 24,
  // High risk regions (ISO 3166-1 alpha-2 country codes)
  HIGH_RISK_REGIONS: ['AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'EG', 'JO', 'LB', 'IQ', 'SY', 'YE'],
  // Risk score thresholds
  RISK_THRESHOLDS: {
    LOW: 25,
    MEDIUM: 50,
    HIGH: 75,
    CRITICAL: 90
  }
};

/**
 * Get fraud signal document for a user
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID (required if authenticated)
 * @param {string} email - Email (fallback for guest users)
 * @returns {Promise<Object|null>} Fraud signal document or null
 */
export async function getFraudSignal(db, userId, email) {
  try {
    // Try userId first
    if (userId) {
      const docRef = doc(db, 'fraudSignals', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    }

    // Try email hash
    if (email) {
      const emailHash = hashEmail(email);
      const docRef = doc(db, 'fraudSignals', emailHash);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Create or update fraud signal document
 * @param {Object} db - Firestore database instance
 * @param {Object} data - Fraud signal data
 */
export async function upsertFraudSignal(db, data) {
  try {
    const docId = data.userId || hashEmail(data.email);
    const docRef = doc(db, 'fraudSignals', docId);
    const existingDoc = await getDoc(docRef);

    if (existingDoc.exists()) {
      // Update existing document
      const updateData = {
        lastAttemptAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Add new card fingerprint if provided
      if (data.cardFingerprint) {
        updateData.cardFingerprints = arrayUnion(data.cardFingerprint);
      }

      // Add new IP if provided
      if (data.ipAddress) {
        updateData.ips = arrayUnion(data.ipAddress);
      }

      // Add device info if provided
      if (data.deviceId) {
        updateData.deviceIds = arrayUnion(data.deviceId);
      }

      // Increment attempts if this is a new blocked/failed payment
      if (data.incrementAttempts) {
        updateData.attempts = increment(1);
      }

      await updateDoc(docRef, updateData);
    } else {
      // Create new document
      const newDoc = {
        userId: data.userId || null,
        email: data.email?.toLowerCase() || null,
        emailHash: data.email ? hashEmail(data.email) : null,
        cardFingerprints: data.cardFingerprint ? [data.cardFingerprint] : [],
        ips: data.ipAddress ? [data.ipAddress] : [],
        deviceIds: data.deviceId ? [data.deviceId] : [],
        attempts: data.incrementAttempts ? 1 : 0,
        blocked: false,
        blockType: null, // 'temporary' | 'permanent'
        blockedAt: null,
        blockExpiresAt: null,
        temporaryBlockCount: 0,
        lastAttemptAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: data.metadata || {}
      };

      await setDoc(docRef, newDoc);
    }

    return { success: true, docId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Record a blocked payment from Stripe
 * @param {Object} db - Firestore database instance
 * @param {Object} data - Payment data from webhook
 */
export async function recordBlockedPayment(db, data) {
  try {
    const {
      userId,
      email,
      cardFingerprint,
      cardLast4,
      cardBrand,
      ipAddress,
      deviceId,
      stripePaymentIntentId,
      stripeChargeId,
      blockReason,
      riskLevel,
      riskScore,
      countryCode,
      metadata
    } = data;

    // 1. Log to fraud_blocked_payments collection
    const blockedPaymentRef = doc(db, 'fraud_blocked_payments', stripePaymentIntentId || `blocked_${Date.now()}`);
    await setDoc(blockedPaymentRef, {
      userId: userId || null,
      email: email?.toLowerCase() || null,
      cardFingerprint: cardFingerprint || null,
      cardLast4: cardLast4 || null,
      cardBrand: cardBrand || null,
      ipAddress: ipAddress || null,
      deviceId: deviceId || null,
      stripePaymentIntentId: stripePaymentIntentId || null,
      stripeChargeId: stripeChargeId || null,
      blockReason: blockReason || 'unknown',
      riskLevel: riskLevel || 'highest',
      riskScore: riskScore || 100,
      countryCode: countryCode || null,
      isHighRiskRegion: countryCode ? FRAUD_SIGNALS_CONFIG.HIGH_RISK_REGIONS.includes(countryCode) : false,
      createdAt: serverTimestamp(),
      metadata: metadata || {}
    });

    // 2. Update/create fraud signal for user
    await upsertFraudSignal(db, {
      userId,
      email,
      cardFingerprint,
      ipAddress,
      deviceId,
      incrementAttempts: true,
      metadata: {
        lastBlockedPayment: stripePaymentIntentId,
        lastBlockReason: blockReason
      }
    });

    // 3. Check if user should be blocked
    const fraudSignal = await getFraudSignal(db, userId, email);
    
    if (fraudSignal && fraudSignal.attempts >= FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN) {
      // Auto-block the user
      await blockUser(db, userId, email, {
        reason: `Auto-blocked after ${fraudSignal.attempts} blocked payment attempts`,
        cardFingerprint,
        cardLast4,
        cardBrand,
        ipAddress,
        blockedPaymentId: stripePaymentIntentId
      });

    }

    return { success: true, attempts: fraudSignal?.attempts || 1 };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Block a user (temporary or permanent)
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} email - Email
 * @param {Object} options - Block options
 */
export async function blockUser(db, userId, email, options = {}) {
  try {
    const docId = userId || hashEmail(email);
    const docRef = doc(db, 'fraudSignals', docId);
    const existingDoc = await getDoc(docRef);

    let blockType = 'temporary';
    let blockExpiresAt = new Date(Date.now() + FRAUD_SIGNALS_CONFIG.TEMPORARY_BLOCK_DURATION_MS);
    let temporaryBlockCount = 1;

    if (existingDoc.exists()) {
      const data = existingDoc.data();
      temporaryBlockCount = (data.temporaryBlockCount || 0) + 1;

      // Upgrade to permanent block after multiple temporary blocks
      if (temporaryBlockCount >= FRAUD_SIGNALS_CONFIG.MAX_TEMPORARY_BLOCKS_BEFORE_PERMANENT || options.permanent) {
        blockType = 'permanent';
        blockExpiresAt = null;
      }
    }

    // Update fraud signal document
    await setDoc(docRef, {
      userId: userId || null,
      email: email?.toLowerCase() || null,
      emailHash: email ? hashEmail(email) : null,
      blocked: true,
      blockType,
      blockedAt: serverTimestamp(),
      blockExpiresAt: blockType === 'temporary' ? Timestamp.fromDate(blockExpiresAt) : null,
      blockReason: options.reason || 'Blocked due to suspicious activity',
      temporaryBlockCount,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Add to fraud_blocklist for immediate blocking
    const blocklistRef = doc(db, 'fraud_blocklist', `block_${docId}_${Date.now()}`);
    await setDoc(blocklistRef, {
      userId: userId || null,
      email: email?.toLowerCase() || null,
      cardFingerprint: options.cardFingerprint || null,
      cardLast4: options.cardLast4 || null,
      cardBrand: options.cardBrand || null,
      ipAddress: options.ipAddress || null,
      reason: options.reason || 'Auto-blocked due to suspicious activity',
      active: true,
      blockType,
      expiresAt: blockType === 'temporary' ? Timestamp.fromDate(blockExpiresAt) : null,
      createdAt: serverTimestamp(),
      createdBy: options.createdBy || 'fraud_signals_system',
      metadata: {
        blockedPaymentId: options.blockedPaymentId,
        temporaryBlockCount
      }
    });

    // If card fingerprint provided, add separate card block
    if (options.cardFingerprint) {
      const cardBlockRef = doc(db, 'fraud_blocklist', `card_${options.cardFingerprint}`);
      await setDoc(cardBlockRef, {
        cardFingerprint: options.cardFingerprint,
        cardLast4: options.cardLast4 || null,
        cardBrand: options.cardBrand || null,
        reason: `Card blocked: ${options.reason || 'Suspicious activity'}`,
        active: true,
        blockType: 'permanent', // Cards are always permanently blocked
        createdAt: serverTimestamp(),
        createdBy: 'fraud_signals_system',
        relatedUserId: userId || null,
        relatedEmail: email?.toLowerCase() || null
      });
    }


    return { 
      success: true, 
      blockType, 
      blockExpiresAt: blockType === 'temporary' ? blockExpiresAt.toISOString() : null,
      temporaryBlockCount
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Check if user is blocked (enhanced check with expiry handling)
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} email - Email
 * @param {string} cardFingerprint - Optional card fingerprint
 * @param {string} ipAddress - Optional IP address
 * @returns {Promise<Object>} Block status
 */
export async function checkUserBlocked(db, userId, email, cardFingerprint = null, ipAddress = null) {
  try {
    // 1. Check fraud signals document
    const fraudSignal = await getFraudSignal(db, userId, email);
    
    if (fraudSignal && fraudSignal.blocked) {
      // Check if temporary block has expired
      if (fraudSignal.blockType === 'temporary' && fraudSignal.blockExpiresAt) {
        const expiryDate = fraudSignal.blockExpiresAt.toDate ? 
          fraudSignal.blockExpiresAt.toDate() : 
          new Date(fraudSignal.blockExpiresAt);
        
        if (new Date() > expiryDate) {
          // Block has expired - unblock user
          await unblockUser(db, userId, email);
          return {
            blocked: false,
            wasTemporarilyBlocked: true,
            message: 'Your temporary block has expired. You can now make purchases.'
          };
        }

        // Still blocked temporarily
        const remainingMs = expiryDate.getTime() - Date.now();
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));

        return {
          blocked: true,
          blockType: 'temporary',
          reason: fraudSignal.blockReason || 'Your account has been temporarily blocked due to suspicious activity.',
          expiresAt: expiryDate.toISOString(),
          remainingHours,
          canContactSupport: true,
          supportMessage: `Your account is temporarily blocked for ${remainingHours} more hour(s). If you believe this is an error, please contact our support team.`
        };
      }

      // Permanent block
      return {
        blocked: true,
        blockType: 'permanent',
        reason: fraudSignal.blockReason || 'Your account has been blocked due to suspicious activity.',
        canContactSupport: true,
        supportMessage: 'Your account has been permanently blocked. Please contact our support team if you believe this is an error.'
      };
    }

    // 2. Check card fingerprint blocklist
    if (cardFingerprint) {
      const cardBlockRef = doc(db, 'fraud_blocklist', `card_${cardFingerprint}`);
      const cardBlockSnap = await getDoc(cardBlockRef);
      
      if (cardBlockSnap.exists() && cardBlockSnap.data().active) {
        return {
          blocked: true,
          blockType: 'card_blocked',
          reason: 'This payment method has been blocked due to suspicious activity.',
          canContactSupport: true,
          supportMessage: 'This card cannot be used. Please use a different payment method or contact support.'
        };
      }
    }

    // 3. Check IP blocklist
    if (ipAddress) {
      const ipBlocksQuery = query(
        collection(db, 'fraud_blocklist'),
        where('ipAddress', '==', ipAddress),
        where('active', '==', true)
      );
      const ipBlocksSnap = await getDocs(ipBlocksQuery);
      
      if (!ipBlocksSnap.empty) {
        return {
          blocked: true,
          blockType: 'ip_blocked',
          reason: 'Access from your location has been restricted.',
          canContactSupport: true,
          supportMessage: 'Please contact support if you believe this is an error.'
        };
      }
    }

    // Not blocked
    return { blocked: false };
  } catch (error) {
    // Fail open but log
    return { blocked: false, error: error.message };
  }
}

/**
 * Unblock a user
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} email - Email
 */
export async function unblockUser(db, userId, email) {
  try {
    const docId = userId || hashEmail(email);
    const docRef = doc(db, 'fraudSignals', docId);

    await updateDoc(docRef, {
      blocked: false,
      blockType: null,
      blockExpiresAt: null,
      unblockedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Deactivate related blocklist entries (but keep cards blocked)
    const blocklistQuery = query(
      collection(db, 'fraud_blocklist'),
      where('userId', '==', userId || null),
      where('active', '==', true)
    );
    const blocklistSnap = await getDocs(blocklistQuery);

    for (const docSnap of blocklistSnap.docs) {
      const data = docSnap.data();
      // Don't unblock card-based blocks
      if (!data.cardFingerprint) {
        await updateDoc(docSnap.ref, {
          active: false,
          deactivatedAt: serverTimestamp()
        });
      }
    }


    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Get fraud statistics for a user
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} email - Email
 */
export async function getFraudStats(db, userId, email) {
  try {
    const fraudSignal = await getFraudSignal(db, userId, email);
    
    if (!fraudSignal) {
      return {
        attempts: 0,
        blocked: false,
        cardFingerprints: [],
        ips: [],
        riskLevel: 'low'
      };
    }

    // Calculate risk level
    let riskLevel = 'low';
    if (fraudSignal.attempts >= FRAUD_SIGNALS_CONFIG.MAX_BLOCKED_ATTEMPTS_BEFORE_BAN) {
      riskLevel = 'critical';
    } else if (fraudSignal.attempts >= 3) {
      riskLevel = 'high';
    } else if (fraudSignal.attempts >= 1) {
      riskLevel = 'medium';
    }

    return {
      attempts: fraudSignal.attempts || 0,
      blocked: fraudSignal.blocked || false,
      blockType: fraudSignal.blockType,
      blockExpiresAt: fraudSignal.blockExpiresAt,
      temporaryBlockCount: fraudSignal.temporaryBlockCount || 0,
      cardFingerprints: fraudSignal.cardFingerprints || [],
      ips: fraudSignal.ips || [],
      deviceIds: fraudSignal.deviceIds || [],
      lastAttemptAt: fraudSignal.lastAttemptAt,
      riskLevel
    };
  } catch (error) {
    return null;
  }
}

/**
 * Sync blocked cards to Stripe Radar
 * @param {Object} db - Firestore database instance
 * @param {Object} stripe - Stripe instance
 */
export async function syncToStripeRadar(db, stripe) {
  try {

    // Get or create Stripe Radar blocklist
    const lists = await stripe.radar.valueLists.list({ limit: 100 });
    let blocklist = lists.data.find(list => 
      list.alias === 'fraud_card_fingerprints' || 
      list.name === 'Fraud Card Fingerprints'
    );

    if (!blocklist) {
      blocklist = await stripe.radar.valueLists.create({
        alias: 'fraud_card_fingerprints',
        name: 'Fraud Card Fingerprints',
        item_type: 'card_fingerprint',
      });
    }

    // Get all fraud signals with card fingerprints
    const fraudSignalsRef = collection(db, 'fraudSignals');
    const signalsSnap = await getDocs(fraudSignalsRef);

    let synced = 0;
    let skipped = 0;

    for (const docSnap of signalsSnap.docs) {
      const data = docSnap.data();
      
      if (data.blocked && data.cardFingerprints && data.cardFingerprints.length > 0) {
        for (const fingerprint of data.cardFingerprints) {
          try {
            await stripe.radar.valueListItems.create({
              value_list: blocklist.id,
              value: fingerprint,
            });
            synced++;
          } catch (err) {
            if (err.code === 'resource_already_exists') {
              skipped++;
            } else {
            }
          }
        }
      }
    }

    // Also sync from fraud_blocklist
    const blocklistRef = collection(db, 'fraud_blocklist');
    const blocklistQuery = query(blocklistRef, where('active', '==', true));
    const blocklistSnap = await getDocs(blocklistQuery);

    for (const docSnap of blocklistSnap.docs) {
      const data = docSnap.data();
      
      if (data.cardFingerprint) {
        try {
          await stripe.radar.valueListItems.create({
            value_list: blocklist.id,
            value: data.cardFingerprint,
          });
          synced++;

          // Mark as synced
          await updateDoc(docSnap.ref, {
            stripeSyncedAt: serverTimestamp(),
            stripeRadarListId: blocklist.id
          });
        } catch (err) {
          if (err.code === 'resource_already_exists') {
            skipped++;
          } else {
            console.error(`❌ Failed to add ${data.cardFingerprint}:`, err.message);
          }
        }
      }
    }


    return { success: true, synced, skipped };
  } catch (error) {
    console.error('Error syncing to Stripe Radar:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit support request for blocked user
 * @param {Object} db - Firestore database instance
 * @param {Object} data - Support request data
 */
export async function submitBlockAppeal(db, data) {
  try {
    const {
      userId,
      email,
      reason,
      contactEmail,
      contactPhone,
      additionalInfo
    } = data;

    const appealRef = doc(db, 'fraud_appeals', `appeal_${Date.now()}`);
    await setDoc(appealRef, {
      userId: userId || null,
      email: email?.toLowerCase() || null,
      contactEmail: contactEmail?.toLowerCase() || email?.toLowerCase() || null,
      contactPhone: contactPhone || null,
      reason: reason || 'Request to unblock account',
      additionalInfo: additionalInfo || null,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });


    return { success: true, appealId: appealRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper: Hash email for document ID
 */
function hashEmail(email) {
  if (!email) return null;
  const normalizedEmail = email.toLowerCase().trim();
  // Simple hash for document ID
  let hash = 0;
  for (let i = 0; i < normalizedEmail.length; i++) {
    const char = normalizedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `email_${Math.abs(hash).toString(36)}`;
}

/**
 * Analyze IP for risk factors
 * @param {string} ipAddress - IP address to analyze
 * @returns {Object} Risk analysis
 */
export function analyzeIpRisk(ipAddress, countryCode = null) {
  const riskFactors = [];
  let riskScore = 0;

  if (countryCode && FRAUD_SIGNALS_CONFIG.HIGH_RISK_REGIONS.includes(countryCode)) {
    riskFactors.push('high_risk_region');
    riskScore += 30;
  }

  // Check for VPN/proxy patterns (common VPN IP ranges - simplified)
  // In production, use a proper IP reputation service
  if (ipAddress) {
    const ipParts = ipAddress.split('.');
    // Example: Check for common datacenter/VPN ranges
    const firstOctet = parseInt(ipParts[0]);
    if ([5, 45, 46, 91, 92, 93, 94, 95, 178, 185, 188, 193, 195, 213].includes(firstOctet)) {
      riskFactors.push('potential_vpn_datacenter');
      riskScore += 15;
    }
  }

  return {
    riskScore,
    riskFactors,
    isHighRisk: riskScore >= FRAUD_SIGNALS_CONFIG.RISK_THRESHOLDS.MEDIUM
  };
}
