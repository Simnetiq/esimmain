# Simnetiq Landing Page Redesign — Design Spec

**Date:** 2026-03-14
**Project:** customer-app (simnetiq.store)
**Goal:** Rebuild the landing page with a dark theme, 17 sections, animated comparisons, and conversion-focused design to drive web sales and app downloads.

---

## Context

- Zero web sales to date despite live App Store presence
- Current landing: 5 generic sections, light theme, no differentiation
- Competitors: Airalo (supplier), Holafly, aloSIM, Nomad eSIM
- Simnetiq resells Airalo plans — cannot compete on price directly
- Differentiators: Simplicity, coverage + flexibility, trust + transparency
- Promo codes provide the price advantage

## Visual System

### Color Palette (Dark Theme)

| Role | Value |
|------|-------|
| Background primary | `#0a0a0a` |
| Background secondary | `#141414` |
| Card background | `rgba(255,255,255,0.05)` |
| Card border | `rgba(255,255,255,0.1)` |
| Text primary | `#f5f5f5` |
| Text muted | `#a0a0a0` |
| Accent primary | `#4975D4` (tufts blue) |
| Accent success | `#22c55e` (green for savings/trust) |
| Accent highlight | `#f59e0b` (amber for promos/badges) |

### Typography

- **Primary:** DM Sans (latin)
- **Fallback:** Open Sans (Cyrillic, Hebrew, Arabic)
- **No IBM Plex Sans Italic** — use accent color for highlights instead
- Heading scale: h1 4xl→8xl responsive, h2 2xl→4xl, body sm→lg

### Cards

- Semi-transparent: `bg-white/5`, border `white/10`
- Hover: border glow on accent color, subtle lift
- Border radius: 2xl (16px)
- Padding: 6 (24px)

### Animations

- Scroll-triggered fade-up reveals (6px translate + opacity, staggered delays)
- Animated counters for stats (count up on viewport entry)
- Animated horizontal bar charts for comparison sections
- All respect `prefers-reduced-motion`

---

## Sections (17 total)

### 1. Hero

Full viewport height, centered content, dark background with subtle animated gradient mesh (dark blue/purple aurora) and dot grid overlay.

**Content stack:**
1. Promo banner strip: "Use code TRAVEL20 for 20% off your first eSIM" with pulse animation
2. Headline (4xl→8xl): "Stay connected **anywhere** in the world" — "anywhere" in accent blue
3. Subheadline: "Instant eSIM activation for 200+ countries. No SIM cards, no roaming fees, no hassle."
4. Dual CTAs: "Explore eSIM Plans" (solid blue) + "Download App" (outline/ghost)
5. Trust badges: "200+ Countries" | "Instant Activation" | "5-Star Rated" | "7-Day Refund"

**Notes:**
- No hero image — fast LCP, lets headline breathe
- h1 is the LCP element — must render without delay
- Promo code is the first thing visitors see

### 2. Trust Indicators

4-card horizontal row (2x2 on mobile). Glass cards (`bg-white/5`).

| Card | Icon | Copy |
|------|------|------|
| No Roaming Fees | Shield | Save hundreds on international data charges |
| QR Activation | QR Code | Scan, activate, connect — under 2 minutes |
| 18 Languages | Globe | Support in your language, wherever you're from |
| Money-Back Guarantee | Checkmark | 7-day full refund on unused plans |

### 3. How It Works

3 connected steps, horizontal flow (vertical on mobile). Connected by a static dashed line between steps with a subtle CSS `stroke-dashoffset` animation on viewport entry (SVG-based). On mobile vertical layout, the line runs vertically between steps. If animation causes TBT issues during implementation, fall back to a static dashed line — the animation is nice-to-have, not critical.

1. **Choose Your Plan** — map pin icon — "Pick your destination and data plan from 200+ countries"
2. **Scan QR Code** — QR icon — "Receive your QR code instantly and scan it with your phone"
3. **You're Connected** — wifi icon — "Data activates automatically when you arrive. That's it."

Large faded step numbers (01, 02, 03) in background.

### 4. Plans Preview

Existing country cards + plan grid adapted to dark theme. Same component logic and layout.

- Dark card backgrounds with subtle border glow
- White text, accent blue for prices and badges
- Show top 12 countries on homepage
- Region tabs remain (Popular, Europe, Asia, etc.)
- Bottom CTA: "View All 200+ Destinations →"

**Component reuse:** Existing `PlansSection` / `EsimPlans` adapted for dark theme only. This section should NOT use `dynamic()` lazy loading — it is close enough to the fold that lazy loading would cause visible layout shift. Load it eagerly like the current implementation. Only sections 5+ (below plans) should be lazy-loaded.

