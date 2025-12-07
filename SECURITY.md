# 🔒 Payment Security Architecture

This document outlines the comprehensive security measures implemented to protect against payment fraud, price manipulation, and other security threats.

## Table of Contents

1. [Security Overview](#security-overview)
2. [Price Manipulation Protection](#price-manipulation-protection)
3. [Fraud Detection System](#fraud-detection-system)
4. [Card Blocklisting](#card-blocklisting)
5. [Webhook Security](#webhook-security)
6. [Testing Security](#testing-security)
7. [Monitoring & Alerts](#monitoring--alerts)

---

## Security Overview

### Multi-Layer Defense Strategy

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT REQUEST                        │
│  (User submits payment with package ID and price)       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              LAYER 1: Rate Limiting                      │
│  • 50 requests per IP per hour                          │
│  • 2 second minimum between requests                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│              LAYER 2: Blocklist Check                    │
│  • Check user ID blocklist                              │
│  • Check email blocklist                                │
│  • Check card fingerprint blocklist (if available)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         LAYER 3: Price Validation (CRITICAL)             │
│  • Fetch REAL price from database                       │
│  • NEVER trust frontend price                           │
│  • Validate referral discount server-side               │
│  • Compare with submitted price                         │
│  • Auto-block on mismatch                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            LAYER 4: Fraud Detection                      │
│  • Check purchase limits (3/day per user)               │
│  • Check card limits (5/day per card)                   │
│  • Detect rapid purchases                               │
│  • Track failed attempts                                │
│  • Risk scoring                                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          LAYER 5: Create Stripe Payment                  │
│  • Use VALIDATED price (not submitted price)            │
│  • Store validation metadata                            │
│  • Link to fraud tracking attempt                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│           LAYER 6: Webhook Verification                  │
│  • Verify Stripe signature                              │
│  • Verify payment amount matches order                  │
│  • Extract card fingerprint                             │
│  • Block card on price mismatch                         │
│  • Create eSIM ONLY after all checks pass               │
└─────────────────────────────────────────────────────────┘
```

---

## Price Manipulation Protection

### How It Works

**Location:** `packages/customer-app/app/api/create-payment-order/route.js`

```javascript
// ❌ WRONG: Never trust frontend price
const price = request.body.price; // Attacker can modify this!

// ✅ CORRECT: Always fetch from database
const packageDoc = await db.collection('dataplans').doc(packageId).get();
const validatedPrice = packageDoc.data().price;
```

### Implementation Details

1. **Server-Side Price Fetching** (Lines 134-238)
   - Fetches package from `dataplans` collection
   - Validates package exists and is enabled
   - Calculates referral discount SERVER-SIDE
   - Compares with submitted price
   - Allows max 0.01 difference for floating point tolerance

2. **Auto-Blocking on Mismatch**
   - Logs attempt to `fraud_attempts` collection
   - Adds user email to `fraud_blocklist`
   - Adds card fingerprint to blocklist (if available)
   - Returns error to user
   - Payment is NEVER created

3. **Webhook Double-Check** (Lines 166-206 in webhook)
   - Even after Stripe payment completes, webhook verifies amount
   - If mismatch detected (attacker bypassed client validation):
     - Extracts card fingerprint from payment method
     - Blocks card permanently
     - Marks order as fraud
     - Does NOT create eSIM

### Testing Price Protection

```bash
# Test 1: Submit wrong price (should be rejected)
curl -X POST https://your-domain.com/api/create-payment-order \
  -H "Content-Type: application/json" \
  -d '{
    "order": "package-id-123",
    "email": "test@example.com",
    "total": 1.00,  # Real price is $50
    "currency": "usd"
  }'

# Expected: 400 Bad Request with "Price validation failed"
```

---

## Fraud Detection System

### Rules & Limits

**Location:** `packages/shared/services/fraudDetectionService.js`

| Rule | Limit | Collection | Action |
|------|-------|------------|--------|
| Purchases per user per day | 3 | `fraud_tracking_purchases` | Block with error message |
| Purchases per email per day | 3 | `fraud_tracking_purchases` | Block with error message |
| Purchases per card per day | 5 | `fraud_tracking_purchases` | Block card |
| Failed attempts per hour | 5 | `fraud_tracking_attempts` | Block user |
| High-value transaction | $1000+ | N/A | Flag for review |
| Rapid purchases | 2 in 5 minutes | N/A | Increase risk score |

### Risk Scoring

```javascript
Risk Score Thresholds:
0-49:   Low risk - Allow
50-99:  Medium risk - Allow but flag for review
100+:   High risk - Block transaction

Risk Factors:
+20 - Multiple purchases today
+30 - Rapid purchase attempt (within 5 minutes)
+15 - Multiple email purchases
+25 - Frequent card usage
+20 - Recent failed attempts
+15 - High-value transaction
+25 - New account large purchase
```

### Fraud Check Flow

```javascript
// Called before creating payment
const fraudCheck = await checkFraudRules(db, userId, email, {
  amount: validatedPrice,
  currency: 'usd',
  accountAge: userCreatedAt
});

if (!fraudCheck.allowed) {
  // Block and return error
  return { error: fraudCheck.reason, code: 'FRAUD_BLOCKED' };
}
```

---

## Card Blocklisting

### Local Blocklist (Firebase)

**Collection:** `fraud_blocklist`

**Fields:**
```javascript
{
  userId: string | null,
  email: string | null,
  cardFingerprint: string | null,  // Unique card identifier
  cardLast4: string | null,
  cardBrand: string | null,        // 'visa', 'mastercard', etc.
  reason: string,
  active: boolean,
  createdAt: timestamp,
  createdBy: string,
  metadata: object
}
```

### Stripe Radar Integration

**Why Use Stripe Radar:**
- Blocks cards at Stripe level (before charge is created)
- Prevents card reuse across ANY account
- Works even if attacker creates new email/account
- Syncs with Stripe's fraud detection

**Setup:**

1. **Enable Stripe Radar** (if not already enabled)
   - Go to Stripe Dashboard > Radar
   - Enable Radar for your account

2. **Sync Local Blocklist to Stripe**
   ```bash
   node scripts/sync-blocklist-to-stripe-radar.js
   ```

3. **Create Radar Rule**
   - Go to Stripe Dashboard > Radar > Rules
   - Click "Add rule"
   - Rule: `Block if :card_fingerprint: is in :fraud_card_fingerprints:`
   - Response: Block

4. **Test the Rule**
   - Use a blocked card
   - Should be rejected with: "Your card was declined"

### Manual Card Blocking

```javascript
// Add to local blocklist
const { addToBlocklist } = require('@esim/shared/services/fraudDetectionService');

await addToBlocklist(db, {
  email: 'fraudster@example.com',
  cardFingerprint: 'fp_1234567890',
  cardLast4: '4242',
  cardBrand: 'visa',
  reason: 'Manual block - suspicious activity',
  createdBy: 'admin'
});
```

### Automatic Card Blocking

Card fingerprints are automatically blocked when:
1. ✅ Price manipulation detected in webhook
2. ✅ Payment amount mismatch in webhook
3. ✅ Multiple failed purchase attempts
4. ✅ Chargeback/dispute filed

---

## Webhook Security

### Signature Verification

**Location:** `packages/customer-app/app/api/stripe-webhook/route.js`

```javascript
// Verify webhook is from Stripe
const signature = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  body, 
  signature, 
  webhookSecret
);
```

**Required Environment Variables:**
- `STRIPE_WEBHOOK_SECRET_LIVE` - Production webhook secret
- `STRIPE_WEBHOOK_SECRET_TEST` - Test webhook secret

### Webhook Event Handlers

| Event | Handler | Security Checks |
|-------|---------|----------------|
| `checkout.session.completed` | Create eSIM | ✅ Payment status, ✅ Amount match, ✅ Duplicate prevention |
| `payment_intent.succeeded` | Track purchase | ✅ Extract card fingerprint, ✅ Fraud tracking |
| `payment_intent.payment_failed` | Track failure | ✅ Update fraud attempts |
| `charge.refunded` | Mark refunded | ✅ Update order status |
| `charge.dispute.created` | Flag user | ✅ Increment dispute count, ✅ Consider blocking |

### Duplicate Prevention

```javascript
// Check if eSIM already created
if (orderData.esimCreated || orderData.status === 'completed') {
  console.log('eSIM already created for order:', orderId);
  return;
}
```

---

## Testing Security

### Test Scenarios

#### 1. Price Manipulation Test
```bash
# Should be rejected at API level
curl -X POST /api/create-payment-order \
  -d '{"order":"pkg-123","email":"test@test.com","total":0.01}'

# Expected: 400 with "Price validation failed"
```

#### 2. Blocklisted Email Test
```bash
# First, block the email
node scripts/block-fraudster.js

# Then try to purchase
# Expected: 403 with "Account has been blocked"
```

#### 3. Rate Limiting Test
```bash
# Make 51 requests from same IP within 1 hour
# Expected: 429 after 50th request
```

#### 4. Card Reuse Test
```bash
# 1. Attempt price manipulation with card X
# 2. Card X fingerprint gets blocked
# 3. Try again with same card but different email
# Expected: Still blocked (if Stripe Radar configured)
```

---

## Monitoring & Alerts

### Key Collections to Monitor

1. **fraud_attempts**
   - Price manipulation attempts
   - View with: `db.collection('fraud_attempts').where('type', '==', 'price_manipulation')`

2. **fraud_blocklist**
   - All blocked users/emails/cards
   - Check active blocks: `where('active', '==', true)`

3. **fraud_tracking_purchases**
   - All successful purchases
   - Detect patterns

4. **fraud_tracking_attempts**
   - All purchase attempts (successful and failed)
   - Track conversion rate

### Admin Queries

```javascript
// Get all price manipulation attempts today
const today = new Date();
today.setHours(0, 0, 0, 0);

const attempts = await db.collection('fraud_attempts')
  .where('type', '==', 'price_manipulation')
  .where('createdAt', '>=', today)
  .get();

console.log(`${attempts.size} price manipulation attempts today`);

// Get most blocked cards
const blockedCards = await db.collection('fraud_blocklist')
  .where('active', '==', true)
  .where('cardFingerprint', '!=', null)
  .get();

console.log(`${blockedCards.size} cards currently blocked`);
```

### Recommended Alerts

Set up Firebase Cloud Functions or cron jobs to alert on:
- ✅ More than 5 price manipulation attempts per hour
- ✅ More than 3 cards blocked per day
- ✅ Same IP attempting multiple purchases after being blocked
- ✅ High-value orders (>$500) for review
- ✅ Disputes/chargebacks filed

---

## Security Checklist

### Before Going Live

- [ ] Enable Stripe webhook signature verification
- [ ] Set up Stripe Radar and sync blocklist
- [ ] Test price manipulation protection
- [ ] Test card blocking flow
- [ ] Enable rate limiting
- [ ] Set up monitoring for fraud_attempts
- [ ] Configure alerts for suspicious activity
- [ ] Review and adjust fraud detection limits
- [ ] Test dispute handling
- [ ] Document incident response procedures

### Regular Maintenance

- [ ] Weekly: Review fraud_attempts collection
- [ ] Weekly: Check for new blocked cards/users
- [ ] Monthly: Analyze fraud patterns
- [ ] Monthly: Adjust fraud detection thresholds
- [ ] Quarterly: Security audit
- [ ] Quarterly: Sync blocklist to Stripe Radar

---

## Incident Response

### If Price Manipulation Detected

1. **Immediate Actions:**
   ```bash
   # Block the attacker
   node scripts/block-fraudster.js
   # Update email in script first
   ```

2. **Verify Damage:**
   - Check if eSIM was created (check Airalo order)
   - Calculate financial loss
   - Check if card was blocked

3. **Contact Providers:**
   - Airalo: Deactivate fraudulent eSIM
   - Stripe: Report fraud, request chargeback protection

4. **Update Security:**
   - Review logs to understand how it happened
   - Deploy fixes if needed
   - Sync blocklist to Stripe Radar

---

## References

- [Stripe Security Best Practices](https://stripe.com/docs/security)
- [Stripe Radar Documentation](https://stripe.com/docs/radar)
- [PCI DSS Compliance](https://stripe.com/docs/security/guide)
- [Payment Card Industry Standards](https://www.pcisecuritystandards.org/)

---

## Support

For security issues or questions:
1. Review this documentation
2. Check `fraud_attempts` collection for errors
3. Review webhook logs in Stripe Dashboard
4. Contact your security team

**Emergency Contact:** [Your security team contact]

---

**Last Updated:** December 7, 2025
**Security Version:** 2.0

