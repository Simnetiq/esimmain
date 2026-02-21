# Top-Up eSIM Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow authenticated users to purchase data top-ups for existing activated eSIMs via Stripe checkout, fulfilled by Airalo webhook.

**Architecture:** Extend existing Stripe webhook with a topup branch. New `esim_topups` table for state tracking. Top-up packages queried from `dataplans` table (`package_type = 'topup'`), matched to eSIMs by `operator_id + country_iso`. Two new API routes + webhook modification. QRCodeModal gets a "Top Up" button.

**Tech Stack:** Next.js App Router, Supabase (Postgres + RLS), Stripe Checkout/PaymentIntent, Airalo Partner API v2

**Design doc:** `docs/plans/2026-02-20-topup-esim-design.md`

---

### Task 1: Database Migration — esim_topups table

**Files:**
- Modify: `server/supabase/schema.sql` (append new table definition)
- Execute: Supabase MCP `apply_migration`

**Step 1: Apply the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with project_id `eujmomonscnlmwcbkbfy` and name `create_esim_topups`:

```sql
-- Create esim_topups table for tracking top-up purchases
CREATE TABLE public.esim_topups (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL,
  order_id                 text NOT NULL,
  iccid                    text NOT NULL,
  airalo_package_id        text NOT NULL,
  package_name             text,
  data_amount              text,
  validity                 text,
  price                    numeric NOT NULL,
  currency                 text DEFAULT 'USD',
  stripe_session_id        text,
  stripe_payment_intent_id text,
  airalo_order_id          text,
  status                   text NOT NULL DEFAULT 'topup_pending_payment'
    CHECK (status IN (
      'topup_pending_payment',
      'topup_payment_confirmed',
      'topup_submitting_to_airalo',
      'topup_success',
      'topup_failed'
    )),
  error_message            text,
  platform                 text DEFAULT 'web',
  is_test_mode             boolean DEFAULT false,
  security                 jsonb,
  created_at               timestamptz DEFAULT now(),
  updated_at               timestamptz DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_esim_topups_user_id ON public.esim_topups(user_id);
CREATE INDEX idx_esim_topups_iccid ON public.esim_topups(iccid);
CREATE INDEX idx_esim_topups_status ON public.esim_topups(status);
CREATE INDEX idx_esim_topups_stripe_session ON public.esim_topups(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

-- RLS: users can only read their own topups
ALTER TABLE public.esim_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own topups"
  ON public.esim_topups FOR SELECT
  USING (auth.uid() = user_id);

-- Enable realtime for polling from client
ALTER PUBLICATION supabase_realtime ADD TABLE public.esim_topups;
```

**Step 2: Append schema definition to `server/supabase/schema.sql`**

Add the `esim_topups` CREATE TABLE statement at the end of the file (for documentation purposes — the actual migration runs via Supabase MCP).

**Step 3: Verify migration**

Run: `mcp__supabase__list_tables` with schemas `["public"]` and confirm `esim_topups` appears.

**Step 4: Run security advisors**

Run: `mcp__supabase__get_advisors` with type `security` to verify RLS is properly configured.

**Step 5: Commit**

```
git add server/supabase/schema.sql
git commit -m "feat(db): add esim_topups table with RLS for top-up purchases"
```

---

### Task 2: API Route — GET /api/esims/[iccid]/topups

**Files:**
- Create: `packages/customer-app/app/api/esims/[iccid]/topups/route.js`

**Context needed:**
- Read `packages/customer-app/app/api/airalo/sim-usage/route.js` for the Airalo auth + sandbox/prod pattern
- Read `packages/customer-app/app/api/create-payment-order/route.js` lines 205-224 for the JWT verification pattern

**Step 1: Create the route file**