### 5. eSIM vs Physical SIM (Comparison Table)

2-column table. Left = Physical SIM (muted gray), Right = eSIM (green checkmarks, blue glow).

| Aspect | Physical SIM | eSIM |
|--------|-------------|------|
| Activation | Find a store, wait in line | Scan QR, ready in 2 min |
| Availability | Airport/city shops only | Buy online, anytime |
| Switching plans | Buy new card, swap physically | Add new plan digitally |
| Keep your number | Must remove main SIM | Runs alongside your SIM |
| Multiple countries | New SIM per country | Switch plans instantly |
| Cost | Store markup + taxi to shop | Direct pricing, no extras |

Row hover highlights the comparison.

### 6. Simnetiq vs Roaming Costs

Animated horizontal bar chart triggered on scroll.

**Bars:**
Developer must verify these rates against carrier pricing pages at implementation time and document sources in a code comment. Approximate starting points:
- T-Mobile roaming (Turkey): ~$10/day ($70/week) → red/orange bar — source: t-mobile.com/international
- Vodafone roaming (Europe): ~$8/day ($56/week) → red/orange bar — source: vodafone.com/roaming
- Orange roaming (Asia): ~$12/day ($84/week) → red/orange bar — source: orange.com/en/roaming
- **Simnetiq eSIM:** use actual min_price from Supabase `countries` table for Turkey/Europe/Asia → green bar

If exact carrier rates cannot be verified, use the generic framing "Typical carrier roaming" without naming specific carriers.

**Stat boxes below:** "Save up to 90%" | "From $3/week" | "No surprise bills" | "Cancel anytime"

Bars animate from 0% to final width over 1000ms on viewport entry.

### 7. Features Bento Grid

6 cards in bento layout — 1 large hero card (2 columns), 5 smaller cards.

1. **Global Coverage** (hero, large) — world map/globe graphic, "200+ countries, 400+ carriers. One app." Animated counter: "200+"
2. **Instant Activation** — zap icon, "From purchase to connected in under 2 minutes"
3. **Top-Up Anytime** — refresh icon, "Running low? Add more data without reinstalling your eSIM"
4. **Secure Payments** — lock icon, "Stripe-powered checkout. Apple Pay, Google Pay, all major cards."
5. **Multi-Language** — languages icon, "Full support in 18 languages including Arabic, Hebrew, Japanese, and more"
6. **Dedicated Support** — headset icon, "Real human support via email and in-app. No chatbots."

**Note:** Do not claim "24/7" unless support staffing confirms this. Use "Dedicated Support" as the card title instead.

Cards have subtle background gradients, hover lift with border glow.

### 8. Coverage Stats

Full-width section with 4 animated counters + region grid.

**Counters (animate on scroll):**
- **200+** Countries
- **400+** Data Plans
- **18** Languages
- **2 min** Average Activation

**Region grid below:** Europe, Asia, Americas, Africa, Oceania, Middle East — each with flag thumbnails of top 4-5 countries, plan count, link to `/esim-plans?region=X`.

### 9. Device Compatibility

Slim horizontal strip. 3 brand columns:

- **iPhone** — XS, XR, 11-16 series, SE 3rd gen
- **Samsung** — Galaxy S20+, Z Fold/Flip, A54+
- **Google** — Pixel 3+, all newer models

"Not sure if your device supports eSIM?" link to FAQ anchor. Compact — not a full section.

### 10. Promo Code Banner

Full-width accent gradient banner (dark blue → dark purple).

- Large text: "Get **20% off** your first eSIM plan"
- Copy-able promo code pill with copy button
- CTA: "Shop Plans Now →"
- Fine print: "Valid for new customers. One use per account."
- Subtle sparkle/glow animation on the code badge

**Implementation:** The displayed promo code and discount percentage must be read from the `promo_codes` table in Supabase (or from an `app_config` row), NOT hardcoded in JSX. This allows changing the active promo without redeploying. If no active promo exists in the database, this section and all promo references (hero banner, final CTA) should be hidden. `TRAVEL20` is the initial code to create in the database — confirm it exists before launch.

### 11. App Download

Split card — left: text + CTAs, right: phone mockup screenshot.

