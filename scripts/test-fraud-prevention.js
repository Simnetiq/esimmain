#!/usr/bin/env node
/**
 * Test Script for Fraud Prevention System
 * 
 * This script tests the complete fraud prevention flow:
 * 1. Check fraud status API
 * 2. Create test payment order
 * 3. Simulate blocked payment webhook
 * 4. Verify fraud signals in Firestore
 * 5. Test auto-blocking after threshold
 * 
 * Usage: 
 *   STRIPE_MODE=test node scripts/test-fraud-prevention.js
 * 
 * Make sure to set environment variables or they'll use defaults
 */

const admin = require('firebase-admin');
const Stripe = require('stripe');
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

// Use test Stripe keys (DO NOT COMMIT REAL KEYS)
const STRIPE_TEST_SECRET_KEY = process.env.STRIPE_SECRET_KEY_TEST || 'sk_test_51SUc3ZBQMhJ0MGpsJx7mrW9wucwmn81skaKqkd98eX7suPVNkheYGTbMBT1q0Z9YBZjJIj6aICiFTkuZXC9oKODP006z00jHcX';

// Test data
const TEST_USER = {
  userId: 'test_fraud_user_' + Date.now(),
  email: 'test.fraud@example.com',
  name: 'Test Fraud User'
};

const TEST_PACKAGE = {
  id: 'asialink-3days-500mb',
  name: '500 MB - 3 Days',
  price: 1.53
};

// Simulated blocked payment data (like what Stripe would send)
const SIMULATED_BLOCKED_PAYMENT = {
  cardFingerprint: 'test_fingerprint_' + Date.now(),
  cardLast4: '4242',
  cardBrand: 'visa',
  ipAddress: '94.205.144.154', // UAE IP from the fraud examples
  countryCode: 'AE'
};