```javascript
import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const supabase = getSupabaseAdmin();
  const { iccid } = await params;

  if (!iccid) {
    return NextResponse.json({ success: false, error: 'ICCID is required' }, { status: 400 });
  }

  // ── Auth: require authenticated user ──────────────────────────────────────
  let userId = null;
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const { data: { user }, error: jwtError } = await supabase.auth.getUser(token);
    if (!jwtError && user) userId = user.id;
  }

  if (!userId) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // ── Verify ICCID ownership ────────────────────────────────────────────────
  const { data: ownerOrder, error: ownerError } = await supabase
    .from('orders')
    .select('id, plan_id, iccid, status')
    .eq('iccid', iccid)
    .eq('user_id', userId)
    .eq('status', 'completed')
    .limit(1)
    .maybeSingle();

  if (ownerError || !ownerOrder) {
    return NextResponse.json({ success: false, error: 'eSIM not found or not owned by user' }, { status: 404 });
  }

  // ── Look up the original plan to find operator_id + country_iso ───────────
  const { data: originalPlan } = await supabase
    .from('dataplans')
    .select('operator_id, country_iso')
    .eq('id', ownerOrder.plan_id)
    .maybeSingle();

  if (!originalPlan?.operator_id) {
    return NextResponse.json({ success: false, error: 'Could not determine eSIM operator' }, { status: 404 });
  }

  // ── Query available top-up packages ───────────────────────────────────────
  const { data: topupPlans, error: topupError } = await supabase
    .from('dataplans')
    .select('id, name, title, data_amount_mb, data_display, is_unlimited, validity_days, price, net_price, currency, operator_name, operator_image_url')
    .eq('package_type', 'topup')
    .eq('operator_id', originalPlan.operator_id)
    .eq('country_iso', originalPlan.country_iso)
    .eq('is_enabled', true)
    .eq('status', 'active')
    .order('price', { ascending: true });

  if (topupError) {
    console.error('[topups] Error fetching topup plans:', topupError);
    return NextResponse.json({ success: false, error: 'Failed to fetch top-up packages' }, { status: 500 });
  }

  // ── Normalize response ────────────────────────────────────────────────────
  const packages = (topupPlans || []).map(plan => ({
    id: plan.id,
    name: plan.name,
    title: plan.title,
    dataAmountMb: plan.data_amount_mb,
    dataDisplay: plan.data_display || formatDataDisplay(plan.data_amount_mb, plan.is_unlimited),
    isUnlimited: plan.is_unlimited,
    validityDays: plan.validity_days,
    price: parseFloat(plan.price),
    currency: plan.currency || 'USD',
    operatorName: plan.operator_name,
    operatorImageUrl: plan.operator_image_url,
  }));

  return NextResponse.json({
    success: true,
    data: packages,
    iccid,
    originalOrderId: ownerOrder.id,
    count: packages.length,
  });
}

function formatDataDisplay(mb, isUnlimited) {
  if (isUnlimited) return 'Unlimited';
  if (!mb) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}
```

**Step 2: Verify locally**

Run: `cd packages/customer-app && npx next build` (or `npm run dev` and test with curl)

**Step 3: Commit**

```
git add packages/customer-app/app/api/esims/
git commit -m "feat(api): add GET /api/esims/[iccid]/topups endpoint"
```

---

### Task 3: API Route — POST /api/topups/create-checkout

**Files:**
- Create: `packages/customer-app/app/api/topups/create-checkout/route.js`

**Context needed:**
- Read `packages/customer-app/app/api/create-payment-order/route.js` for the full pattern (this route closely follows it)
- Read `packages/customer-app/app/api/stripe-webhook/route.js` lines 21-37 for Stripe initialization

**Step 1: Create the route file**

