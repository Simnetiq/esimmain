/**
 * Fraud Detection Service
 * 
 * Implements fraud prevention rules:
 * - Limit 3 purchases per user per day
 * - Track credit card usage patterns
 * - Detect suspicious activity patterns
 */

import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc, 
  getDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

/**
 * Configuration
 */
const FRAUD_RULES = {
  MAX_PURCHASES_PER_USER_PER_DAY: 3,
  MAX_PURCHASES_PER_CARD_PER_DAY: 5,
  MAX_PURCHASES_PER_EMAIL_PER_DAY: 3,
  MAX_FAILED_ATTEMPTS_PER_HOUR: 5,
  SUSPICIOUS_AMOUNT_THRESHOLD: 1000, // USD equivalent
  TIME_WINDOW_HOURS: 24,
  RAPID_PURCHASE_WINDOW_MINUTES: 5, // Flag if multiple purchases in 5 minutes
};

/**
 * Check if user has exceeded purchase limits
 * @param {Object} db - Firestore database instance
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @param {Object} metadata - Additional metadata (paymentMethodId, amount, etc.)
 * @returns {Promise<Object>} - { allowed: boolean, reason: string, riskScore: number }
 */
export async function checkFraudRules(db, userId, email, metadata = {}) {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const last5Minutes = new Date(now.getTime() - 5 * 60 * 1000);

    let riskScore = 0;
    const riskFactors = [];

    // 1. Check user purchase count (if userId provided)
    if (userId) {
      const userPurchaseCount = await getUserPurchaseCount(db, userId, last24Hours);
      
      if (userPurchaseCount >= FRAUD_RULES.MAX_PURCHASES_PER_USER_PER_DAY) {
        return {
          allowed: false,
          reason: `Daily purchase limit exceeded. Maximum ${FRAUD_RULES.MAX_PURCHASES_PER_USER_PER_DAY} purchases per day allowed.`,
          riskScore: 100,
          blockedBy: 'user_daily_limit'
        };
      }

      if (userPurchaseCount >= 2) {
        riskScore += 20;
        riskFactors.push('multiple_purchases_today');
      }

      // Check for rapid purchases
      const rapidPurchases = await getUserPurchaseCount(db, userId, last5Minutes);
      if (rapidPurchases > 0) {
        riskScore += 30;
        riskFactors.push('rapid_purchase_attempt');
      }
    }

    // 2. Check email purchase count (always check, even for guest checkouts)
    if (email) {
      const emailPurchaseCount = await getEmailPurchaseCount(db, email, last24Hours);
      
      if (emailPurchaseCount >= FRAUD_RULES.MAX_PURCHASES_PER_EMAIL_PER_DAY) {
        return {
          allowed: false,
          reason: `Daily purchase limit exceeded for this email. Maximum ${FRAUD_RULES.MAX_PURCHASES_PER_EMAIL_PER_DAY} purchases per day allowed.`,
          riskScore: 100,
          blockedBy: 'email_daily_limit'
        };
      }

      if (emailPurchaseCount >= 2) {
        riskScore += 15;
        riskFactors.push('multiple_email_purchases');
      }
    }

    // 3. Check credit card fingerprint (if provided)
    if (metadata.paymentMethodFingerprint) {
      const cardPurchaseCount = await getCardPurchaseCount(
        db, 
        metadata.paymentMethodFingerprint, 
        last24Hours
      );

      if (cardPurchaseCount >= FRAUD_RULES.MAX_PURCHASES_PER_CARD_PER_DAY) {
        return {
          allowed: false,
          reason: 'This payment method has exceeded daily transaction limits. Please use a different payment method or try again tomorrow.',
          riskScore: 100,
          blockedBy: 'card_daily_limit'
        };
      }

      if (cardPurchaseCount >= 3) {
        riskScore += 25;
        riskFactors.push('frequent_card_usage');
      }
    }

    // 4. Check for failed payment attempts
    if (userId || email) {
      const failedAttempts = await getFailedAttempts(db, userId, email, lastHour);
      
      if (failedAttempts >= FRAUD_RULES.MAX_FAILED_ATTEMPTS_PER_HOUR) {
        return {
          allowed: false,
          reason: 'Too many failed payment attempts. Please wait an hour before trying again.',
          riskScore: 100,
          blockedBy: 'failed_attempts_limit'
        };
      }

      if (failedAttempts >= 2) {
        riskScore += 20;
        riskFactors.push('recent_failed_attempts');
      }
    }

    // 5. Check amount threshold
    if (metadata.amount && metadata.amount >= FRAUD_RULES.SUSPICIOUS_AMOUNT_THRESHOLD) {
      riskScore += 15;
      riskFactors.push('high_value_transaction');
    }

    // 6. Check for new account making large purchase
    if (userId && metadata.accountAge) {
      const accountAgeHours = (now - metadata.accountAge) / (1000 * 60 * 60);
      if (accountAgeHours < 1 && metadata.amount > 100) {
        riskScore += 25;
        riskFactors.push('new_account_large_purchase');
      }
    }

    // Calculate final decision
    const requiresReview = riskScore >= 50 && riskScore < 100;
    const allowed = riskScore < 100;

    return {
      allowed,
      requiresReview,
      riskScore,
      riskFactors,
      reason: allowed 
        ? 'Transaction approved' 
        : 'Transaction blocked due to fraud detection rules'
    };

  } catch (error) {
    console.error('Fraud check error:', error);
    // On error, allow transaction but log for review
    return {
      allowed: true,
      requiresReview: true,
      riskScore: 0,
      error: error.message,
      reason: 'Fraud check failed - allowing transaction with review flag'
    };
  }
}