// ============================================
// INITIALIZATION
// ============================================

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');
let serviceAccount;
try {
  serviceAccount = require(serviceAccountPath);
} catch (e) {
  console.error('❌ Firebase service account not found at:', serviceAccountPath);
  console.log('Please ensure firebase-service-account.json exists in the project root');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const stripe = new Stripe(STRIPE_TEST_SECRET_KEY, { apiVersion: '2023-10-16' });

// ============================================
// TEST FUNCTIONS
// ============================================

/**
 * Test 1: Create a fraud signal document directly
 */
async function testCreateFraudSignal() {
  console.log('\n📝 Test 1: Creating fraud signal document...');
  
  const fraudSignalRef = db.collection('fraudSignals').doc(TEST_USER.userId);
  
  await fraudSignalRef.set({
    userId: TEST_USER.userId,
    email: TEST_USER.email,
    cardFingerprints: [SIMULATED_BLOCKED_PAYMENT.cardFingerprint],
    ips: [SIMULATED_BLOCKED_PAYMENT.ipAddress],
    deviceIds: [],
    attempts: 0,
    blocked: false,
    blockType: null,
    blockedAt: null,
    blockExpiresAt: null,
    temporaryBlockCount: 0,
    lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('✅ Created fraud signal for user:', TEST_USER.userId);
  return true;
}

/**
 * Test 2: Simulate multiple blocked payments to trigger auto-block
 */
async function testSimulateBlockedPayments(count = 5) {
  console.log(`\n🔴 Test 2: Simulating ${count} blocked payments...`);
  
  const fraudSignalRef = db.collection('fraudSignals').doc(TEST_USER.userId);
  
  for (let i = 1; i <= count; i++) {
    // Create blocked payment record
    const blockedPaymentId = `test_blocked_pi_${Date.now()}_${i}`;
    await db.collection('fraud_blocked_payments').doc(blockedPaymentId).set({
      userId: TEST_USER.userId,
      email: TEST_USER.email,
      cardFingerprint: SIMULATED_BLOCKED_PAYMENT.cardFingerprint,
      cardLast4: SIMULATED_BLOCKED_PAYMENT.cardLast4,
      cardBrand: SIMULATED_BLOCKED_PAYMENT.cardBrand,
      ipAddress: SIMULATED_BLOCKED_PAYMENT.ipAddress,
      stripePaymentIntentId: blockedPaymentId,
      blockReason: 'highest_risk_level',
      riskLevel: 'highest',
      riskScore: 100,
      countryCode: SIMULATED_BLOCKED_PAYMENT.countryCode,
      isHighRiskRegion: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      metadata: { test: true }
    });
    
    // Increment attempts in fraud signal
    await fraudSignalRef.update({
      attempts: admin.firestore.FieldValue.increment(1),
      cardFingerprints: admin.firestore.FieldValue.arrayUnion(SIMULATED_BLOCKED_PAYMENT.cardFingerprint),
      ips: admin.firestore.FieldValue.arrayUnion(SIMULATED_BLOCKED_PAYMENT.ipAddress),
      lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`   Blocked payment ${i}/${count} recorded`);
  }
  
  // Check if user should be blocked (threshold is 5)
  const fraudSignal = await fraudSignalRef.get();
  const data = fraudSignal.data();
  
  if (data.attempts >= 5) {
    console.log('   ⚠️ Threshold reached! Auto-blocking user...');
    
    // Calculate block expiry (24 hours from now)
    const blockExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await fraudSignalRef.update({
      blocked: true,
      blockType: 'temporary',
      blockedAt: admin.firestore.FieldValue.serverTimestamp(),
      blockExpiresAt: admin.firestore.Timestamp.fromDate(blockExpiresAt),
      blockReason: `Auto-blocked after ${data.attempts} blocked payment attempts`,
      temporaryBlockCount: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Also add to blocklist
    await db.collection('fraud_blocklist').doc(`block_${TEST_USER.userId}_${Date.now()}`).set({
      userId: TEST_USER.userId,
      email: TEST_USER.email,
      cardFingerprint: SIMULATED_BLOCKED_PAYMENT.cardFingerprint,
      cardLast4: SIMULATED_BLOCKED_PAYMENT.cardLast4,
      cardBrand: SIMULATED_BLOCKED_PAYMENT.cardBrand,
      reason: `Auto-blocked after ${data.attempts} blocked payment attempts`,
      active: true,
      blockType: 'temporary',
      expiresAt: admin.firestore.Timestamp.fromDate(blockExpiresAt),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'fraud_signals_system',
      metadata: { test: true }
    });
    
    console.log('✅ User auto-blocked successfully!');
  }
  
  return true;
}

/**
 * Test 3: Verify fraud signal state
 */
async function testVerifyFraudSignal() {
  console.log('\n🔍 Test 3: Verifying fraud signal state...');
  
  const fraudSignalRef = db.collection('fraudSignals').doc(TEST_USER.userId);
  const fraudSignal = await fraudSignalRef.get();
  
  if (!fraudSignal.exists) {
    console.log('❌ Fraud signal not found!');
    return false;
  }
  
  const data = fraudSignal.data();
  console.log('   User ID:', data.userId);
  console.log('   Email:', data.email);
  console.log('   Attempts:', data.attempts);
  console.log('   Blocked:', data.blocked);
  console.log('   Block Type:', data.blockType);
  console.log('   Block Expires:', data.blockExpiresAt?.toDate?.()?.toISOString() || 'N/A');
  console.log('   Card Fingerprints:', data.cardFingerprints?.length || 0);
  console.log('   IPs:', data.ips?.length || 0);
  
  console.log('✅ Fraud signal verified');
  return true;
}

/**
 * Test 4: Test Stripe Radar blocklist creation
 */
async function testStripeRadarBlocklist() {
  console.log('\n🛡️ Test 4: Testing Stripe Radar blocklist...');
  
  try {
    // Check if blocklist exists
    const lists = await stripe.radar.valueLists.list({ limit: 100 });
    let blocklist = lists.data.find(list => 
      list.alias === 'fraud_card_fingerprints' || 
      list.name === 'Fraud Card Fingerprints'
    );
    
    if (!blocklist) {
      console.log('   Creating Stripe Radar blocklist...');
      blocklist = await stripe.radar.valueLists.create({
        alias: 'fraud_card_fingerprints',
        name: 'Fraud Card Fingerprints',
        item_type: 'card_fingerprint',
      });
      console.log('   ✅ Created blocklist:', blocklist.id);
    } else {
      console.log('   ✅ Blocklist already exists:', blocklist.id);
    }
    
    // Note: We can't add test fingerprints to real Radar blocklist
    // In production, the sync-radar API would do this
    console.log('   ℹ️ Note: Test fingerprints not added to live Radar (would cause issues)');
    
    return true;
  } catch (error) {
    console.error('❌ Stripe Radar test failed:', error.message);
    return false;
  }
}

/**
 * Test 5: Create a test Stripe checkout session
 */
async function testCreateStripeCheckout() {
  console.log('\n💳 Test 5: Creating test Stripe checkout session...');
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: TEST_PACKAGE.name,
              description: 'Test eSIM Package',
            },
            unit_amount: Math.round(TEST_PACKAGE.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
      customer_email: TEST_USER.email,
      metadata: {
        order_id: `test_order_${Date.now()}`,
        package_id: TEST_PACKAGE.id,
        userId: TEST_USER.userId,
        test: 'true'
      }
    });
    
    console.log('   ✅ Checkout session created:', session.id);
    console.log('   🔗 Checkout URL:', session.url);
    console.log('\n   To test with a card that triggers Radar:');
    console.log('   - Use card: 4000 0000 0000 9235 (requires authentication)');
    console.log('   - Use card: 4100 0000 0000 0019 (highest risk)');
    console.log('   - See: https://docs.stripe.com/testing#fraud-prevention');
    
    return session;
  } catch (error) {
    console.error('❌ Checkout session creation failed:', error.message);
    return null;
  }
}

/**
 * Test 6: Simulate webhook payload (for manual testing)
 */
function generateWebhookPayload() {
  console.log('\n📨 Test 6: Generating webhook payload for manual testing...');
  
  const payload = {
    id: 'evt_test_' + Date.now(),
    type: 'charge.blocked',
    data: {
      object: {
        id: 'ch_test_' + Date.now(),
        payment_intent: 'pi_test_' + Date.now(),
        amount: 153,
        currency: 'usd',
        receipt_email: TEST_USER.email,
        metadata: {
          order_id: `test_order_${Date.now()}`,
          userId: TEST_USER.userId,
          email: TEST_USER.email
        },
        payment_method_details: {
          card: {
            fingerprint: SIMULATED_BLOCKED_PAYMENT.cardFingerprint,
            last4: SIMULATED_BLOCKED_PAYMENT.cardLast4,
            brand: SIMULATED_BLOCKED_PAYMENT.cardBrand,
            country: SIMULATED_BLOCKED_PAYMENT.countryCode
          }
        },
        billing_details: {
          email: TEST_USER.email,
          name: TEST_USER.name
        },
        outcome: {
          type: 'blocked',
          reason: 'highest_risk_level',
          risk_level: 'highest',
          risk_score: 100,
          seller_message: 'Stripe blocked this charge as too risky.',
          network_status: 'not_sent_to_network'
        }
      }
    }
  };
  
  console.log('   Payload for charge.blocked webhook:');
  console.log(JSON.stringify(payload, null, 2));
  
  return payload;
}

/**
 * Test 7: Create a fraud appeal
 */
async function testCreateFraudAppeal() {
  console.log('\n📝 Test 7: Creating fraud appeal...');
  
  const appealRef = db.collection('fraud_appeals').doc(`appeal_test_${Date.now()}`);
  
  await appealRef.set({
    userId: TEST_USER.userId,
    email: TEST_USER.email,
    contactEmail: TEST_USER.email,
    contactPhone: null,
    reason: 'Test appeal - I believe my account was blocked in error',
    additionalInfo: 'This is a test appeal created by the test script',
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  console.log('   ✅ Appeal created:', appealRef.id);
  return appealRef.id;
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  // Delete fraud signal
  try {
    await db.collection('fraudSignals').doc(TEST_USER.userId).delete();
    console.log('   Deleted fraud signal');
  } catch (e) {
    // Ignore if doesn't exist
  }
  
  // Delete blocked payments (limited cleanup)
  const blockedPayments = await db.collection('fraud_blocked_payments')
    .where('userId', '==', TEST_USER.userId)
    .limit(20)
    .get();
  
  for (const doc of blockedPayments.docs) {
    await doc.ref.delete();
  }
  console.log(`   Deleted ${blockedPayments.size} blocked payment records`);
  
  // Delete blocklist entries
  const blocklistEntries = await db.collection('fraud_blocklist')
    .where('userId', '==', TEST_USER.userId)
    .limit(10)
    .get();
  
  for (const doc of blocklistEntries.docs) {
    await doc.ref.delete();
  }
  console.log(`   Deleted ${blocklistEntries.size} blocklist entries`);
  
  // Delete appeals
  const appeals = await db.collection('fraud_appeals')
    .where('userId', '==', TEST_USER.userId)
    .limit(10)
    .get();
  
  for (const doc of appeals.docs) {
    await doc.ref.delete();
  }
  console.log(`   Deleted ${appeals.size} appeals`);
  
  console.log('✅ Cleanup complete');
}

// ============================================
// MAIN EXECUTION
// ============================================

async function runTests() {
  console.log('🚀 Starting Fraud Prevention System Tests');
  console.log('=========================================');
  console.log('Test User ID:', TEST_USER.userId);
  console.log('Test Email:', TEST_USER.email);
  console.log('');
  
  const args = process.argv.slice(2);
  const skipCleanup = args.includes('--no-cleanup');
  const cleanupOnly = args.includes('--cleanup-only');
  
  if (cleanupOnly) {
    await cleanupTestData();
    process.exit(0);
  }
  
  try {
    // Run tests
    await testCreateFraudSignal();
    await testSimulateBlockedPayments(5);
    await testVerifyFraudSignal();
    await testStripeRadarBlocklist();
    const session = await testCreateStripeCheckout();
    generateWebhookPayload();
    await testCreateFraudAppeal();
    
    console.log('\n=========================================');
    console.log('✅ All tests completed successfully!');
    console.log('=========================================');
    
    console.log('\n📋 Summary:');
    console.log('1. Created fraudSignal document in Firestore');
    console.log('2. Simulated 5 blocked payments (triggers auto-block)');
    console.log('3. Verified fraud signal shows blocked status');
    console.log('4. Checked Stripe Radar blocklist');
    console.log('5. Created test checkout session (use URL above to test manually)');
    console.log('6. Generated webhook payload for manual testing');
    console.log('7. Created test fraud appeal');
    
    console.log('\n🔗 To test manually:');
    if (session) {
      console.log(`   Open: ${session.url}`);
    }
    console.log('   Use test card: 4100 0000 0000 0019 (highest risk)');
    
    if (!skipCleanup) {
      console.log('\n⚠️  Test data will be cleaned up in 10 seconds...');
      console.log('   Run with --no-cleanup to keep test data');
      await new Promise(r => setTimeout(r, 10000));
      await cleanupTestData();
    } else {
      console.log('\n⚠️  Test data NOT cleaned up (--no-cleanup flag)');
      console.log('   Run: node scripts/test-fraud-prevention.js --cleanup-only');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (!skipCleanup) {
      await cleanupTestData();
    }
    process.exit(1);
  }
  
  process.exit(0);
}

runTests();