```javascript
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import {
  checkFraudRules,
  trackPurchaseAttempt,
  checkBlocklist,
} from '@esim/shared/services/fraudDetectionService';
import {
  checkUserBlocked,
} from '@esim/shared/services/fraudSignalsService';

const SECURITY_CONFIG = {
  MAX_REQUESTS_PER_IP_PER_HOUR: 50,
};

const getStripeSecretKey = () => {
  const stripeMode = process.env.STRIPE_MODE || 'live';
  if (stripeMode === 'test' || stripeMode === 'sandbox') return process.env.STRIPE_SECRET_KEY_TEST || process.env.STRIPE_SECRET_KEY;
  return process.env.STRIPE_SECRET_KEY_LIVE || process.env.STRIPE_SECRET_KEY;
};

const stripeSecretKey = getStripeSecretKey();
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia',
  timeout: 30000,
}) : null;

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const ip = (
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    (() => {
      const fwd = request.headers.get('x-forwarded-for');
      return fwd ? fwd.split(',').pop().trim() : null;
    })() ||
    'unknown'
  );
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();
    const {
      iccid,
      packageId,
      currency = 'usd',
      isMobile,
      platform = 'web',
      language = 'en',
    } = body;

    // ── Auth: require authenticated user ────────────────────────────────────
    let userId = null;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error: jwtError } = await supabase.auth.getUser(token);
      if (!jwtError && user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required', code: 'AUTH_REQUIRED' }, { status: 401 });
    }

    if (!iccid || !packageId) {
      return NextResponse.json({ error: 'Missing required fields (iccid, packageId)', code: 'MISSING_FIELDS' }, { status: 400 });
    }

    if (!stripe || !stripeSecretKey) {
      return NextResponse.json({ error: 'Payment service not configured', code: 'SERVICE_UNAVAILABLE' }, { status: 503 });
    }

    // ── Rate limit ──────────────────────────────────────────────────────────
    if (ip !== 'unknown') {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('payment_attempts')
        .select('*', { count: 'exact', head: true })
        .eq('ip', ip)
        .gte('created_at', oneHourAgo);
      if ((count || 0) >= SECURITY_CONFIG.MAX_REQUESTS_PER_IP_PER_HOUR) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' }, { status: 429 });
      }
    }

    // ── Blocklist + fraud signals ───────────────────────────────────────────
    const { data: userData } = await supabase.from('users').select('email').eq('id', userId).single();
    const email = userData?.email || '';

    const blocklistCheck = await checkBlocklist(supabase, userId, email);
    if (blocklistCheck.blocked) {
      return NextResponse.json({ error: blocklistCheck.reason, code: 'BLOCKED' }, { status: 403 });
    }

    const fraudSignalsCheck = await checkUserBlocked(supabase, userId, email, null, ip);
    if (fraudSignalsCheck.blocked) {
      return NextResponse.json({ error: fraudSignalsCheck.reason, code: 'FRAUD_BLOCKED' }, { status: 403 });
    }

    // ── Verify ICCID ownership ──────────────────────────────────────────────
    const { data: ownerOrder, error: ownerError } = await supabase
      .from('orders')
      .select('id, plan_id, iccid, customer_email')
      .eq('iccid', iccid)
      .eq('user_id', userId)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle();

    if (ownerError || !ownerOrder) {
      return NextResponse.json({ error: 'eSIM not found or not owned by you', code: 'ESIM_NOT_FOUND' }, { status: 404 });
    }

    // ── Validate package exists and get server-authoritative price ───────────
    const { data: topupPlan, error: planError } = await supabase
      .from('dataplans')
      .select('*')
      .eq('id', packageId)
      .eq('package_type', 'topup')
      .eq('is_enabled', true)
      .eq('status', 'active')
      .single();

    if (planError || !topupPlan) {
      return NextResponse.json({ error: 'Top-up package not found or unavailable', code: 'PACKAGE_NOT_FOUND' }, { status: 404 });
    }

    const validatedPrice = parseFloat(topupPlan.price);
    if (isNaN(validatedPrice) || validatedPrice <= 0) {
      return NextResponse.json({ error: 'Invalid package price', code: 'INVALID_PRICE' }, { status: 400 });
    }

    // ── Fraud rules check ───────────────────────────────────────────────────
    const fraudCheck = await checkFraudRules(supabase, userId, email, {
      amount: validatedPrice,
      currency: currency.toLowerCase(),
      metadata: { type: 'topup', iccid, packageId, ip, userAgent },
    });
    if (!fraudCheck.allowed) {
      return NextResponse.json({ error: fraudCheck.reason, code: 'FRAUD_BLOCKED' }, { status: 429 });
    }

    await trackPurchaseAttempt(supabase, {
      userId, email, amount: validatedPrice,
      currency: currency.toLowerCase(),
      metadata: { type: 'topup', iccid, packageId, ip, userAgent },
    });

    // ── Create esim_topups record ───────────────────────────────────────────
    const stripeMode = process.env.STRIPE_MODE || 'live';
    const isTestMode = stripeMode === 'test' || stripeMode === 'sandbox';
    const now = new Date().toISOString();

    const topupRecord = {
      user_id: userId,
      order_id: ownerOrder.id,
      iccid,
      airalo_package_id: packageId,
      package_name: topupPlan.name || topupPlan.title || 'Top-Up',
      data_amount: formatDataDisplay(topupPlan.data_amount_mb, topupPlan.is_unlimited),
      validity: `${topupPlan.validity_days} days`,
      price: validatedPrice,
      currency: currency.toUpperCase(),
      status: 'topup_pending_payment',
      platform: platform || 'web',
      is_test_mode: isTestMode,
      security: {
        ip,
        userAgent,
        serverTraceId: `topup_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`,
        createdAt: now,
      },
      created_at: now,
      updated_at: now,
    };

    const { data: insertedTopup, error: insertError } = await supabase
      .from('esim_topups')
      .insert(topupRecord)
      .select('id')
      .single();

    if (insertError || !insertedTopup) {
      console.error('[topup-checkout] Failed to create topup record:', insertError);
      return NextResponse.json({ error: 'Failed to create top-up order', code: 'INSERT_FAILED' }, { status: 500 });
    }

    const topupId = insertedTopup.id;
    const packageName = topupPlan.name || topupPlan.title || 'eSIM Top-Up';

    // ── Stripe payment ──────────────────────────────────────────────────────
    const finalDomain = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';
    const getLocalizedUrl = (path) => language === 'en' ? `${finalDomain}${path}` : `${finalDomain}/${language}${path}`;
    const isMobileRequest = isMobile || platform === 'ios' || platform === 'android';

    const commonMetadata = {
      type: 'topup',
      topup_id: topupId,
      order_id: topupId,  // webhook uses metadata.order_id as primary lookup
      iccid,
      user_id: userId,
      package_id: packageId,
      validated_price: validatedPrice.toString(),
    };

    const idempotencyKey = `topup_${topupId}`;

    if (isMobileRequest) {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(validatedPrice * 100),
        currency: currency.toLowerCase(),
        metadata: commonMetadata,
        payment_method_types: ['card'],
      }, { idempotencyKey });

      // Update topup record with Stripe payment intent ID
      await supabase.from('esim_topups').update({
        stripe_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      }).eq('id', topupId);

      return NextResponse.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        topupId,
        total: validatedPrice,
        currency,
        packageName,
      });
    } else {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Top-Up: ${packageName}`,
              description: `ICCID: ...${iccid.slice(-6)}`,
            },
            unit_amount: Math.round(validatedPrice * 100),
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: getLocalizedUrl(`/topup-processing/${topupId}`),
        cancel_url: getLocalizedUrl('/dashboard?topup_canceled=true'),
        customer_email: ownerOrder.customer_email || email,
        metadata: commonMetadata,
      }, { idempotencyKey });

      // Update topup record with Stripe session ID
      await supabase.from('esim_topups').update({
        stripe_session_id: session.id,
        updated_at: new Date().toISOString(),
      }).eq('id', topupId);

      return NextResponse.json({
        success: true,
        sessionUrl: session.url,
        sessionId: session.id,
        topupId,
        total: validatedPrice,
        currency,
        packageName,
      });
    }
  } catch (error) {
    console.error('[topup-checkout] Error:', error);
    return NextResponse.json({ error: 'Payment processing failed', code: 'INTERNAL_ERROR' }, { status: 500 });
  }
}

function formatDataDisplay(mb, isUnlimited) {
  if (isUnlimited) return 'Unlimited';
  if (!mb) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(mb % 1024 === 0 ? 0 : 1)} GB`;
  return `${mb} MB`;
}
```

**Step 2: Commit**

```
git add packages/customer-app/app/api/topups/
git commit -m "feat(api): add POST /api/topups/create-checkout endpoint"
```

---

### Task 4: Stripe Webhook — Add Top-Up Handler

**Files:**
- Modify: `packages/customer-app/app/api/stripe-webhook/route.js`

**Context needed:**
- Read the existing file fully — you are modifying production payment code
- Understand the atomic mutex pattern at lines 262-275
- Understand `createAiraloEsim()` at lines 130-216

**Step 1: Add `handleTopupPayment` function**

Add this function AFTER the existing `createAiraloEsim` function (after line 216) and BEFORE `handleCheckoutSessionCompleted` (before line 218):

```javascript
async function handleTopupPayment(metadata, paidAmountCents, stripeObjectId, stripeObjectType, supabase) {
  const topupId = metadata.topup_id;
  if (!topupId) return;

  const now = new Date().toISOString();

  // Fetch topup record
  const { data: topup, error: fetchErr } = await supabase
    .from('esim_topups')
    .select('*')
    .eq('id', topupId)
    .single();

  if (fetchErr || !topup) {
    console.error(`[webhook-topup] Topup ${topupId} not found:`, fetchErr?.message);
    return;
  }

  // Idempotency guard: only process if still pending payment
  if (topup.status !== 'topup_pending_payment') {
    console.info(`[webhook-topup] Topup ${topupId} already processed (status: ${topup.status})`);
    return;
  }

  // Verify paid amount matches expected
  const paidAmount = paidAmountCents / 100;
  if (Math.abs(paidAmount - parseFloat(topup.price)) > 0.01) {
    console.error(`[webhook-topup] Amount mismatch: paid ${paidAmount}, expected ${topup.price}`);
    await supabase.from('esim_topups').update({
      status: 'topup_failed',
      error_message: `Payment amount mismatch: paid ${paidAmount}, expected ${topup.price}`,
      updated_at: now,
    }).eq('id', topupId);
    return;
  }

  // Atomic status transition: pending_payment -> submitting_to_airalo
  const { data: claimed, error: claimErr } = await supabase
    .from('esim_topups')
    .update({
      status: 'topup_submitting_to_airalo',
      [`stripe_${stripeObjectType === 'session' ? 'session_id' : 'payment_intent_id'}`]: stripeObjectId,
      updated_at: now,
    })
    .eq('id', topupId)
    .eq('status', 'topup_pending_payment')
    .select('id')
    .single();

  if (claimErr || !claimed) {
    console.warn(`[webhook-topup] Topup ${topupId} claim failed — already processing`);
    return;
  }

  // ── Submit top-up to Airalo ─────────────────────────────────────────────
  try {
    const airaloMode = process.env.AIRALO_MODE || 'production';
    const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';
    const clientId = isSandbox ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID) : process.env.AIRALO_CLIENT_ID;
    const clientSecret = isSandbox ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET) : process.env.AIRALO_CLIENT_SECRET;
    const airaloBaseUrl = isSandbox ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com') : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');

    if (!clientId || !clientSecret) throw new Error('Airalo API credentials not configured');

    // Authenticate
    const authResponse = await fetch(`${airaloBaseUrl}/v2/token`, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: 'client_credentials' }),
    });
    if (!authResponse.ok) throw new Error(`Airalo auth failed: ${await authResponse.text()}`);
    const authData = await authResponse.json();
    const accessToken = authData.data?.access_token;
    if (!accessToken) throw new Error('No access token from Airalo');

    // Submit top-up order
    const orderResponse = await fetch(`${airaloBaseUrl}/v2/orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        package_id: topup.airalo_package_id,
        quantity: 1,
        type: 'sim',
        iccid: topup.iccid,
        description: `Top-up for ICCID ${topup.iccid}`,
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      throw new Error(`Airalo top-up order failed (${orderResponse.status}): ${errorText}`);
    }

    const airaloResult = await orderResponse.json();
    const airaloOrder = airaloResult.data;

    if (!airaloOrder?.id) throw new Error('No order ID returned from Airalo');

    // Success
    await supabase.from('esim_topups').update({
      status: 'topup_success',
      airalo_order_id: String(airaloOrder.id),
      updated_at: new Date().toISOString(),
    }).eq('id', topupId);

    console.info(`[webhook-topup] Top-up ${topupId} succeeded. Airalo order: ${airaloOrder.id}`);
  } catch (airaloError) {
    console.error(`[webhook-topup] Airalo error for topup ${topupId}:`, airaloError.message);
    await supabase.from('esim_topups').update({
      status: 'topup_failed',
      error_message: airaloError.message,
      updated_at: new Date().toISOString(),
    }).eq('id', topupId);
  }
}
```

**Step 2: Add topup branch to `handleCheckoutSessionCompleted`**

At the TOP of `handleCheckoutSessionCompleted` (after `if (session.payment_status !== 'paid') return;`), add:

```javascript
    // ── Top-up handling ─────────────────────────────────────────────────────
    if (session.metadata?.type === 'topup') {
      await handleTopupPayment(session.metadata, session.amount_total, session.id, 'session', supabase);
      return;
    }