/**
 * Get user purchase count in time window
 */
async function getUserPurchaseCount(db, userId, startTime) {
  try {
    const purchasesRef = collection(db, 'fraud_tracking_purchases');
    const q = query(
      purchasesRef,
      where('userId', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(startTime)),
      where('status', 'in', ['completed', 'pending'])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting user purchase count:', error);
    return 0;
  }
}

/**
 * Get email purchase count in time window
 */
async function getEmailPurchaseCount(db, email, startTime) {
  try {
    const purchasesRef = collection(db, 'fraud_tracking_purchases');
    const q = query(
      purchasesRef,
      where('email', '==', email.toLowerCase()),
      where('createdAt', '>=', Timestamp.fromDate(startTime)),
      where('status', 'in', ['completed', 'pending'])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting email purchase count:', error);
    return 0;
  }
}

/**
 * Get card purchase count in time window
 */
async function getCardPurchaseCount(db, cardFingerprint, startTime) {
  try {
    const purchasesRef = collection(db, 'fraud_tracking_purchases');
    const q = query(
      purchasesRef,
      where('paymentMethodFingerprint', '==', cardFingerprint),
      where('createdAt', '>=', Timestamp.fromDate(startTime)),
      where('status', 'in', ['completed', 'pending'])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting card purchase count:', error);
    return 0;
  }
}

/**
 * Get failed payment attempts in time window
 */
async function getFailedAttempts(db, userId, email, startTime) {
  try {
    const attemptsRef = collection(db, 'fraud_tracking_attempts');
    const queries = [];

    if (userId) {
      const q1 = query(
        attemptsRef,
        where('userId', '==', userId),
        where('status', '==', 'failed'),
        where('createdAt', '>=', Timestamp.fromDate(startTime))
      );
      queries.push(getDocs(q1));
    }

    if (email) {
      const q2 = query(
        attemptsRef,
        where('email', '==', email.toLowerCase()),
        where('status', '==', 'failed'),
        where('createdAt', '>=', Timestamp.fromDate(startTime))
      );
      queries.push(getDocs(q2));
    }

    const results = await Promise.all(queries);
    return results.reduce((total, snapshot) => total + snapshot.size, 0);
  } catch (error) {
    console.error('Error getting failed attempts:', error);
    return 0;
  }
}

/**
 * Track purchase attempt for fraud detection
 * Call this BEFORE processing payment
 */
export async function trackPurchaseAttempt(db, data) {
  try {
    const attemptId = `attempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attemptRef = doc(db, 'fraud_tracking_attempts', attemptId);
    
    await setDoc(attemptRef, {
      userId: data.userId || null,
      email: data.email?.toLowerCase() || null,
      amount: data.amount || 0,
      currency: data.currency || 'usd',
      paymentMethodFingerprint: data.paymentMethodFingerprint || null,
      status: 'pending',
      createdAt: serverTimestamp(),
      metadata: data.metadata || {}
    });

    return attemptId;
  } catch (error) {
    console.error('Error tracking purchase attempt:', error);
    return null;
  }
}

/**
 * Track completed purchase for fraud detection
 * Call this AFTER successful payment
 */
export async function trackCompletedPurchase(db, data) {
  try {
    const purchaseId = data.orderId || `purchase_${Date.now()}`;
    const purchaseRef = doc(db, 'fraud_tracking_purchases', purchaseId);
    
    await setDoc(purchaseRef, {
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
      createdAt: serverTimestamp(),
      metadata: data.metadata || {}
    });

    // Update attempt status if attemptId provided
    if (data.attemptId) {
      const attemptRef = doc(db, 'fraud_tracking_attempts', data.attemptId);
      await setDoc(attemptRef, {
        status: 'completed',
        orderId: data.orderId,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    return purchaseId;
  } catch (error) {
    console.error('Error tracking completed purchase:', error);
    return null;
  }
}

/**
 * Track failed purchase for fraud detection
 * Call this AFTER failed payment
 */
export async function trackFailedPurchase(db, data) {
  try {
    if (data.attemptId) {
      const attemptRef = doc(db, 'fraud_tracking_attempts', data.attemptId);
      await setDoc(attemptRef, {
        status: 'failed',
        failureReason: data.failureReason || 'unknown',
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    return true;
  } catch (error) {
    console.error('Error tracking failed purchase:', error);
    return false;
  }
}

/**
 * Get fraud statistics for a user (for admin dashboard)
 */
export async function getUserFraudStats(db, userId) {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const purchasesRef = collection(db, 'fraud_tracking_purchases');
    
    // Get purchases in last 24 hours
    const query24h = query(
      purchasesRef,
      where('userId', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(last24Hours))
    );
    const purchases24h = await getDocs(query24h);

    // Get purchases in last 7 days
    const query7d = query(
      purchasesRef,
      where('userId', '==', userId),
      where('createdAt', '>=', Timestamp.fromDate(last7Days))
    );
    const purchases7d = await getDocs(query7d);

    // Get failed attempts
    const attemptsRef = collection(db, 'fraud_tracking_attempts');
    const failedQuery = query(
      attemptsRef,
      where('userId', '==', userId),
      where('status', '==', 'failed'),
      where('createdAt', '>=', Timestamp.fromDate(last7Days))
    );
    const failedAttempts = await getDocs(failedQuery);

    return {
      purchasesLast24Hours: purchases24h.size,
      purchasesLast7Days: purchases7d.size,
      failedAttemptsLast7Days: failedAttempts.size,
      isHighRisk: purchases24h.size >= FRAUD_RULES.MAX_PURCHASES_PER_USER_PER_DAY - 1
    };
  } catch (error) {
    console.error('Error getting user fraud stats:', error);
    return null;
  }
}

/**
 * Check if user/email/card is in blocklist
 */
export async function checkBlocklist(db, userId, email, cardFingerprint = null) {
  try {
    const blocklistRef = collection(db, 'fraud_blocklist');
    
    const queries = [];
    
    if (userId) {
      const q1 = query(blocklistRef, where('userId', '==', userId), where('active', '==', true));
      queries.push(getDocs(q1));
    }
    
    if (email) {
      const q2 = query(blocklistRef, where('email', '==', email.toLowerCase()), where('active', '==', true));
      queries.push(getDocs(q2));
    }

    // CRITICAL: Check card fingerprint blocklist
    if (cardFingerprint) {
      const q3 = query(blocklistRef, where('cardFingerprint', '==', cardFingerprint), where('active', '==', true));
      queries.push(getDocs(q3));
    }

    const results = await Promise.all(queries);
    const blocked = results.some(snapshot => !snapshot.empty);

    if (blocked) {
      return {
        blocked: true,
        reason: 'This payment method has been blocked due to suspicious activity. Please contact support.'
      };
    }

    return { blocked: false };
  } catch (error) {
    console.error('Error checking blocklist:', error);
    return { blocked: false }; // Allow on error
  }
}

/**
 * Add user/email to blocklist (admin function)
 */
export async function addToBlocklist(db, data) {
  try {
    const blockId = `block_${Date.now()}`;
    const blockRef = doc(db, 'fraud_blocklist', blockId);
    
    await setDoc(blockRef, {
      userId: data.userId || null,
      email: data.email?.toLowerCase() || null,
      cardFingerprint: data.cardFingerprint || null,
      reason: data.reason || 'Manual block',
      active: true,
      createdAt: serverTimestamp(),
      createdBy: data.createdBy || 'system',
      metadata: data.metadata || {}
    });

    return { success: true, blockId };
  } catch (error) {
    console.error('Error adding to blocklist:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Log price manipulation attempt
 * Call this when price mismatch is detected
 */
export async function logPriceManipulationAttempt(db, data) {
  try {
    const attemptId = `price_manipulation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const attemptRef = doc(db, 'fraud_attempts', attemptId);
    
    await setDoc(attemptRef, {
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
      createdAt: serverTimestamp(),
      metadata: data.metadata || {}
    });

    console.error('🚨 PRICE MANIPULATION LOGGED:', {
      attemptId,
      userId: data.userId,
      email: data.email,
      packageId: data.packageId,
      databasePrice: data.databasePrice,
      submittedPrice: data.submittedPrice,
      cardFingerprint: data.cardFingerprint || 'not-available',
      cardInfo: data.cardLast4 ? `${data.cardBrand} ****${data.cardLast4}` : 'unknown'
    });

    // Auto-block user AND card if they attempt price manipulation
    if (data.autoBlock && (data.userId || data.email || data.cardFingerprint)) {
      const blockReason = data.cardFingerprint 
        ? `Auto-blocked: Price manipulation attempt. Tried to pay ${data.submittedPrice} for item priced at ${data.databasePrice}. Card ${data.cardBrand || 'unknown'} ****${data.cardLast4 || 'xxxx'} permanently blocked.`
        : `Auto-blocked: Price manipulation attempt. Tried to pay ${data.submittedPrice} for item priced at ${data.databasePrice}`;
      
      await addToBlocklist(db, {
        userId: data.userId,
        email: data.email,
        cardFingerprint: data.cardFingerprint,
        cardLast4: data.cardLast4,
        cardBrand: data.cardBrand,
        reason: blockReason,
        createdBy: 'fraud_detection_system',
        metadata: {
          attemptId,
          packageId: data.packageId,
          databasePrice: data.databasePrice,
          submittedPrice: data.submittedPrice,
          sessionId: data.sessionId
        }
      });
      
      if (data.cardFingerprint) {
        console.error('🚨 CARD FINGERPRINT BLOCKED:', data.cardFingerprint);
      }
    }

    return { success: true, attemptId };
  } catch (error) {
    console.error('Error logging price manipulation:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get all fraud attempts for admin review
 */
export async function getFraudAttempts(db, options = {}) {
  try {
    const attemptsRef = collection(db, 'fraud_attempts');
    let q = query(attemptsRef);
    
    if (options.type) {
      q = query(attemptsRef, where('type', '==', options.type));
    }
    
    const snapshot = await getDocs(q);
    const attempts = [];
    
    snapshot.forEach(doc => {
      attempts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return attempts.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
  } catch (error) {
    console.error('Error getting fraud attempts:', error);
    return [];
  }
}

