# Top-Up eSIM Feature Design

**Date:** 2026-02-20
**Status:** Approved

## Overview

Add the ability for authenticated users to purchase data top-ups for their existing activated eSIMs. Top-up packages are already synced into the `dataplans` table (1830 top-up plans, `package_type = 'topup'`). Payment is Stripe-only, webhook-driven, with no client-side Airalo calls.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Architecture | Extend existing webhook (Approach A) | Matches codebase conventions, minimal risk |
| eSIM FK | Both order_id + iccid | Maximum traceability and security |
| Promos | No promo/referral support | Simplicity; can add later |
| Mobile | Dual-mode from day one | Matches existing create-payment-order pattern |
| Auth | Required | Needed for ICCID ownership verification |
| Package source | `dataplans` table (DB-first) | 1830 packages already synced; consistent with how regular purchases validate price |
| Price validation | `dataplans.price` (server-authoritative) | Same pattern as existing purchase flow |

## Data Discovery

Top-up packages live in `dataplans` table with `package_type = 'topup'`:
- 1830 top-up plans, 2025 SIM plans
- ID pattern: `{sim-plan-id}-topup` (e.g., `change-in-7days-1gb-topup`)
- Matched to SIMs by `operator_id + country_iso`
- `plan_topups` table exists but is empty (unused)

## State Machine

```
topup_pending_payment --> topup_payment_confirmed --> topup_submitting_to_airalo
                                                            |
                                                  +---------+---------+
                                                  v                   v
                                           topup_success        topup_failed
```

All transitions are webhook-driven. No client can advance the state.

## Database Schema

### esim_topups table

```sql
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

CREATE INDEX idx_esim_topups_user_id ON public.esim_topups(user_id);
CREATE INDEX idx_esim_topups_iccid ON public.esim_topups(iccid);
CREATE INDEX idx_esim_topups_status ON public.esim_topups(status);
CREATE INDEX idx_esim_topups_stripe_session ON public.esim_topups(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

ALTER TABLE public.esim_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own topups"
  ON public.esim_topups FOR SELECT
  USING (auth.uid() = user_id);
```

## API Endpoints

### GET /api/esims/[iccid]/topups

Fetches available top-up packages by querying `dataplans` table.

- Auth required (JWT or session)
- Verify ICCID ownership against orders table
- Look up original order's plan_id -> get operator_id + country_iso
- Query dataplans WHERE package_type='topup' AND operator_id=? AND country_iso=?
- Returns normalized package list

### POST /api/topups/create-checkout

Creates Stripe payment session and esim_topups record.

- Auth required
- Validates ICCID ownership
- Validates package exists in dataplans (server-authoritative price)
- Rate limit + blocklist + fraud checks (reuse existing)
- Inserts esim_topups row (status: topup_pending_payment)
- Creates Stripe Checkout Session (web) or PaymentIntent (mobile)
- Metadata includes: type=topup, topup_id, iccid, user_id

### Stripe Webhook Modification

Adds topup branch to handleCheckoutSessionCompleted and handlePaymentIntentSucceeded:

1. Detect metadata.type === 'topup'
2. Fetch esim_topups row
3. Guard for idempotency (check status)
4. Verify paid amount
5. Atomic status update
6. Submit to Airalo: POST /v2/orders with type=topup, iccid
7. Update status to topup_success or topup_failed

## Fraud & Integrity

- Server-authoritative pricing from dataplans table
- Stripe amount === DB price (verified at checkout + webhook)
- ICCID ownership verification (user must own the eSIM)
- Auth required for all top-up operations
- Webhook-driven fulfillment only
- Idempotent webhook handling (status guards)
- Rate limiting and blocklist reuse

## UI Flow

1. QRCodeModal footer: "Top Up" button (only for completed eSIMs with ICCID)
2. Package selection view with cards (name, data, validity, price)
3. Stripe redirect on selection
4. /topup-processing/[topupId] polling page
5. Success/failure display

## Mobile Contract

```
GET  /api/esims/{iccid}/topups     (Authorization: Bearer <jwt>)
POST /api/topups/create-checkout   ({ iccid, packageId, isMobile: true, platform })
--> Returns: { clientSecret, topupId }
Poll: esim_topups.status via Supabase client
```

## Files

| File | Action |
|------|--------|
| Supabase migration | New: esim_topups table + RLS |
| app/api/esims/[iccid]/topups/route.js | New |
| app/api/topups/create-checkout/route.js | New |
| app/api/stripe-webhook/route.js | Modify |
| src/components/dashboard/QRCodeModal.jsx | Modify |
| src/components/TopUpProcessing.jsx | New |
| topup-processing/[topupId]/page.jsx (+ lang variants) | New |
| packages/shared/services/esimService.js | Modify |
| server/supabase/schema.sql | Update |