- Badge: conditionally rendered — show "AVAILABLE ON IOS & ANDROID" only if both store URLs are set, otherwise "AVAILABLE ON IOS"
- Headline: "Manage everything from your phone"
- Bullets: "Buy and activate eSIMs", "Monitor data usage in real-time", "Top up with one tap", "Get QR codes instantly"
- CTAs: App Store badge button (always shown). Google Play badge button only rendered if `NEXT_PUBLIC_GOOGLE_PLAY_URL` env var is set. The Simnetiq app is React Native (Expo) so Android may or may not be live on Google Play at launch time.

### 12. Doppler VPN Cross-sell

Compact dark card, secondary prominence.

- Badge: "By Simnetiq"
- Headline: "Doppler VPN"
- One-liner: "No-logs VPN with WireGuard + VLESS. Up to 10 devices."
- Promo: "Use code LAUNCH20 for 20% off"
- CTA: "Learn More →" → dopplervpn.com

### 13. Social Proof

Centered section.

- Large 5-star display with App Store icon
- 2-3 quote cards

**BLOCKER:** Quotes must be sourced from real App Store reviews or real customer support interactions. The placeholder examples below are NOT to be shipped — they are illustrative only:
  - Example: "Activated my eSIM before I even landed in Istanbul. So easy."
  - Example: "Finally a travel data app that just works. No hassle."

Before launch, product owner must provide verified quotes or approve pulling directly from App Store reviews via the App Store Connect API. If no real quotes are available at launch time, this section renders only the 5-star rating display without quote cards.

- Bottom: "Trusted by travelers in 200+ countries"

### 14. FAQ

2-column accordion grid (1 column mobile). Same 8 questions from translation files, restyled for dark theme.

Cards: `bg-white/5`, smooth expand, chevron rotation. Same i18n data — no content changes.

### 15. Blog Posts

3-column grid, dark cards. Same Supabase fetch — top 3 published posts. "View All Articles →" link.

### 16. Final CTA

Full-width gradient section (dark blue → accent blue).

- Headline: "Ready to stay connected worldwide?"
- Subheadline: "Get your eSIM in minutes. Works on any unlocked device."
- Dual CTAs: "Browse Plans" (solid) + "Download App" (outline)
- Small text: "Use code TRAVEL20 for 20% off" (final reminder)

### 17. Footer

Restyled current footer for dark theme. Same link structure. Language selector updated to 18 languages.

---

## New Languages (5 additions)

Adding to existing 13 (en, es, fr, de, ar, he, hi, ja, pl, pt, ru, uk, zh):

- **Korean (ko)**
- **Turkish (tr)**
- **Italian (it)**
- **Thai (th)**
- **Dutch (nl)**

**Required changes:**
- New locale folders: `app/ko/`, `app/tr/`, `app/it/`, `app/th/`, `app/nl/`
- New translation files: `public/locales/{ko,tr,it,th,nl}/common.json`
- Updated middleware language detection
- Updated sitemap.js language list
- Updated metadata.js with locale-specific SEO metadata
- Updated `generateAlternates()` helper
- New country page layouts for each locale: create `app/{ko,tr,it,th,nl}/esim/[country]/layout.jsx` and `page.jsx` files following the exact same pattern as existing locale country pages (e.g., `app/es/esim/[country]/`). These are layout files with `generateMetadata()` for locale-specific canonical/hreflang, and page files that render the shared `EsimCountryPage` component.

Translation content handled separately by parallel-translator agent after rebuild.

---

## Components to Reuse

- `PlansSection` / `EsimPlans` — adapt colors only
- `TravelBlogsSection` — adapt colors only
- FAQ data from translation files — rebuild visual, keep data
- Plan card component — invert theme
- Country card component — invert theme

## Components to Rebuild

- HeroSection (completely new)
- FeaturesSection (bento grid, new layout)
- ActivationSection (split into How It Works + App Download + Doppler cross-sell)
- All new sections (Trust, Comparisons, Stats, Promo, Social Proof, Final CTA)
- Navbar (dark theme adaptation)
- Footer (dark theme adaptation)

## Performance Constraints

- **NEVER regress Google PageSpeed scores** — LCP and TBT are critical
- h1 headline is the LCP element — no state-dependent rendering delays
- Comparison chart animations must use CSS transforms (GPU-accelerated)
- Lazy load all sections below the fold via `dynamic()` imports
- Images in AVIF format with next/image optimization
- Animated counters/charts trigger only on viewport entry (IntersectionObserver)

## Constraints

- Do NOT hardcode API keys or credentials
- Do NOT change existing page URLs or routing structure
- Do NOT modify Supabase RLS policies
- All non-English metadata must be in the target language
- Keep meta descriptions under 160 characters
- Keep titles under 60 characters
- Existing plan cards and country grid design preserved (dark theme only)
