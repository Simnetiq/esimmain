/**
 * Sync Blocklist to Stripe Radar
 * 
 * This script syncs your local fraud_blocklist to Stripe Radar's blocklist.
 * 
 * Stripe Radar allows you to block specific card fingerprints, preventing
 * fraudulent cards from being used even with different emails/accounts.
 * 
 * SETUP:
 * 1. Enable Stripe Radar in your Stripe Dashboard
 * 2. Get API key with radar permissions
 * 3. Run: node scripts/sync-blocklist-to-stripe-radar.js
 * 
 * FEATURES:
 * - Blocks card fingerprints at Stripe level
 * - Prevents card reuse across different accounts
 * - Automatic denial before payment processing
 * 
 * REFERENCE:
 * https://stripe.com/docs/radar/lists
 * https://stripe.com/docs/api/radar/value_lists
 */

const admin = require('firebase-admin');
const Stripe = require('stripe');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath))
  });
}

const db = admin.firestore();

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error('❌ Error: STRIPE_SECRET_KEY not found in environment variables');
  console.log('Please set STRIPE_SECRET_KEY_LIVE or STRIPE_SECRET_KEY');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
});

/**
 * Get or create Stripe Radar blocklist
 */
async function getOrCreateRadarBlocklist() {
  try {
    console.log('🔍 Checking for existing Stripe Radar blocklist...');
    
    // List existing value lists
    const lists = await stripe.radar.valueLists.list({ limit: 100 });
    
    // Look for our blocklist
    let blocklist = lists.data.find(list => 
      list.name === 'Fraud Card Fingerprints' || 
      list.alias === 'fraud_card_fingerprints'
    );
    
    if (blocklist) {
      console.log('✅ Found existing blocklist:', blocklist.id);
      return blocklist;
    }
    
    // Create new blocklist
    console.log('📝 Creating new Stripe Radar blocklist...');
    blocklist = await stripe.radar.valueLists.create({
      alias: 'fraud_card_fingerprints',
      name: 'Fraud Card Fingerprints',
      item_type: 'card_fingerprint',
    });
    
    console.log('✅ Created blocklist:', blocklist.id);
    return blocklist;
    
  } catch (error) {
    console.error('❌ Error managing Radar blocklist:', error.message);
    throw error;
  }
}

/**
 * Add card fingerprint to Stripe Radar blocklist
 */
async function addToRadarBlocklist(listId, cardFingerprint) {
  try {
    await stripe.radar.valueListItems.create({
      value_list: listId,
      value: cardFingerprint,
    });
    return true;
  } catch (error) {
    // Ignore if already exists
    if (error.code === 'resource_already_exists') {
      return false;
    }
    throw error;
  }
}

/**
 * Sync local blocklist to Stripe Radar
 */
async function syncBlocklistToStripe() {
  console.log('🚀 Starting Stripe Radar Blocklist Sync...\n');
  
  try {
    // Get or create Radar blocklist
    const radarBlocklist = await getOrCreateRadarBlocklist();
    console.log('');
    
    // Get all blocked cards from Firestore
    console.log('📋 Fetching blocked cards from Firebase...');
    const blocklistSnapshot = await db.collection('fraud_blocklist')
      .where('active', '==', true)
      .where('cardFingerprint', '!=', null)
      .get();
    
    console.log(`Found ${blocklistSnapshot.size} blocked cards\n`);
    
    if (blocklistSnapshot.empty) {
      console.log('✅ No cards to sync');
      return;
    }
    
    // Sync each card
    let added = 0;
    let existing = 0;
    let failed = 0;
    
    for (const doc of blocklistSnapshot.docs) {
      const data = doc.data();
      const cardFingerprint = data.cardFingerprint;
      
      if (!cardFingerprint) continue;
      
      try {
        const wasAdded = await addToRadarBlocklist(radarBlocklist.id, cardFingerprint);
        
        if (wasAdded) {
          added++;
          console.log(`✅ Added: ${data.cardBrand || 'Card'} ****${data.cardLast4 || 'xxxx'} (${cardFingerprint})`);
        } else {
          existing++;
          console.log(`ℹ️  Already blocked: ${data.cardBrand || 'Card'} ****${data.cardLast4 || 'xxxx'}`);
        }
        
        // Update Firestore with Stripe sync info
        await doc.ref.update({
          stripeSyncedAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeRadarListId: radarBlocklist.id
        });
        
      } catch (error) {
        failed++;
        console.error(`❌ Failed to add ${cardFingerprint}:`, error.message);
      }
    }
    
    console.log('\n📊 SYNC SUMMARY:');
    console.log(`   Added to Stripe: ${added}`);
    console.log(`   Already in Stripe: ${existing}`);
    console.log(`   Failed: ${failed}`);
    console.log('\n✅ Sync complete!');
    
    // Print next steps
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Go to Stripe Dashboard > Radar > Lists');
    console.log('2. Find "Fraud Card Fingerprints" list');
    console.log('3. Create a Radar Rule to block these cards:');
    console.log('   Rule: Block if :card_fingerprint: is in :fraud_card_fingerprints:');
    console.log('4. Test with a blocked card to confirm it\'s rejected');
    console.log('\n📚 Reference:');
    console.log('   https://stripe.com/docs/radar/rules');
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error);
    throw error;
  }
}

// Run the sync
syncBlocklistToStripe()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });










