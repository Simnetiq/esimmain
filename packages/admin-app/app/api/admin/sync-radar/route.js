import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@esim/shared/firebase/config';
import { syncToStripeRadar } from '@esim/shared/services/fraudSignalsService';

export const dynamic = 'force-dynamic';

// Get Stripe secret key based on mode
const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test' || stripeMode === 'sandbox') {
    return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  }
  return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16',
}) : null;

/**
 * Sync Fraud Blocklist to Stripe Radar
 * 
 * POST /api/admin/sync-radar
 * 
 * This should be called:
 * 1. Manually by admin when needed
 * 2. Automatically via cron job (e.g., every hour)
 * 3. After blocking a user with card fingerprint
 * 
 * Requires admin API key for security
 */
export async function POST(request) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    const adminApiKey = process.env.ADMIN_API_KEY;

    // In development, allow without key
    if (process.env.NODE_ENV === 'production' && adminApiKey) {
      if (!authHeader || authHeader !== `Bearer ${adminApiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    } 

    const result = await syncToStripeRadar(db, stripe);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Sync failed', details: result.error, code: 'SYNC_FAILED' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      synced: result.synced,
      skipped: result.skipped,
      message: `Synced ${result.synced} new card fingerprints to Stripe Radar (${result.skipped} already existed)`
    });

  } catch (error) {
    console.error('Error syncing to Stripe Radar:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error.message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}

/**
 * GET - Check Stripe Radar blocklist status
 */
export async function GET(request) {
  try {
    // Verify admin API key
    const authHeader = request.headers.get('authorization');
    const adminApiKey = process.env.ADMIN_API_KEY;

    if (process.env.NODE_ENV === 'production' && adminApiKey) {
      if (!authHeader || authHeader !== `Bearer ${adminApiKey}`) {
        return NextResponse.json(
          { error: 'Unauthorized', code: 'UNAUTHORIZED' },
          { status: 401 }
        );
      }
    }

    if (!stripe) {
      return NextResponse.json(
        { error: 'Stripe not configured', code: 'STRIPE_NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    // Get Stripe Radar blocklist info
    const lists = await stripe.radar.valueLists.list({ limit: 100 });
    
    const fraudList = lists.data.find(list => 
      list.alias === 'fraud_card_fingerprints' || 
      list.name === 'Fraud Card Fingerprints'
    );

    if (!fraudList) {
      return NextResponse.json({
        success: true,
        exists: false,
        message: 'Fraud card fingerprints blocklist does not exist yet. It will be created on first sync.'
      });
    }

    // Get items in the list
    const items = await stripe.radar.valueListItems.list({
      value_list: fraudList.id,
      limit: 100
    });

    return NextResponse.json({
      success: true,
      exists: true,
      listId: fraudList.id,
      name: fraudList.name,
      itemCount: items.data.length,
      hasMore: items.has_more,
      createdAt: new Date(fraudList.created * 1000).toISOString()
    });

  } catch (error) {
    console.error('Error getting Stripe Radar status:', error);
    return NextResponse.json(
      { error: 'Failed to get Radar status', details: error.message, code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
