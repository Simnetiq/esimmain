# Simnetiq eSIM Platform (Monorepo)

## Overview
npm workspaces monorepo with customer-facing app, admin panel, and shared package.
eSIM purchasing platform with Stripe payments, multi-language support, promo codes.

## Tech Stack
- **Framework:** Next.js (App Router) per package
- **Monorepo:** npm workspaces
- **Backend:** Supabase (ref: `eujmomonscnlmwcbkbfy`)
- **Payments:** Stripe (webhook: simnetiq.store/api/stripe-webhook)
- **Email:** React Email templates, SMTP via Hostinger (support@simnetiq.store)
- **Deployment:** Vercel (simnetiq.store)

## Directory Structure
```
packages/
  customer-app/   # Customer-facing Next.js app (simnetiq.store)
  admin-app/      # Admin panel Next.js app
  shared/         # Shared types, utils, Supabase client
```

## Workspace Commands
```bash
npm run dev:customer    # Customer app dev
npm run dev:admin       # Admin app dev
npm run build:customer  # Build customer app
npm run build:admin     # Build admin app
npm run build:all       # Build everything
npm run clean           # Remove node_modules, .next, dist
```

## Key Tables (Supabase)
countries, dataplans, regions, blog_posts, blog_post_translations, country_translations, plan_topups, plan_translations, region_translations, regional_plans, translation_jobs, user_esims, fcm_tokens, promo_codes

## Key Patterns
- Promo code system: promoServerService.js, /api/promo/validate, PromoCodesManagement tab
- Stripe webhook handles: checkout.session.completed, payment_intent.succeeded, charge.refunded
- i18n via locale folders in public/locales/{lang}/common.json
- RTL support for Hebrew and Arabic

## Important Notes
- Firebase -> Supabase migration COMPLETE (mobile app migrated, 208 users lazy-migrate)
- Stripe SDK: v2025-01-27.acacia
- Admin panel: Promos tab, Finances with transactions view
- Need to add 3 Stripe webhook events: charge.blocked, radar.early_fraud_warning.created, payment_intent.requires_action
- App Store live but poor ASO (2.2% page view rate)