```

**Step 3: Add topup branch to `handlePaymentIntentSucceeded`**

At the TOP of `handlePaymentIntentSucceeded` (after extracting `orderId`), add:

```javascript
    // ── Top-up handling ─────────────────────────────────────────────────────
    if (paymentIntent.metadata?.type === 'topup') {
      const supabase = getSupabase();
      await handleTopupPayment(paymentIntent.metadata, paymentIntent.amount, paymentIntent.id, 'payment_intent', supabase);
      return;
    }
```

**Step 4: Verify no syntax errors**

Run: `cd packages/customer-app && npx next build` or `node -e "require('./app/api/stripe-webhook/route.js')"`

**Step 5: Commit**

```
git add packages/customer-app/app/api/stripe-webhook/route.js
git commit -m "feat(webhook): add top-up payment handler to Stripe webhook"
```

---

### Task 5: Client Service — Add Top-Up Methods to esimService

**Files:**
- Modify: `packages/shared/services/esimService.js`

**Step 1: Add two new methods to the `esimService` object**

Add after the `getEsimPackageHistory` method (before the closing `};`):

```javascript
  async getAvailableTopups(iccid, authToken = null) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const response = await fetch(`/api/esims/${encodeURIComponent(iccid)}/topups`, {
        method: 'GET',
        headers,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch top-up packages');
      return result;
    } catch (error) {
      console.error('Error fetching available top-ups:', error);
      throw error;
    }
  },

  async createTopupCheckout(data, authToken = null) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
      const response = await fetch('/api/topups/create-checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to create top-up checkout');
      return result;
    } catch (error) {
      console.error('Error creating top-up checkout:', error);
      throw error;
    }
  },
```

**Step 2: Commit**

```
git add packages/shared/services/esimService.js
git commit -m "feat(service): add getAvailableTopups and createTopupCheckout to esimService"
```

---

### Task 6: UI — Add Top Up Button to QRCodeModal

**Files:**
- Modify: `packages/customer-app/src/components/dashboard/QRCodeModal.jsx`

**Context needed:**
- Read full QRCodeModal.jsx — understand the tab system, footer, and modal structure
- The "Top Up" button goes in the footer alongside the existing "Check Usage" and "Delete" buttons
- On click: fetch available top-ups, show a package selection view within the modal
- On package select: call create-checkout, redirect to Stripe

**Step 1: Add state variables and imports**

At the top of QRCodeModal, add to the existing imports:

```javascript
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
```

(Note: some of these may not exist in lucide-react — use existing icons. `Plus` is standard.)

Inside the component, add state:

```javascript
  const [showTopupPackages, setShowTopupPackages] = useState(false);
  const [topupPackages, setTopupPackages] = useState([]);
  const [loadingTopups, setLoadingTopups] = useState(false);
  const [topupError, setTopupError] = useState(null);
  const [processingTopup, setProcessingTopup] = useState(null); // packageId being purchased
