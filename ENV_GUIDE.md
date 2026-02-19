# Environment Variables Guide

## Required for Checkout Security

```env
# Stripe — live keys
STRIPE_MODE=live
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...   # Get from Stripe Dashboard > Webhooks

# Stripe — test keys (required when STRIPE_MODE=test)
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_...   # ⚠️ CRITICAL: missing = webhooks unverified in test mode
                                        # Get from: Stripe CLI → stripe listen → webhook signing secret
                                        # OR Stripe Dashboard > Webhooks > test endpoint

# Base URL — used for success/cancel redirect URLs (never trust client value)
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## Security Notes

1. **Webhook secret is mandatory** — The server rejects all webhook requests if
   `STRIPE_WEBHOOK_SECRET_*` is not set. Do not skip this.

2. **Never put live keys in test env** and vice versa.

3. **NEXT_PUBLIC_BASE_URL** must match your actual domain exactly (no trailing slash).
   Used in Stripe Checkout success/cancel URLs — if wrong, redirects will break.

4. **Restricted API key** (recommended): Create a restricted Stripe key that only
   has permissions for: Checkout Sessions, PaymentIntents, PaymentMethods, Charges,
   Radar. Use it instead of the full secret key.
   Dashboard → Developers → API Keys → Create restricted key

5. **Rotate webhook secrets** periodically via Stripe Dashboard → Webhooks → Roll secret.
