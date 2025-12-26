/**
 * EMERGENCY SCRIPT: Block the price manipulation attacker
 * 
 * Run with: node scripts/block-fraudster.js
 * 
 * This will:
 * 1. Add the attacker to the fraud blocklist
 * 2. Log the incident
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

// ATTACKER DETAILS FROM THE INCIDENT
const ATTACKER = {
  email: 'apood4681@gmail.com',
  displayName: 'Skak',
  // Find their userId from the fraudulent order
  orderId: 'red-sand-15days-unlimited', // The package they stole
  attackDetails: {
    actualPrice: 66.69,
    paidPrice: 0.50,
    packageName: 'Red Sand - Unlimited 15 Days',
    iccid: '8910300000046705558',
    airaloOrderId: 1174596,
    attackTime: '2025-12-01T19:47:31Z'
  }
};

async function blockAttacker() {
  try {
    // 1. Add to blocklist by email
    const blockId = `block_${Date.now()}`;
    await db.collection('fraud_blocklist').doc(blockId).set({
      email: ATTACKER.email.toLowerCase(),
      userId: null, // We'll update this if we find the userId
      reason: `PRICE MANIPULATION ATTACK: Paid $${ATTACKER.attackDetails.paidPrice} for a $${ATTACKER.attackDetails.actualPrice} eSIM package (${ATTACKER.attackDetails.packageName}). Airalo Order ID: ${ATTACKER.attackDetails.airaloOrderId}`,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'emergency_block_script',
      attackDetails: ATTACKER.attackDetails
    });

    // 2. Find and block the user account
    const usersQuery = await db.collection('users')
      .where('email', '==', ATTACKER.email)
      .get();

    if (!usersQuery.empty) {
      const userDoc = usersQuery.docs[0];
      const userId = userDoc.id;
      
      // Update the blocklist entry with userId
      await db.collection('fraud_blocklist').doc(blockId).update({
        userId: userId
      });

      // Flag the user account
      await db.collection('users').doc(userId).update({
        blocked: true,
        blockedAt: admin.firestore.FieldValue.serverTimestamp(),
        blockedReason: 'Price manipulation fraud',
        fraudFlags: {
          priceManipulation: true,
          blockedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      });

    } else {
    }

    // 3. Log the incident
    await db.collection('fraud_incidents').add({
      type: 'price_manipulation',
      severity: 'critical',
      attackerEmail: ATTACKER.email,
      attackerName: ATTACKER.displayName,
      packageId: ATTACKER.orderId,
      actualPrice: ATTACKER.attackDetails.actualPrice,
      paidPrice: ATTACKER.attackDetails.paidPrice,
      lossAmount: ATTACKER.attackDetails.actualPrice - ATTACKER.attackDetails.paidPrice,
      airaloOrderId: ATTACKER.attackDetails.airaloOrderId,
      iccid: ATTACKER.attackDetails.iccid,
      attackTime: ATTACKER.attackDetails.attackTime,
      blockedAt: admin.firestore.FieldValue.serverTimestamp(),
      notes: 'Attacker exploited price validation vulnerability - frontend price was trusted without server-side validation. Vulnerability has been patched.',
      resolution: 'blocked'
    });

  } catch (error) {
  }

  process.exit(0);
}

blockAttacker();