```

**Step 2: Add the top-up fetch and purchase handlers**

```javascript
  const handleTopUpClick = async () => {
    if (!iccid) return;
    setShowTopupPackages(true);
    setLoadingTopups(true);
    setTopupError(null);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch(`/api/esims/${encodeURIComponent(iccid)}/topups`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to load packages');
      setTopupPackages(result.data || []);
    } catch (err) {
      setTopupError(err.message);
    } finally {
      setLoadingTopups(false);
    }
  };

  const handleTopupPurchase = async (pkg) => {
    setProcessingTopup(pkg.id);
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const response = await fetch('/api/topups/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          iccid,
          packageId: pkg.id,
          language: locale || 'en',
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Checkout failed');
      if (result.sessionUrl) {
        window.location.href = result.sessionUrl;
      }
    } catch (err) {
      toast.error(err.message || t('dashboard.topupFailed', 'Top-up failed'));
      setProcessingTopup(null);
    }
  };
```

**Step 3: Add the top-up packages view inside the content area**

Inside the `<div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">` section, add a new conditional block BEFORE the existing tab content:

```jsx
          {/* Top-Up Packages View */}
          {showTopupPackages && (
            <div className="space-y-4">
              <div className={`flex items-center gap-3 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => { setShowTopupPackages(false); setTopupError(null); }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className={`w-5 h-5 text-gray-600 ${isRTL ? 'rotate-180' : ''}`} />
                </button>
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.selectTopup', 'Select Top-Up Package')}
                </h3>
              </div>

              {loadingTopups && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-3 border-tufts-blue border-t-transparent mx-auto mb-3"></div>
                  <p className="text-gray-500">{t('dashboard.loadingTopups', 'Loading packages...')}</p>
                </div>
              )}

              {topupError && (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
                  <p className="text-red-600">{topupError}</p>
                  <button
                    onClick={handleTopUpClick}
                    className="mt-3 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    {t('common.retry', 'Retry')}
                  </button>
                </div>
              )}

              {!loadingTopups && !topupError && topupPackages.length === 0 && (
                <div className="text-center py-8">
                  <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">{t('dashboard.noTopups', 'No top-up packages available for this eSIM')}</p>
                </div>
              )}

              {!loadingTopups && !topupError && topupPackages.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handleTopupPurchase(pkg)}
                  disabled={processingTopup !== null}
                  className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                    processingTopup === pkg.id
                      ? 'border-tufts-blue bg-blue-50'
                      : 'border-gray-200 hover:border-tufts-blue hover:bg-gray-50'
                  } ${isRTL ? 'text-right' : ''} disabled:opacity-60`}
                >
                  <div className={`flex items-center justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
                    <div>
                      <p className="font-semibold text-gray-900">{pkg.dataDisplay}</p>
                      <p className="text-sm text-gray-500">{pkg.validityDays} {t('dashboard.days', 'days')}</p>
                    </div>
                    <div className={isRTL ? 'text-left' : 'text-right'}>
                      {processingTopup === pkg.id ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-tufts-blue border-t-transparent"></div>
                      ) : (
                        <p className="text-lg font-bold text-tufts-blue">${pkg.price.toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
```

**Step 4: Add Top Up button to the footer**

In the footer section, add a "Top Up" button. Find the `{/* Main Action */}` comment and add BEFORE it:

```jsx
            {/* Top Up Button - only for completed eSIMs */}
            {!showTopupPackages && iccid && selectedOrder?.status === 'completed' && (
              <button
                type="button"
                onClick={handleTopUpClick}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span>{t('dashboard.topUp', 'Top Up')}</span>
              </button>
            )}
```

**Step 5: Hide the normal tab content when showing topup packages**

Wrap all three existing tab content blocks (`{activeTab === 'qrcode' && ...}`, `{activeTab === 'details' && ...}`, `{activeTab === 'usage' && ...}`) with:

```jsx
          {!showTopupPackages && (
            <>
              {/* existing QR Code Tab */}
              {/* existing Details Tab */}
              {/* existing Usage Tab */}
            </>
          )}
```

**Step 6: Commit**

```
git add packages/customer-app/src/components/dashboard/QRCodeModal.jsx
git commit -m "feat(ui): add top-up package selection to QRCodeModal"
```

---

### Task 7: Top-Up Processing Page

**Files:**
- Create: `packages/customer-app/src/components/TopUpProcessing.jsx`
- Create: `packages/customer-app/app/topup-processing/[topupId]/page.jsx`
- Create: Same page for each language: `he/`, `ru/`, `ar/`, `de/`, `fr/`, `es/`

**Step 1: Create the TopUpProcessing component**

File: `packages/customer-app/src/components/TopUpProcessing.jsx`

```jsx
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { getSupabase } from '@esim/shared/lib/supabase';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

const TopUpProcessing = ({ topupId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUser, loading: authLoading } = useAuth();
  const { t, locale, isLoading: i18nLoading } = useI18n();

  const [status, setStatus] = useState('loading');
  const [topupData, setTopupData] = useState(null);
  const [error, setError] = useState(null);
  const pollRef = useRef(null);

  const currentLanguage = React.useMemo(() => {
    if (i18nLoading) return detectLanguageFromPath(pathname) || 'en';
    return locale || 'en';
  }, [locale, pathname, i18nLoading]);
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  useEffect(() => {
    if (authLoading || !topupId) return;

    const supabase = getSupabase();

    const fetchTopup = async () => {
      const { data, error: fetchErr } = await supabase
        .from('esim_topups')
        .select('*')
        .eq('id', topupId)
        .single();

      if (fetchErr || !data) {
        setStatus('not_found');
        setError('Top-up not found');
        return;
      }

      setTopupData(data);

      if (data.status === 'topup_success') {
        setStatus('success');
        return;
      }
      if (data.status === 'topup_failed') {
        setStatus('failed');
        setError(data.error_message || 'Top-up failed');
        return;
      }

      setStatus('processing');
    };

    fetchTopup();

    // Poll every 3 seconds
    pollRef.current = setInterval(fetchTopup, 3000);

    // Also subscribe to realtime changes
    const channel = supabase
      .channel(`topup_${topupId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'esim_topups',
        filter: `id=eq.${topupId}`,
      }, (payload) => {
        const updated = payload.new;
        setTopupData(updated);
        if (updated.status === 'topup_success') {
          setStatus('success');
          clearInterval(pollRef.current);
        } else if (updated.status === 'topup_failed') {
          setStatus('failed');
          setError(updated.error_message || 'Top-up failed');
          clearInterval(pollRef.current);
        }
      })
      .subscribe();

    return () => {
      clearInterval(pollRef.current);
      supabase.removeChannel(channel);
    };
  }, [authLoading, topupId]);

  // Auto-stop polling after 2 minutes
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (status === 'processing') {
        clearInterval(pollRef.current);
        setStatus('timeout');
        setError('Processing is taking longer than expected. Please check your dashboard.');
      }
    }, 120000);
    return () => clearTimeout(timeout);
  }, [status]);

  const getDashboardUrl = () => {
    return currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-tufts-blue border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('topup.loading', 'Loading...')}</h2>
          </>
        )}

        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-tufts-blue border-t-transparent mx-auto mb-6"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('topup.processing', 'Processing Top-Up')}</h2>
            <p className="text-gray-500">{t('topup.processingDesc', 'Your top-up is being applied to your eSIM. This usually takes a few seconds.')}</p>
            {topupData && (
              <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left">
                <p className="text-sm text-gray-500">{t('topup.package', 'Package')}</p>
                <p className="font-medium text-gray-900">{topupData.package_name}</p>
                <p className="text-sm text-gray-500 mt-2">{t('topup.amount', 'Amount')}</p>
                <p className="font-medium text-gray-900">${parseFloat(topupData.price).toFixed(2)}</p>
              </div>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{t('topup.success', 'Top-Up Successful!')}</h2>
            <p className="text-gray-500 mb-6">{t('topup.successDesc', 'Your data has been added to your eSIM.')}</p>
            {topupData && (
              <div className="mb-6 bg-emerald-50 rounded-xl p-4 text-left border border-emerald-100">
                <p className="font-medium text-emerald-800">{topupData.package_name}</p>
                <p className="text-sm text-emerald-600">{topupData.data_amount} | {topupData.validity}</p>
              </div>
            )}
            <button
              onClick={() => router.push(getDashboardUrl())}
              className="w-full py-3 bg-tufts-blue text-white rounded-xl font-medium hover:bg-tufts-blue/90 transition-colors"
            >
              {t('topup.backToDashboard', 'Back to Dashboard')}
            </button>
          </>
        )}

        {(status === 'failed' || status === 'timeout' || status === 'not_found') && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {status === 'not_found'
                ? t('topup.notFound', 'Top-Up Not Found')
                : t('topup.failed', 'Top-Up Failed')}
            </h2>
            <p className="text-gray-500 mb-6">{error || t('topup.failedDesc', 'Something went wrong. Please contact support.')}</p>
            <button
              onClick={() => router.push(getDashboardUrl())}
              className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
            >
              {t('topup.backToDashboard', 'Back to Dashboard')}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default TopUpProcessing;
```

**Step 2: Create the page wrapper files**

Root page at `packages/customer-app/app/topup-processing/[topupId]/page.jsx`:

```jsx
'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';

const TopUpProcessing = dynamic(() => import('../../../src/components/TopUpProcessing'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function TopUpProcessingPage({ params }) {
  const { topupId } = use(params);
  return <TopUpProcessing topupId={topupId} />;
}
```

Create identical files for each language prefix (he, ru, ar, de, fr, es), adjusting the import path depth:

For `packages/customer-app/app/{lang}/topup-processing/[topupId]/page.jsx`:

```jsx
'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';

const TopUpProcessing = dynamic(() => import('../../../../src/components/TopUpProcessing'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

export default function TopUpProcessingPage({ params }) {
  const { topupId } = use(params);
  return <TopUpProcessing topupId={topupId} />;
}
```

Languages to create: `he`, `ru`, `ar`, `de`, `fr`, `es`

**Step 3: Commit**

```
git add packages/customer-app/src/components/TopUpProcessing.jsx
git add packages/customer-app/app/topup-processing/
git add packages/customer-app/app/he/topup-processing/
git add packages/customer-app/app/ru/topup-processing/
git add packages/customer-app/app/ar/topup-processing/
git add packages/customer-app/app/de/topup-processing/
git add packages/customer-app/app/fr/topup-processing/
git add packages/customer-app/app/es/topup-processing/
git commit -m "feat(ui): add top-up processing page with realtime status polling"
```

---

### Task 8: Update Schema Documentation

**Files:**
- Modify: `server/supabase/schema.sql`

**Step 1: Append `esim_topups` table definition to schema.sql**

Add at the end of the file:

```sql
CREATE TABLE public.esim_topups (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id text NOT NULL,
  iccid text NOT NULL,
  airalo_package_id text NOT NULL,
  package_name text,
  data_amount text,
  validity text,
  price numeric NOT NULL,
  currency text DEFAULT 'USD'::text,
  stripe_session_id text,
  stripe_payment_intent_id text,
  airalo_order_id text,
  status text NOT NULL DEFAULT 'topup_pending_payment'::text CHECK (status = ANY (ARRAY['topup_pending_payment'::text, 'topup_payment_confirmed'::text, 'topup_submitting_to_airalo'::text, 'topup_success'::text, 'topup_failed'::text])),
  error_message text,
  platform text DEFAULT 'web'::text,
  is_test_mode boolean DEFAULT false,
  security jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT esim_topups_pkey PRIMARY KEY (id)
);
```

**Step 2: Commit**

```
git add server/supabase/schema.sql
git commit -m "docs(schema): add esim_topups table definition"
```

---

### Task 9: Verification & Smoke Test

**Step 1: Build check**

```bash
cd packages/customer-app && npx next build
```

Verify no build errors.

**Step 2: Verify database**

Use Supabase MCP:
- `list_tables` — confirm `esim_topups` exists
- `execute_sql` — `SELECT COUNT(*) FROM esim_topups` (should be 0)
- `get_advisors` type `security` — confirm no RLS warnings

**Step 3: Verify API routes exist**

Start dev server and test:
- `GET /api/esims/test-iccid/topups` → should return 401 (no auth)
- `POST /api/topups/create-checkout` with empty body → should return 401

**Step 4: Final commit**

If any fixes were needed during verification, commit them.

---

## Summary of All Files

| # | File | Action | Task |
|---|------|--------|------|
| 1 | Supabase migration | Apply via MCP | Task 1 |
| 2 | `server/supabase/schema.sql` | Append table def | Task 1, 8 |
| 3 | `packages/customer-app/app/api/esims/[iccid]/topups/route.js` | Create | Task 2 |
| 4 | `packages/customer-app/app/api/topups/create-checkout/route.js` | Create | Task 3 |
| 5 | `packages/customer-app/app/api/stripe-webhook/route.js` | Modify | Task 4 |
| 6 | `packages/shared/services/esimService.js` | Modify | Task 5 |
| 7 | `packages/customer-app/src/components/dashboard/QRCodeModal.jsx` | Modify | Task 6 |
| 8 | `packages/customer-app/src/components/TopUpProcessing.jsx` | Create | Task 7 |
| 9 | `packages/customer-app/app/topup-processing/[topupId]/page.jsx` | Create | Task 7 |
| 10 | `packages/customer-app/app/{he,ru,ar,de,fr,es}/topup-processing/[topupId]/page.jsx` | Create (x6) | Task 7 |
