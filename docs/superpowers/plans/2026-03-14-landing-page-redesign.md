# Simnetiq Landing Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild simnetiq.store landing page from a 5-section light theme into a 17-section dark-theme conversion funnel with animated comparisons, database-driven promo codes, and 5 new languages.

**Architecture:** Server component page wrapper with eager Hero + PlansSection, lazy-loaded sections below fold via `dynamic()`. New utility components (Reveal, AnimatedCounter) used across all sections. Promo codes fetched from Supabase `promo_codes` table at render time. Dark theme applied globally via CSS variables + Tailwind config. 5 new locale folders follow existing `app/es/` pattern exactly.

**Tech Stack:** Next.js (App Router), Tailwind CSS v3, react-i18next, Supabase, Stripe, Vercel

**Spec:** `docs/superpowers/specs/2026-03-14-landing-page-redesign-design.md`

---

## File Structure

### New Files (Create)

| File | Responsibility |
|------|---------------|
| `src/components/ui/Reveal.jsx` | Scroll-triggered fade-up wrapper (IntersectionObserver) |
| `src/components/ui/AnimatedCounter.jsx` | Count-up animation on viewport entry |
| `src/components/sections/NewHeroSection.jsx` | Dark hero with gradient mesh, promo banner, h1 LCP |
| `src/components/sections/TrustIndicators.jsx` | 4 glass cards horizontal row |
| `src/components/sections/HowItWorks.jsx` | 3-step connected flow |
| `src/components/sections/ComparisonTable.jsx` | eSIM vs Physical SIM table |
| `src/components/sections/RoamingComparison.jsx` | Animated bar chart + stat boxes |
| `src/components/sections/FeaturesBento.jsx` | 6-card bento grid |
| `src/components/sections/CoverageStats.jsx` | 4 counters + region grid |
| `src/components/sections/DeviceCompatibility.jsx` | Slim device strip |
| `src/components/sections/PromoCodeBanner.jsx` | Gradient promo banner from Supabase |
| `src/components/sections/AppDownload.jsx` | Split card with store buttons |
| `src/components/sections/DopplerCrossSell.jsx` | Compact VPN cross-sell card |
| `src/components/sections/SocialProof.jsx` | 5-star rating display |
| `src/components/sections/FAQSection.jsx` | 2-column dark accordion |
| `src/components/sections/FinalCTA.jsx` | Full-width gradient CTA |
| `src/lib/getActivePromo.js` | Server-side Supabase query for active promo code |
| `src/components/HomePageWrapper.jsx` | Client wrapper for auth redirect + RTL on homepage |
| `app/ko/layout.jsx` | Korean locale metadata |
| `app/ko/page.jsx` | Korean homepage |
| `app/tr/layout.jsx` | Turkish locale metadata |
| `app/tr/page.jsx` | Turkish homepage |
| `app/it/layout.jsx` | Italian locale metadata |
| `app/it/page.jsx` | Italian homepage |
| `app/th/layout.jsx` | Thai locale metadata |
| `app/th/page.jsx` | Thai homepage |
| `app/nl/layout.jsx` | Dutch locale metadata |
| `app/nl/page.jsx` | Dutch homepage |
| `app/{ko,tr,it,th,nl}/esim/[country]/layout.jsx` | Country page metadata per locale (5 files) |
| `app/{ko,tr,it,th,nl}/esim/[country]/page.jsx` | Country page render per locale (5 files) |
| `public/locales/{ko,tr,it,th,nl}/common.json` | Translation placeholder files (5 files) |

### Modified Files

| File | Change |
|------|--------|
| `src/components/cta/ExploreStoreCTA.jsx` | Add `darkPrimary` variant for dark backgrounds |
| `src/components/cta/PlatformDownloadCTA.jsx` | Add `outline` variant for dark backgrounds |
| `src/components/sections/index.js` | Update barrel exports for new sections |
| `public/locales/en/common.json` | Add new i18n keys for all new sections |
| `tailwind.config.js` | Add dark theme color tokens |
| `app/globals.css` | Dark theme base styles, new animation keyframes |
| `app/page.jsx` | Complete rewrite — server component wrapper with 17 sections |
| `app/layout.jsx` | Change body bg/text, remove grid rails, update JSON-LD languages |
| `src/components/Navbar.jsx` | Dark theme color inversion |
| `src/components/Footer.jsx` | Dark theme color inversion |
| `src/components/EsimPlans.jsx` | Dark theme card colors |
| `src/components/sections/TravelBlogsSection.jsx` | Dark theme card colors |
| `middleware.js` | Add ko, tr, it, th, nl to language lists |
| `app/sitemap.js` | Add 5 new languages |
| `src/config/metadata.js` | Add 5 language entries + update generateAlternates |

---

## Chunk 1: Dark Theme Foundation

### Task 1: Update Tailwind Config with Dark Theme Colors

**Files:**
- Modify: `packages/customer-app/tailwind.config.js`

- [ ] **Step 1: Add dark theme color tokens to tailwind.config.js**

Add these colors to the `extend.colors` object:

```js
// Dark theme additions
'bg-primary': '#0a0a0a',
'bg-secondary': '#141414',
'text-primary': '#f5f5f5',
'text-muted': '#a0a0a0',
'accent-success': '#22c55e',
'accent-highlight': '#f59e0b',
```

Keep all existing colors (jordy-blue, tufts-blue, etc.) intact.

- [ ] **Step 2: Verify config is valid**

Run: `cd packages/customer-app && npx tailwindcss --help > /dev/null 2>&1 && echo "OK"`

- [ ] **Step 3: Commit**

```bash
git add packages/customer-app/tailwind.config.js
git commit -m "feat: add dark theme color tokens to Tailwind config"
```

---

### Task 2: Update globals.css with Dark Theme Base Styles

**Files:**
- Modify: `packages/customer-app/app/globals.css`

- [ ] **Step 1: Add dark theme CSS variables**

In the `:root` block inside `@layer base`, add:

```css
/* Dark theme colors */
--bg-primary: #0a0a0a;
--bg-secondary: #141414;
--text-primary: #f5f5f5;
--text-muted: #a0a0a0;
--accent-success: #22c55e;
--accent-highlight: #f59e0b;
```

- [ ] **Step 2: Update body styles for dark theme**

Change the body rule:

```css
body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  /* keep existing font-family, overflow-x, max-width */
}
```

- [ ] **Step 3: Add glass card component styles**

In `@layer components`, add:

```css
/* Dark theme glass cards */
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  transition: border-color 0.3s ease, transform 0.3s ease;
}
.glass-card:hover {
  border-color: rgba(73, 117, 212, 0.3);
  transform: translateY(-2px);
}
```

- [ ] **Step 4: Add scroll-triggered reveal animation keyframes**

In `@layer utilities`, add:

```css
/* Scroll-triggered fade-up reveal */
@keyframes revealUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-reveal {
  animation: revealUp 0.5s ease-out both;
}

/* Animated bar chart grow */
@keyframes barGrow {
  from { width: 0%; }
}
.animate-bar {
  animation: barGrow 1s ease-out both;
}

/* Hero gradient mesh */
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
.animate-gradient-mesh {
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

/* Promo banner pulse */
@keyframes promoPulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.85; }
}
.animate-promo-pulse {
  animation: promoPulse 2s ease-in-out infinite;
}

/* Reduced motion overrides */
@media (prefers-reduced-motion: reduce) {
  .animate-reveal,
  .animate-bar,
  .animate-gradient-mesh,
  .animate-promo-pulse {
    animation: none !important;
  }
  .animate-reveal {
    opacity: 1;
    transform: none;
  }
  .animate-bar {
    width: var(--bar-width) !important;
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add packages/customer-app/app/globals.css
git commit -m "feat: add dark theme base styles and animation keyframes"
```

---

### Task 3: Create Reveal.jsx Utility Component

**Files:**
- Create: `packages/customer-app/src/components/ui/Reveal.jsx`

- [ ] **Step 1: Create the component**

```jsx
'use client';

import { useEffect, useRef, useState } from 'react';

export default function Reveal({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
        transition: `opacity 0.5s ease-out ${delay}ms, transform 0.5s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/ui/Reveal.jsx
git commit -m "feat: add Reveal scroll-triggered animation wrapper"
```

---

### Task 4: Create AnimatedCounter.jsx Utility Component

**Files:**
- Create: `packages/customer-app/src/components/ui/AnimatedCounter.jsx`

- [ ] **Step 1: Create the component**

```jsx
'use client';

import { useEffect, useRef, useState } from 'react';

export default function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1500 }) {
  const ref = useRef(null);
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setCount(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          observer.unobserve(entry.target);

          const startTime = performance.now();
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return (
    <span ref={ref}>
      {prefix}{count}{suffix}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/ui/AnimatedCounter.jsx
git commit -m "feat: add AnimatedCounter viewport-triggered component"
```

---

## Chunk 2: CTA Components Update + Server-side Promo + New Hero

### Task 5a: Update CTA Components for Dark Theme

**Files:**
- Modify: `packages/customer-app/src/components/cta/ExploreStoreCTA.jsx`
- Modify: `packages/customer-app/src/components/cta/PlatformDownloadCTA.jsx`

- [ ] **Step 1: Add `darkPrimary` variant to ExploreStoreCTA**

In the `variantClasses` object, add:

```js
darkPrimary: 'bg-tufts-blue text-white shadow-lg shadow-tufts-blue/20 hover:bg-tufts-blue/90 hover:scale-[1.02]',
```

Also update the arrow circle for dark variants — when variant is `darkPrimary`, the circle bg should be `bg-white/20` instead of `bg-white`:

```js
const circleClass = variant === 'darkPrimary' ? 'bg-white/20' : 'bg-white';
const iconClass = variant === 'darkPrimary' ? 'text-white' : 'text-eerie-black';
```

- [ ] **Step 2: Add `outline` variant to PlatformDownloadCTA**

In DownloadButton's `variantClasses`, add:

```js
outline: 'bg-transparent text-white border border-white/20 shadow-sm hover:border-white/40 hover:bg-white/5',
```

In `circleClasses`, add:

```js
outline: 'bg-white/10',
```

- [ ] **Step 3: Commit**

```bash
git add packages/customer-app/src/components/cta/ExploreStoreCTA.jsx packages/customer-app/src/components/cta/PlatformDownloadCTA.jsx
git commit -m "feat: add dark theme CTA variants for landing page"
```

---

### Task 5b: Add New Translation Keys to English common.json

**Files:**
- Modify: `packages/customer-app/public/locales/en/common.json`

- [ ] **Step 1: Add new i18n keys for all new sections**

Add these key groups to the English `common.json`:

```json
"hero": {
  ...existing keys...,
  "darkHeadlinePart1": "Stay connected",
  "darkHeadlineHighlight": "anywhere",
  "darkHeadlinePart2": "in the world",
  "darkSubtitle": "Instant eSIM activation for 200+ countries. No SIM cards, no roaming fees, no hassle.",
  "promoPrefix": "Use code",
  "promoSuffix": "for {discount}% off your first eSIM",
  "fiveStarRated": "5-Star Rated",
  "sevenDayRefund": "7-Day Refund"
},
"trust": {
  "title": "Why Travelers Trust Simnetiq",
  "noRoamingFees": "No Roaming Fees",
  "noRoamingFeesDesc": "Save hundreds on international data charges",
  "qrActivation": "QR Activation",
  "qrActivationDesc": "Scan, activate, connect — under 2 minutes",
  "languages": "18 Languages",
  "languagesDesc": "Support in your language, wherever you're from",
  "moneyBack": "Money-Back Guarantee",
  "moneyBackDesc": "7-day full refund on unused plans"
},
"howItWorks": {
  "title": "How It Works",
  "subtitle": "Three simple steps to stay connected",
  "step1Title": "Choose Your Plan",
  "step1Desc": "Pick your destination and data plan from 200+ countries",
  "step2Title": "Scan QR Code",
  "step2Desc": "Receive your QR code instantly and scan it with your phone",
  "step3Title": "You're Connected",
  "step3Desc": "Data activates automatically when you arrive. That's it."
},
"comparison": {
  "title": "eSIM vs Physical SIM",
  "subtitle": "See why travelers are switching to eSIM",
  "activation": "Activation",
  "physicalActivation": "Find a store, wait in line",
  "esimActivation": "Scan QR, ready in 2 min",
  "availability": "Availability",
  "physicalAvailability": "Airport/city shops only",
  "esimAvailability": "Buy online, anytime",
  "switching": "Switching plans",
  "physicalSwitching": "Buy new card, swap physically",
  "esimSwitching": "Add new plan digitally",
  "keepNumber": "Keep your number",
  "physicalKeepNumber": "Must remove main SIM",
  "esimKeepNumber": "Runs alongside your SIM",
  "multiCountry": "Multiple countries",
  "physicalMultiCountry": "New SIM per country",
  "esimMultiCountry": "Switch plans instantly",
  "cost": "Cost",
  "physicalCost": "Store markup + taxi to shop",
  "esimCost": "Direct pricing, no extras"
},
"roaming": {
  "title": "Simnetiq vs Roaming Costs",
  "subtitle": "See how much you can save",
  "carrierTurkey": "Typical carrier roaming (Turkey)",
  "carrierEurope": "Typical carrier roaming (Europe)",
  "carrierAsia": "Typical carrier roaming (Asia)",
  "simnetiq": "Simnetiq eSIM",
  "perWeek": "/week",
  "saveUpTo": "Save up to 90%",
  "fromPrice": "From $3/week",
  "noBills": "No surprise bills",
  "cancelAnytime": "Cancel anytime"
},
"featuresBento": {
  "title": "Why Choose Simnetiq",
  "globalCoverage": "Global Coverage",
  "globalCoverageDesc": "200+ countries, 400+ carriers. One app.",
  "instantActivation": "Instant Activation",
  "instantActivationDesc": "From purchase to connected in under 2 minutes",
  "topUp": "Top-Up Anytime",
  "topUpDesc": "Running low? Add more data without reinstalling your eSIM",
  "securePayments": "Secure Payments",
  "securePaymentsDesc": "Stripe-powered checkout. Apple Pay, Google Pay, all major cards.",
  "multiLanguage": "Multi-Language",
  "multiLanguageDesc": "Full support in 18 languages including Arabic, Hebrew, Japanese, and more",
  "support": "Dedicated Support",
  "supportDesc": "Real human support via email and in-app. No chatbots."
},
"coverage": {
  "title": "Global Coverage",
  "countries": "Countries",
  "dataPlans": "Data Plans",
  "languages": "Languages",
  "avgActivation": "Avg Activation",
  "europe": "Europe",
  "asia": "Asia",
  "americas": "Americas",
  "africa": "Africa",
  "oceania": "Oceania",
  "middleEast": "Middle East"
},
"devices": {
  "title": "Device Compatibility",
  "notSure": "Not sure if your device supports eSIM?",
  "checkFaq": "Check FAQ"
},
"promoBanner": {
  "headline": "Get {discount}% off your first eSIM plan",
  "cta": "Shop Plans Now",
  "finePrint": "Valid for new customers. One use per account.",
  "copied": "Copied!"
},
"appDownload": {
  "badge": "AVAILABLE ON IOS",
  "badgeBoth": "AVAILABLE ON IOS & ANDROID",
  "title": "Manage everything from your phone",
  "bullet1": "Buy and activate eSIMs",
  "bullet2": "Monitor data usage in real-time",
  "bullet3": "Top up with one tap",
  "bullet4": "Get QR codes instantly"
},
"dopplerCrossSell": {
  "badge": "By Simnetiq",
  "title": "Doppler VPN",
  "description": "No-logs VPN with WireGuard + VLESS. Up to 10 devices.",
  "promo": "Use code LAUNCH20 for 20% off",
  "cta": "Learn More"
},
"socialProof": {
  "rating": "4.5",
  "appStore": "App Store",
  "tagline": "Trusted by travelers in 200+ countries"
},
"finalCta": {
  "title": "Ready to stay connected worldwide?",
  "subtitle": "Get your eSIM in minutes. Works on any unlocked device.",
  "browsePlans": "Browse Plans",
  "downloadApp": "Download App",
  "promoReminder": "Use code {code} for {discount}% off"
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/public/locales/en/common.json
git commit -m "feat: add translation keys for all new landing page sections"
```

---

### Task 5: Create getActivePromo Server Utility

**Files:**
- Create: `packages/customer-app/src/lib/getActivePromo.js`

This is a server-side function used by the page server component to fetch the currently active promo code from Supabase. It runs at request time (or ISR) — NOT on the client.

- [ ] **Step 1: Create the utility**

```js
import { createClient } from '@supabase/supabase-js';

/**
 * Fetches the currently active promo code from Supabase.
 * Returns { code, discount_percent, discount_type, description } or null.
 * Server-side only — uses service role key.
 */
export async function getActivePromo() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('promo_codes')
    .select('code, discount_percent, discount_type, description')
    .eq('is_active', true)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/lib/getActivePromo.js
git commit -m "feat: add server-side getActivePromo utility"
```

---

### Task 6: Create NewHeroSection

**Files:**
- Create: `packages/customer-app/src/components/sections/NewHeroSection.jsx`

**Critical:** h1 is the LCP element. No state-dependent rendering. No lazy loading. This component receives `promo` as a prop from the server component page.

- [ ] **Step 1: Create the component**

The hero must:
- Accept `promo` prop (object or null) from server component
- Render h1 immediately — no useEffect, no loading state gating the headline
- Use CSS-only animated gradient mesh background (no JS canvas)
- Show promo banner strip only if `promo` is truthy
- Dual CTAs: "Explore eSIM Plans" (solid tufts-blue) + "Download App" (outline)
- 4 trust badge pills below CTAs
- "anywhere" in h1 styled in tufts-blue (no IBM Plex Sans Italic — spec says use accent color instead)
- Full viewport height

Key implementation notes:
- Import `useI18n` for translations, `usePathname` for language detection
- Reuse `ExploreStoreCTA` and `PlatformDownloadCTA` from existing `../cta`
- Gradient mesh: use 3 overlapping radial-gradient backgrounds with the `animate-gradient-mesh` CSS class
- Trust badges: inline SVG icons (Globe, Zap, Shield, RefreshCw) to avoid lucide-react bundle

```jsx
'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { detectLanguageFromPath } from '@esim/shared/utils/languageUtils';
import { PlatformDownloadCTA, ExploreStoreCTA } from '../cta';

// Inline SVG icons — same pattern as existing HeroSection
const GlobeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
  </svg>
);
const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
  </svg>
);
const ShieldIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
  </svg>
);
const RefreshIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
);

export default function NewHeroSection({ promo }) {
  const pathname = usePathname();
  const { locale, t, isLoading: i18nLoading } = useI18n();
  const ssrSafeLanguage = useMemo(() => detectLanguageFromPath(pathname) || 'en', [pathname]);
  const detectedLanguage = i18nLoading ? ssrSafeLanguage : (locale || ssrSafeLanguage);

  const trustBadges = [
    { Icon: GlobeIcon, label: t('hero.countries', '200+ Countries') },
    { Icon: ZapIcon, label: t('hero.instantActivation', 'Instant Activation') },
    { Icon: ShieldIcon, label: t('hero.fiveStarRated', '5-Star Rated') },
    { Icon: RefreshIcon, label: t('hero.sevenDayRefund', '7-Day Refund') },
  ];

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden" lang={detectedLanguage}>
      {/* CSS-only gradient mesh background */}
      <div
        className="absolute inset-0 animate-gradient-mesh"
        aria-hidden="true"
        style={{
          background: `
            radial-gradient(ellipse 80% 50% at 20% 40%, rgba(73,117,212,0.15) 0%, transparent 70%),
            radial-gradient(ellipse 60% 60% at 80% 60%, rgba(99,60,180,0.1) 0%, transparent 70%),
            radial-gradient(ellipse 50% 80% at 50% 20%, rgba(73,117,212,0.08) 0%, transparent 70%),
            #0a0a0a
          `,
          backgroundSize: '400% 400%',
        }}
      />

      <div className="relative w-full max-w-7xl mx-auto px-4 py-20 lg:py-24 text-center">
        {/* Promo banner strip */}
        {promo && (
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-accent-highlight/10 border border-accent-highlight/20 animate-promo-pulse">
            <span className="text-accent-highlight text-sm font-medium">
              {t('hero.promoPrefix', 'Use code')}{' '}
              <span className="font-bold">{promo.code}</span>{' '}
              {t('hero.promoSuffix', `for ${promo.discount_percent}% off your first eSIM`)}
            </span>
          </div>
        )}

        {/* h1 — LCP element, renders immediately */}
        <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-8xl font-bold tracking-tight text-text-primary mb-6 lg:mb-8 leading-[1.1]">
          {t('hero.darkHeadlinePart1', 'Stay connected ')}{' '}
          <span className="text-tufts-blue">{t('hero.darkHeadlineHighlight', 'anywhere')}</span>{' '}
          {t('hero.darkHeadlinePart2', 'in the world')}
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg lg:text-xl text-text-muted mb-10 lg:mb-12 max-w-2xl lg:max-w-3xl mx-auto leading-relaxed">
          {t('hero.darkSubtitle', 'Instant eSIM activation for 200+ countries. No SIM cards, no roaming fees, no hassle.')}
        </p>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 lg:mb-12 w-full sm:w-auto rtl-native-flex">
          <ExploreStoreCTA variant="darkPrimary" size="md" source="hero_primary_cta" className="w-full sm:w-auto" />
          <PlatformDownloadCTA variant="outline" size="md" source="hero_secondary_cta" className="w-full sm:w-auto" />
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center">
          {trustBadges.map(({ Icon, label }, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-text-muted text-xs sm:text-sm rtl-native-flex">
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/NewHeroSection.jsx
git commit -m "feat: add dark theme hero section with promo banner"
```

---

## Chunk 3: New Landing Page Sections (Part 1)

All sections below follow the dark theme visual system. Each is a standalone `'use client'` component using `Reveal` for scroll animation and `useI18n()` for translations. All use inline SVG icons.

### Task 7: Create TrustIndicators Section

**Files:**
- Create: `packages/customer-app/src/components/sections/TrustIndicators.jsx`

- [ ] **Step 1: Create the component**

4 glass cards in a row (2x2 mobile). Each card: icon + title + description. Uses `Reveal` with staggered delays. Cards use `glass-card` CSS class from globals.css.

Cards data:
1. Shield icon — "No Roaming Fees" / "Save hundreds on international data charges"
2. QR icon — "QR Activation" / "Scan, activate, connect — under 2 minutes"
3. Globe icon — "18 Languages" / "Support in your language, wherever you're from"
4. Checkmark icon — "Money-Back Guarantee" / "7-day full refund on unused plans"

Layout: `grid grid-cols-2 lg:grid-cols-4 gap-4` inside `max-w-7xl mx-auto px-4 py-16 lg:py-24`

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/TrustIndicators.jsx
git commit -m "feat: add TrustIndicators section"
```

---

### Task 8: Create HowItWorks Section

**Files:**
- Create: `packages/customer-app/src/components/sections/HowItWorks.jsx`

- [ ] **Step 1: Create the component**

3 numbered step cards connected by SVG dashed line. Horizontal on desktop (`flex-row`), vertical on mobile (`flex-col`).

Steps:
1. "Choose Your Plan" — map-pin icon — "Pick your destination and data plan from 200+ countries"
2. "Scan QR Code" — qr-code icon — "Receive your QR code instantly and scan it with your phone"
3. "You're Connected" — wifi icon — "Data activates automatically when you arrive. That's it."

Each step card: large faded number (01/02/03) in background, icon in tufts-blue circle, title, description. Cards are `glass-card` styled.

SVG dashed line between steps: horizontal on desktop, vertical on mobile. Uses `stroke-dasharray` and `stroke-dashoffset` CSS animation triggered by IntersectionObserver. If animation causes TBT, fall back to static line (use `will-change: auto` to avoid forced layer creation).

Section header: "How It Works" subtitle above steps.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/HowItWorks.jsx
git commit -m "feat: add HowItWorks 3-step section"
```

---

### Task 9: Create ComparisonTable Section

**Files:**
- Create: `packages/customer-app/src/components/sections/ComparisonTable.jsx`

- [ ] **Step 1: Create the component**

"eSIM vs Physical SIM" — 2-column comparison table with 6 rows.

| Aspect | Physical SIM | eSIM |
|--------|-------------|------|
| Activation | Find a store, wait in line | Scan QR, ready in 2 min |
| Availability | Airport/city shops only | Buy online, anytime |
| Switching plans | Buy new card, swap physically | Add new plan digitally |
| Keep your number | Must remove main SIM | Runs alongside your SIM |
| Multiple countries | New SIM per country | Switch plans instantly |
| Cost | Store markup + taxi to shop | Direct pricing, no extras |

Physical SIM column: text-text-muted, X icons in red/muted.
eSIM column: green checkmark icons, subtle blue border glow on column.
Row hover: `hover:bg-white/5` transition.
Wrapped in `Reveal`.

Section header: "eSIM vs Physical SIM" / "See why travelers are switching to eSIM"

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/ComparisonTable.jsx
git commit -m "feat: add eSIM vs Physical SIM comparison table"
```

---

### Task 10: Create RoamingComparison Section

**Files:**
- Create: `packages/customer-app/src/components/sections/RoamingComparison.jsx`

- [ ] **Step 1: Create the component**

Animated horizontal bar chart comparing carrier roaming costs vs Simnetiq prices.

**Bar data (hardcoded carrier estimates, dynamic Simnetiq prices):**
- "Typical carrier roaming (Turkey)" — ~$70/week — red/orange bar
- "Typical carrier roaming (Europe)" — ~$56/week — red/orange bar
- "Typical carrier roaming (Asia)" — ~$84/week — red/orange bar
- "Simnetiq eSIM" — dynamic from props or hardcode ~$5/week — green bar

**NOTE:** Use "Typical carrier roaming" framing — do NOT name specific carriers unless verified rates are sourced. Add a code comment: `// Carrier roaming estimates based on general market research. Verify specific rates before naming carriers.`

Bars animate from 0% to target width over 1s on viewport entry (IntersectionObserver). Each bar has a label, price, and colored bar. Use `style={{ width: isVisible ? `${percent}%` : '0%' }}` with CSS transition.

Stat boxes below: 4-column grid with:
- "Save up to 90%"
- "From $3/week"
- "No surprise bills"
- "Cancel anytime"

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/RoamingComparison.jsx
git commit -m "feat: add roaming cost comparison animated chart"
```

---

### Task 11: Create FeaturesBento Section

**Files:**
- Create: `packages/customer-app/src/components/sections/FeaturesBento.jsx`

- [ ] **Step 1: Create the component**

6-card bento grid layout:
- Row 1: 1 large card (col-span-2) + 2 small cards
- Row 2: 2 small cards + 1 small card

Cards:
1. **Global Coverage** (large, 2-col span) — globe/world icon, "200+ countries, 400+ carriers. One app." — uses `AnimatedCounter` for "200+"
2. **Instant Activation** — zap icon, "From purchase to connected in under 2 minutes"
3. **Top-Up Anytime** — refresh icon, "Running low? Add more data without reinstalling your eSIM"
4. **Secure Payments** — lock icon, "Stripe-powered checkout. Apple Pay, Google Pay, all major cards."
5. **Multi-Language** — languages icon, "Full support in 18 languages including Arabic, Hebrew, Japanese, and more"
6. **Dedicated Support** — headset icon, "Real human support via email and in-app. No chatbots."

All cards: `glass-card` styling, hover lift with `hover:border-tufts-blue/30`. Large card has subtle gradient overlay. Each wrapped in `Reveal` with stagger.

Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/FeaturesBento.jsx
git commit -m "feat: add features bento grid section"
```

---

## Chunk 4: New Landing Page Sections (Part 2)

### Task 12: Create CoverageStats Section

**Files:**
- Create: `packages/customer-app/src/components/sections/CoverageStats.jsx`

- [ ] **Step 1: Create the component**

Top: 4 `AnimatedCounter` components in a `grid grid-cols-2 lg:grid-cols-4`:
- 200+ Countries
- 400+ Data Plans
- 18 Languages
- 2 min Average Activation

Below: 6-card region grid (Europe, Asia, Americas, Africa, Oceania, Middle East). Each card is a link to `/esim-plans?region=X`. Cards show region name, 4-5 flag emoji thumbnails of top countries, plan count text. Glass-card style.

Grid: `grid grid-cols-2 md:grid-cols-3 gap-4`

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/CoverageStats.jsx
git commit -m "feat: add coverage stats counters and region grid"
```

---

### Task 13: Create DeviceCompatibility Section

**Files:**
- Create: `packages/customer-app/src/components/sections/DeviceCompatibility.jsx`

- [ ] **Step 1: Create the component**

Slim horizontal strip. `max-w-7xl mx-auto px-4 py-8`. Background `bg-white/[0.03]` with top/bottom border `border-white/10`.

3-column layout (`grid grid-cols-1 md:grid-cols-3 gap-6`):
- **iPhone** — "XS, XR, 11–16 series, SE 3rd gen"
- **Samsung** — "Galaxy S20+, Z Fold/Flip, A54+"
- **Google** — "Pixel 3+, all newer models"

Each column: brand name in bold, model list in text-muted. "Not sure? Check FAQ →" link at bottom anchored to `#faq`.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/DeviceCompatibility.jsx
git commit -m "feat: add device compatibility strip"
```

---

### Task 14: Create PromoCodeBanner Section

**Files:**
- Create: `packages/customer-app/src/components/sections/PromoCodeBanner.jsx`

- [ ] **Step 1: Create the component**

Receives `promo` prop from server page. If `!promo`, returns `null`.

Full-width gradient banner: `bg-gradient-to-r from-[#1a1a4e] to-[#0a0a2e]`.

Content: large headline with discount %, copy-able code pill with clipboard button (uses `navigator.clipboard.writeText`), CTA "Shop Plans Now →" linking to `/esim-plans`, fine print "Valid for new customers. One use per account."

Code pill: `bg-white/10 border border-white/20 rounded-full px-4 py-2` with copy icon button.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/PromoCodeBanner.jsx
git commit -m "feat: add database-driven promo code banner"
```

---

### Task 15: Create AppDownload Section

**Files:**
- Create: `packages/customer-app/src/components/sections/AppDownload.jsx`

- [ ] **Step 1: Create the component**

Split card layout (`flex flex-col lg:flex-row`).

Left side: badge ("AVAILABLE ON IOS" — only say "& ANDROID" if `process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL` is set), headline "Manage everything from your phone", bullet list (Buy and activate eSIMs, Monitor data usage, Top up with one tap, Get QR codes instantly), App Store button (always), Google Play button (only if env var set).

Right side: phone mockup image `/images/blog.avif` (reuse existing, or a new screenshot if available) in `next/image` with rounded corners.

Button styles: reuse existing pattern from ActivationSection (rounded-full pills with icon).

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/AppDownload.jsx
git commit -m "feat: add app download split card section"
```

---

### Task 16: Create DopplerCrossSell Section

**Files:**
- Create: `packages/customer-app/src/components/sections/DopplerCrossSell.jsx`

- [ ] **Step 1: Create the component**

Compact dark card, secondary prominence. Follows same pattern as existing Doppler promo in ActivationSection but adapted for dark theme.

- Badge: "By Simnetiq" in tufts-blue
- Headline: "Doppler VPN"
- Description: "No-logs VPN with WireGuard + VLESS. Up to 10 devices."
- Promo pill: "Use code LAUNCH20 for 20% off" in emerald style
- CTA: "Learn More →" linking to `https://dopplervpn.com` (external)

Glass-card styling. Max-width constrained (`max-w-3xl mx-auto`).

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/DopplerCrossSell.jsx
git commit -m "feat: add Doppler VPN cross-sell card"
```

---

### Task 17: Create SocialProof Section

**Files:**
- Create: `packages/customer-app/src/components/sections/SocialProof.jsx`

- [ ] **Step 1: Create the component**

Centered section. Large 5-star display (5 yellow star SVGs + "4.5" text + "App Store" badge). No quote cards shipped — spec says real reviews only.

Bottom tagline: "Trusted by travelers in 200+ countries" in text-muted.

Layout: centered column, `max-w-3xl mx-auto py-16 lg:py-24`.

**Important:** Do NOT add placeholder testimonial quotes. Only the star rating display.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/SocialProof.jsx
git commit -m "feat: add social proof star rating section"
```

---

### Task 18: Create FAQSection

**Files:**
- Create: `packages/customer-app/src/components/sections/FAQSection.jsx`

- [ ] **Step 1: Create the component**

2-column accordion grid (1 col on mobile). Same 8 FAQ items from existing `ActivationSection` translations (reuse same `t('faq.*')` keys).

Each FAQ item: glass-card styled with expand/collapse. Chevron icon rotates on expand. Smooth `max-h` + opacity CSS transition (same pattern as existing ActivationSection).

Dark theme: `bg-white/5` cards, white text, tufts-blue chevron on open, text-muted answer text.

Add `id="faq"` to the section wrapper for anchor links.

Grid: `grid grid-cols-1 md:grid-cols-2 gap-4`.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/FAQSection.jsx
git commit -m "feat: add dark theme FAQ accordion section"
```

---

### Task 19: Create FinalCTA Section

**Files:**
- Create: `packages/customer-app/src/components/sections/FinalCTA.jsx`

- [ ] **Step 1: Create the component**

Receives `promo` prop. Full-width gradient section: `bg-gradient-to-r from-[#1a1a4e] via-tufts-blue to-[#4975D4]`.

Content centered:
- Headline: "Ready to stay connected worldwide?"
- Subtitle: "Get your eSIM in minutes. Works on any unlocked device."
- Dual CTAs: "Browse Plans" (solid white bg) + "Download App" (outline white)
- If promo: small text "Use code {promo.code} for {promo.discount_percent}% off"

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/FinalCTA.jsx
git commit -m "feat: add final CTA gradient section"
```

---

## Chunk 5: Adapt Existing Components for Dark Theme

### Task 20: Dark Theme for PlansSection / EsimPlans

**Files:**
- Modify: `packages/customer-app/src/components/EsimPlans.jsx`

- [ ] **Step 1: Identify and update color classes**

The component is 600+ lines. Target these class patterns for dark theme inversion:

1. Background colors: `bg-white` → `bg-white/5`, `bg-gray-50` → `bg-white/[0.03]`
2. Text colors: `text-eerie-black` → `text-text-primary`, `text-gray-600` → `text-text-muted`, `text-gray-500` → `text-text-muted`
3. Border colors: `border-gray-200` → `border-white/10`, `border-gray-100` → `border-white/5`
4. Card styles: add `border border-white/10` to plan cards
5. Input fields: `bg-white` → `bg-white/5`, `text-gray-900` → `text-text-primary`, `border-gray-300` → `border-white/10`
6. Region tab buttons: active state uses tufts-blue bg, inactive uses `bg-white/5`
7. Price text: keep tufts-blue for prices
8. Badge colors: keep tufts-blue/amber for Featured/Best Value badges

**Do NOT change:** Layout, grid structure, region logic, Supabase hooks, bottom sheet, plan card component structure. Only color/visual changes.

Add a CTA at the bottom: `<Link>` to `/esim-plans` with text "View All 200+ Destinations →" styled as `text-tufts-blue hover:text-tufts-blue/80`.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/EsimPlans.jsx
git commit -m "feat: adapt EsimPlans to dark theme"
```

---

### Task 21: Dark Theme for TravelBlogsSection

**Files:**
- Modify: `packages/customer-app/src/components/sections/TravelBlogsSection.jsx`

- [ ] **Step 1: Update color classes**

Same pattern as EsimPlans:
- Card backgrounds: `bg-white` → `bg-white/5`
- Card borders: add `border border-white/10`
- Text: `text-eerie-black` → `text-text-primary`, `text-gray-600` → `text-text-muted`
- Category badge: keep colorful badges but adjust background opacity for dark contrast
- Section background: remove `bg-white`, inherit dark bg
- "View all articles" link: `text-tufts-blue`

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/sections/TravelBlogsSection.jsx
git commit -m "feat: adapt TravelBlogsSection to dark theme"
```

---

### Task 22: Dark Theme for Navbar

**Files:**
- Modify: `packages/customer-app/src/components/Navbar.jsx`

- [ ] **Step 1: Update navbar colors**

Key changes to the `<header>` and its contents:

1. Header background: `bg-white/80 backdrop-blur-sm` → `bg-[#0a0a0a]/80 backdrop-blur-sm`
2. Logo image: `logoblack.png` → check if a white version exists at `/images/logowhite.png`, if not keep `logoblack.png` and add `brightness-0 invert` CSS filter
3. Logo text: `text-eerie-black` → `text-text-primary`
4. Nav links: `text-eerie-black` → `text-text-primary`, hover: `hover:text-tufts-blue` (keep)
5. Dropdown menus: `bg-white border-gray-200` → `bg-bg-secondary border-white/10`
6. Dropdown items: `text-gray-700 hover:bg-gray-100` → `text-text-muted hover:bg-white/5 hover:text-text-primary`
7. Login button: `bg-eerie-black text-white` → `bg-white text-[#0a0a0a]` (inverted)
8. Mobile menu overlay: `bg-white/80 backdrop-blur-md` → `bg-[#0a0a0a]/90 backdrop-blur-md`
9. Mobile menu links: `text-eerie-black` → `text-text-primary`
10. Mobile menu dividers: `border-gray-200` → `border-white/10`
11. User avatar button: keep `bg-tufts-blue text-white`
12. Hamburger icon: `text-eerie-black` → `text-text-primary`

**Do NOT change:** Logic, dropdowns, auth flow, scroll behavior, language selector, RTL support.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/Navbar.jsx
git commit -m "feat: adapt Navbar to dark theme"
```

---

### Task 23: Dark Theme for Footer

**Files:**
- Modify: `packages/customer-app/src/components/Footer.jsx`

- [ ] **Step 1: Update footer colors**

1. Footer background: `bg-white` → inherit (dark bg from body)
2. Top border: `via-gray-200` → `via-white/10`
3. Brand column gradient: `from-blue-50 to-white` → `from-white/5 to-transparent`
4. Brand name: `text-eerie-black` → `text-text-primary`
5. Tagline: `text-gray-600` → `text-text-muted`
6. Column headers: `text-eerie-black` → `text-text-primary`
7. FooterLink: `text-gray-600 hover:text-tufts-blue` → `text-text-muted hover:text-tufts-blue`
8. Social icons: `text-gray-600 hover:text-tufts-blue hover:bg-blue-50` → `text-text-muted hover:text-tufts-blue hover:bg-white/5`
9. Bottom bar border: `border-gray-200` → `border-white/10`
10. Copyright: `text-gray-500` → `text-text-muted`

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/src/components/Footer.jsx
git commit -m "feat: adapt Footer to dark theme"
```

---

## Chunk 6: Page Assembly + Layout Updates

### Task 24: Update Root Layout for Dark Theme

**Files:**
- Modify: `packages/customer-app/app/layout.jsx`

- [ ] **Step 1: Update body and wrapper**

1. Change the `<div>` wrapper around content: `bg-white` → remove (body bg handles it)
2. Remove the grid pattern rails (the two `hidden xl:block absolute` divs with repeating-linear-gradient) — they were light-theme decorative elements
3. Remove the IBM Plex Sans font import and variable (spec says no italic font)
4. Update theme-color meta: `#468BE6` → `#0a0a0a`
5. Update JSON-LD Organization `availableLanguage` array to include all 18 languages
6. Keep all other head content, structured data, fonts, providers, etc.

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/app/layout.jsx
git commit -m "feat: update root layout for dark theme"
```

---

### Task 25: Rebuild Homepage (app/page.jsx)

**Files:**
- Modify: `packages/customer-app/app/page.jsx` (complete rewrite)

- [ ] **Step 1: Rewrite as server component wrapper with lazy-loaded sections**

The new page.jsx is a **server component** (no `'use client'`). It:
1. Fetches `promo` via `getActivePromo()` at render time
2. Imports `NewHeroSection` eagerly (not dynamic)
3. Imports `PlansSection` eagerly (near fold — no lazy load per spec)
4. Lazy-loads all other sections via `dynamic()` with dark loading skeletons
5. Wraps everything in a client component for auth redirect + RTL

```jsx
import dynamic from 'next/dynamic';
import { getActivePromo } from '../src/lib/getActivePromo';
import NewHeroSection from '../src/components/sections/NewHeroSection';
import PlansSection from '../src/components/sections/PlansSection';
import HomePageWrapper from '../src/components/HomePageWrapper';

// Lazy-load below-fold sections with dark skeleton placeholders
const loadingFallback = <div className="h-96 bg-bg-secondary animate-pulse" />;

const TrustIndicators = dynamic(() => import('../src/components/sections/TrustIndicators'), { loading: () => loadingFallback });
const HowItWorks = dynamic(() => import('../src/components/sections/HowItWorks'), { loading: () => loadingFallback });
const ComparisonTable = dynamic(() => import('../src/components/sections/ComparisonTable'), { loading: () => loadingFallback });
const RoamingComparison = dynamic(() => import('../src/components/sections/RoamingComparison'), { loading: () => loadingFallback });
const FeaturesBento = dynamic(() => import('../src/components/sections/FeaturesBento'), { loading: () => loadingFallback });
const CoverageStats = dynamic(() => import('../src/components/sections/CoverageStats'), { loading: () => loadingFallback });
const DeviceCompatibility = dynamic(() => import('../src/components/sections/DeviceCompatibility'), { loading: () => loadingFallback });
const PromoCodeBanner = dynamic(() => import('../src/components/sections/PromoCodeBanner'), { loading: () => loadingFallback });
const AppDownload = dynamic(() => import('../src/components/sections/AppDownload'), { loading: () => loadingFallback });
const DopplerCrossSell = dynamic(() => import('../src/components/sections/DopplerCrossSell'), { loading: () => loadingFallback });
const SocialProof = dynamic(() => import('../src/components/sections/SocialProof'), { loading: () => loadingFallback });
const FAQSection = dynamic(() => import('../src/components/sections/FAQSection'), { loading: () => loadingFallback });
const TravelBlogsSection = dynamic(() => import('../src/components/sections/TravelBlogsSection'), { loading: () => loadingFallback });
const FinalCTA = dynamic(() => import('../src/components/sections/FinalCTA'), { loading: () => loadingFallback });

export default async function HomePage() {
  const promo = await getActivePromo();

  return (
    <HomePageWrapper>
      <NewHeroSection promo={promo} />
      <TrustIndicators />
      <HowItWorks />
      <PlansSection />
      <ComparisonTable />
      <RoamingComparison />
      <FeaturesBento />
      <CoverageStats />
      <DeviceCompatibility />
      <PromoCodeBanner promo={promo} />
      <AppDownload />
      <DopplerCrossSell />
      <SocialProof />
      <FAQSection />
      <TravelBlogsSection />
      <FinalCTA promo={promo} />
    </HomePageWrapper>
  );
}
```

- [ ] **Step 2: Create HomePageWrapper client component**

Create `packages/customer-app/src/components/HomePageWrapper.jsx`:

This handles the auth redirect and RTL dir attribute that the old `page.jsx` did:

```jsx
'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@esim/shared/contexts/I18nContext';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { detectLanguageFromPath, getLanguageDirection } from '@esim/shared/utils/languageUtils';

export default function HomePageWrapper({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { locale } = useI18n();
  const { currentUser, loading: authLoading } = useAuth();

  const currentLanguage = locale || detectLanguageFromPath(pathname) || 'en';
  const isRTL = getLanguageDirection(currentLanguage) === 'rtl';

  useEffect(() => {
    if (!authLoading && currentUser) {
      const dashboardUrl = currentLanguage === 'en' ? '/dashboard' : `/${currentLanguage}/dashboard`;
      router.replace(dashboardUrl);
    }
  }, [authLoading, currentUser, currentLanguage, router]);

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} lang={currentLanguage}>
      <main className="min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/customer-app/app/page.jsx packages/customer-app/src/components/HomePageWrapper.jsx
git commit -m "feat: rebuild homepage with 17 dark-theme sections"
```

---

## Chunk 7: New Languages (5 Locales)

### Task 26: Add 5 New Locale Page Folders

**Files (create all):**
- `app/ko/layout.jsx`, `app/ko/page.jsx`
- `app/tr/layout.jsx`, `app/tr/page.jsx`
- `app/it/layout.jsx`, `app/it/page.jsx`
- `app/th/layout.jsx`, `app/th/page.jsx`
- `app/nl/layout.jsx`, `app/nl/page.jsx`

- [ ] **Step 1: Create layout.jsx for each locale**

Follow exact pattern from `app/es/layout.jsx`. Each layout exports `metadata` with locale-specific SEO data and `generateAlternates('/')`.

**Korean (ko/layout.jsx):**
```jsx
import { generateAlternates } from '../../src/config/metadata';

export const metadata = {
  title: '여행용 eSIM — Simnetiq | 로밍 없는 모바일 데이터',
  description: '비싼 로밍은 잊으세요. Simnetiq eSIM: 200개국 이상 인터넷, 즉시 활성화, $3부터 요금제. 여행자와 디지털 노마드에게 완벽합니다.',
  keywords: ['esim 구매', 'esim 여행', '로밍 없이 인터넷', 'esim 유럽 여행', 'esim 한국'],
  openGraph: {
    title: '여행용 eSIM — Simnetiq | 로밍 없는 모바일 데이터',
    description: '비싼 로밍은 잊으세요. Simnetiq eSIM: 200개국 이상 인터넷, 즉시 활성화, $3부터 요금제.',
    type: 'website', locale: 'ko_KR', url: '/ko',
  },
  twitter: {
    card: 'summary_large_image',
    title: '여행용 eSIM — Simnetiq | 로밍 없는 모바일 데이터',
    description: '비싼 로밍은 잊으세요. Simnetiq eSIM: 200개국 이상 인터넷, 즉시 활성화, $3부터 요금제.',
  },
  alternates: generateAlternates('/'),
};

export default function KoreanLayout({ children }) {
  return children;
}
```

Repeat same pattern for **Turkish (tr)**, **Italian (it)**, **Thai (th)**, **Dutch (nl)** with locale-appropriate metadata. Use English placeholder text for titles/descriptions for tr, it, th, nl — the parallel-translator agent will localize later. Korean can have real Korean text as shown above.

- [ ] **Step 2: Create page.jsx for each locale**

All 5 page.jsx files are identical to the root `app/page.jsx` — they're server components that import the same sections. Since page.jsx is now a server component with no locale-specific rendering, the locale pages can simply re-export it:

```jsx
export { default } from '../../page';
```

Wait — this won't work because `dynamic()` imports use relative paths. Instead, each locale page.jsx should be a copy of the root page.jsx with adjusted import paths (adding `../../` prefix):

```jsx
import dynamic from 'next/dynamic';
import { getActivePromo } from '../../src/lib/getActivePromo';
import NewHeroSection from '../../src/components/sections/NewHeroSection';
import PlansSection from '../../src/components/sections/PlansSection';
import HomePageWrapper from '../../src/components/HomePageWrapper';

const loadingFallback = <div className="h-96 bg-bg-secondary animate-pulse" />;
const TrustIndicators = dynamic(() => import('../../src/components/sections/TrustIndicators'), { loading: () => loadingFallback });
const HowItWorks = dynamic(() => import('../../src/components/sections/HowItWorks'), { loading: () => loadingFallback });
const ComparisonTable = dynamic(() => import('../../src/components/sections/ComparisonTable'), { loading: () => loadingFallback });
const RoamingComparison = dynamic(() => import('../../src/components/sections/RoamingComparison'), { loading: () => loadingFallback });
const FeaturesBento = dynamic(() => import('../../src/components/sections/FeaturesBento'), { loading: () => loadingFallback });
const CoverageStats = dynamic(() => import('../../src/components/sections/CoverageStats'), { loading: () => loadingFallback });
const DeviceCompatibility = dynamic(() => import('../../src/components/sections/DeviceCompatibility'), { loading: () => loadingFallback });
const PromoCodeBanner = dynamic(() => import('../../src/components/sections/PromoCodeBanner'), { loading: () => loadingFallback });
const AppDownload = dynamic(() => import('../../src/components/sections/AppDownload'), { loading: () => loadingFallback });
const DopplerCrossSell = dynamic(() => import('../../src/components/sections/DopplerCrossSell'), { loading: () => loadingFallback });
const SocialProof = dynamic(() => import('../../src/components/sections/SocialProof'), { loading: () => loadingFallback });
const FAQSection = dynamic(() => import('../../src/components/sections/FAQSection'), { loading: () => loadingFallback });
const TravelBlogsSection = dynamic(() => import('../../src/components/sections/TravelBlogsSection'), { loading: () => loadingFallback });
const FinalCTA = dynamic(() => import('../../src/components/sections/FinalCTA'), { loading: () => loadingFallback });

export default async function HomePage() {
  const promo = await getActivePromo();
  return (
    <HomePageWrapper>
      <NewHeroSection promo={promo} />
      <TrustIndicators />
      <HowItWorks />
      <PlansSection />
      <ComparisonTable />
      <RoamingComparison />
      <FeaturesBento />
      <CoverageStats />
      <DeviceCompatibility />
      <PromoCodeBanner promo={promo} />
      <AppDownload />
      <DopplerCrossSell />
      <SocialProof />
      <FAQSection />
      <TravelBlogsSection />
      <FinalCTA promo={promo} />
    </HomePageWrapper>
  );
}
```

**IMPORTANT NOTE:** The existing locale pages (es, fr, de, etc.) currently have a DIFFERENT page.jsx that is `'use client'` with auth redirect logic and only 4 sections. These existing locale pages will also need to be updated to match the new root page.jsx pattern. However, to minimize blast radius, update the existing locale pages in a SEPARATE task after the new 5 locales are created and verified.

- [ ] **Step 3: Commit**

```bash
git add packages/customer-app/app/ko/ packages/customer-app/app/tr/ packages/customer-app/app/it/ packages/customer-app/app/th/ packages/customer-app/app/nl/
git commit -m "feat: add 5 new locale page folders (ko, tr, it, th, nl)"
```

---

### Task 27: Create Translation Placeholder Files

**Files:**
- Create: `public/locales/ko/common.json`
- Create: `public/locales/tr/common.json`
- Create: `public/locales/it/common.json`
- Create: `public/locales/th/common.json`
- Create: `public/locales/nl/common.json`

- [ ] **Step 1: Copy English common.json structure**

Copy `public/locales/en/common.json` to each new locale folder. The values stay in English as placeholders — the `parallel-translator` agent will handle real translations separately.

```bash
cd packages/customer-app
for lang in ko tr it th nl; do
  mkdir -p public/locales/$lang
  cp public/locales/en/common.json public/locales/$lang/common.json
done
```

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/public/locales/ko/ packages/customer-app/public/locales/tr/ packages/customer-app/public/locales/it/ packages/customer-app/public/locales/th/ packages/customer-app/public/locales/nl/
git commit -m "feat: add translation placeholder files for 5 new languages"
```

---

### Task 28: Create Country Page Layouts for New Locales

**Files (create all):**
- `app/{ko,tr,it,th,nl}/esim/[country]/layout.jsx` (5 files)
- `app/{ko,tr,it,th,nl}/esim/[country]/page.jsx` (5 files)

- [ ] **Step 1: Create layout.jsx for each locale**

Follow exact pattern from `app/es/esim/[country]/layout.jsx`. Only change: the `LOCALE` constant and add all 18 languages to hreflang alternates.

For each locale, set `const LOCALE = 'ko'` (or tr/it/th/nl), and update the `alternates.languages` object to include all 18 languages:

```js
alternates: {
  canonical: `${base}/${LOCALE}/esim/${country.slug}`,
  languages: {
    'x-default': `${base}/esim/${country.slug}`,
    'en': `${base}/esim/${country.slug}`,
    'ar': `${base}/ar/esim/${country.slug}`,
    'de': `${base}/de/esim/${country.slug}`,
    'es': `${base}/es/esim/${country.slug}`,
    'fr': `${base}/fr/esim/${country.slug}`,
    'he': `${base}/he/esim/${country.slug}`,
    'hi': `${base}/hi/esim/${country.slug}`,
    'it': `${base}/it/esim/${country.slug}`,
    'ja': `${base}/ja/esim/${country.slug}`,
    'ko': `${base}/ko/esim/${country.slug}`,
    'nl': `${base}/nl/esim/${country.slug}`,
    'pl': `${base}/pl/esim/${country.slug}`,
    'pt': `${base}/pt/esim/${country.slug}`,
    'ru': `${base}/ru/esim/${country.slug}`,
    'th': `${base}/th/esim/${country.slug}`,
    'tr': `${base}/tr/esim/${country.slug}`,
    'uk': `${base}/uk/esim/${country.slug}`,
    'zh': `${base}/zh/esim/${country.slug}`,
  },
},
```

- [ ] **Step 2: Create page.jsx for each locale**

Each is identical — renders `EsimCountryPage`:

```jsx
'use client';
import EsimCountryPage from '../../../../src/components/EsimCountryPage';
export default function CountryPage() {
  return <EsimCountryPage />;
}
```

- [ ] **Step 3: Also update existing locale country page layouts to include all 18 hreflang languages**

Update `app/{ar,de,es,fr,he,hi,ja,pl,pt,ru,uk,zh}/esim/[country]/layout.jsx` — add the 5 new languages (ko, tr, it, th, nl) to each file's `alternates.languages` object.

- [ ] **Step 4: Commit**

```bash
git add packages/customer-app/app/ko/esim/ packages/customer-app/app/tr/esim/ packages/customer-app/app/it/esim/ packages/customer-app/app/th/esim/ packages/customer-app/app/nl/esim/
git add packages/customer-app/app/ar/esim/ packages/customer-app/app/de/esim/ packages/customer-app/app/es/esim/ packages/customer-app/app/fr/esim/ packages/customer-app/app/he/esim/ packages/customer-app/app/hi/esim/ packages/customer-app/app/ja/esim/ packages/customer-app/app/pl/esim/ packages/customer-app/app/pt/esim/ packages/customer-app/app/ru/esim/ packages/customer-app/app/uk/esim/ packages/customer-app/app/zh/esim/
git commit -m "feat: add country pages for new locales + update all hreflang to 18 languages"
```

---

### Task 29: Update Middleware, Sitemap, and Metadata

**Files:**
- Modify: `packages/customer-app/middleware.js`
- Modify: `packages/customer-app/app/sitemap.js`
- Modify: `packages/customer-app/src/config/metadata.js`

- [ ] **Step 1: Update middleware.js**

Add `'ko', 'tr', 'it', 'th', 'nl'` to `languagesWithFolders` array.

Add 5 new entries to the pathname language detection chain:

```js
pathname.startsWith('/ko') ? 'ko' :
pathname.startsWith('/tr') ? 'tr' :
pathname.startsWith('/it') ? 'it' :
pathname.startsWith('/th') ? 'th' :
pathname.startsWith('/nl') ? 'nl' :
```

- [ ] **Step 2: Update sitemap.js**

Add `'ko', 'tr', 'it', 'th', 'nl'` to the `languages` array (both occurrences — the main one and the `withAlternates` helper).

- [ ] **Step 3: Update metadata.js**

Add 5 new entries to the `metadata` object. Use English placeholder text for now:

```js
ko: {
  title: { default: '여행용 eSIM — Simnetiq | 로밍 없는 모바일 데이터', template: '%s | Simnetiq' },
  description: '비싼 로밍은 잊으세요. Simnetiq eSIM: 200개국 이상 인터넷, 즉시 활성화, $3부터 요금제.',
  keywords: ['esim 구매', 'esim 여행', '로밍 없이 인터넷'],
  openGraph: { title: '여행용 eSIM — Simnetiq', description: '...' }
},
// tr, it, th, nl — similar structure with English placeholder text
```

Update `generateAlternates()` — add the 5 new languages to the `languages` array:

```js
const languages = ['en', 'es', 'fr', 'de', 'ar', 'he', 'hi', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'uk', 'zh'];
```

- [ ] **Step 4: Commit**

```bash
git add packages/customer-app/middleware.js packages/customer-app/app/sitemap.js packages/customer-app/src/config/metadata.js
git commit -m "feat: add 5 new languages to middleware, sitemap, and metadata"
```

---

## Chunk 8: Verification

### Task 30: Build Verification

- [ ] **Step 1: Run the build**

```bash
cd /Users/romanpochtman/Developer/esimmain-main && npm run build:customer
```

Expected: Zero errors, all routes compile including new locale routes.

- [ ] **Step 2: Fix any build errors**

If errors, fix them. Common issues:
- Missing imports (check all new components import what they need)
- Incorrect relative paths in locale page.jsx files
- Dynamic import paths
- TypeScript/JSX issues

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from landing page redesign"
```

---

### Task 31: Visual and Functional Verification

- [ ] **Step 1: Start dev server and verify**

```bash
cd /Users/romanpochtman/Developer/esimmain-main && npm run dev:customer
```

Check in browser:
- [ ] Homepage loads with dark theme (#0a0a0a background)
- [ ] All 17 sections render in correct order
- [ ] h1 is the LCP element (no JS-dependent rendering)
- [ ] Promo banner shows if active promo exists in Supabase, hidden if not
- [ ] Plan cards display correctly in dark theme
- [ ] FAQ accordion expands/collapses
- [ ] Blog posts load
- [ ] Navbar is dark themed with working dropdowns
- [ ] Footer is dark themed
- [ ] Scroll animations trigger on viewport entry
- [ ] Animated counter counts up

- [ ] **Step 2: Verify new locale pages**

Visit `/ko`, `/tr`, `/it`, `/th`, `/nl` — each should:
- Return 200
- Have correct metadata title containing "Simnetiq"
- Show dark theme homepage with all sections

- [ ] **Step 3: Verify country pages**

Visit `/ko/esim/turkey` — should:
- Return 200
- Have correct canonical URL and 18-language hreflang

---

### Task 32: Update Existing Locale Pages to Match New Homepage

**Files (modify):**
- `packages/customer-app/app/es/page.jsx`, `packages/customer-app/app/fr/page.jsx`, `packages/customer-app/app/de/page.jsx`, `packages/customer-app/app/ar/page.jsx`, `packages/customer-app/app/he/page.jsx`, `packages/customer-app/app/hi/page.jsx`, `packages/customer-app/app/ja/page.jsx`, `packages/customer-app/app/pl/page.jsx`, `packages/customer-app/app/pt/page.jsx`, `packages/customer-app/app/ru/page.jsx`, `packages/customer-app/app/uk/page.jsx`, `packages/customer-app/app/zh/page.jsx`

- [ ] **Step 1: Update all 12 existing locale page.jsx files**

Each file currently looks like the old `'use client'` 4-section page with auth redirect logic. Replace each with the exact same server component pattern from Task 26 Step 2 (the new locale page template):

1. Remove `'use client'` directive
2. Remove all React hooks (`useState`, `useEffect`, `useRouter`, `useAuth`, `useI18n`)
3. Remove the barrel import from `sections/index.js`
4. Add the `getActivePromo` import: `import { getActivePromo } from '../../src/lib/getActivePromo';`
5. Add eager imports: `NewHeroSection`, `PlansSection`, `HomePageWrapper` (path: `../../src/components/...`)
6. Add all `dynamic()` imports for the remaining 14 sections (path: `../../src/components/sections/...`)
7. Make the function `async` and call `const promo = await getActivePromo();`
8. Return `<HomePageWrapper>` wrapping all 17 sections with promo props passed to Hero, PromoCodeBanner, and FinalCTA

Use Task 26 Step 2's code block as the exact template — only the import paths differ (`../../` for these locale pages).

- [ ] **Step 2: Commit**

```bash
git add packages/customer-app/app/es/page.jsx packages/customer-app/app/fr/page.jsx packages/customer-app/app/de/page.jsx packages/customer-app/app/ar/page.jsx packages/customer-app/app/he/page.jsx packages/customer-app/app/hi/page.jsx packages/customer-app/app/ja/page.jsx packages/customer-app/app/pl/page.jsx packages/customer-app/app/pt/page.jsx packages/customer-app/app/ru/page.jsx packages/customer-app/app/uk/page.jsx packages/customer-app/app/zh/page.jsx
git commit -m "feat: update existing locale pages to new 17-section dark theme"
```

---

### Task 32a: Clean Up Old Section Components + Update Barrel

**Files:**
- Modify: `packages/customer-app/src/components/sections/index.js`
- Delete (or rename): Old `HeroSection.jsx`, `FeaturesSection.jsx`, `ActivationSection.jsx` are now replaced

- [ ] **Step 1: Update the barrel file**

The barrel at `src/components/sections/index.js` currently exports the old 5 sections. Update it to export the new sections (keep PlansSection and TravelBlogsSection which are adapted, not replaced):

```js
export { default as NewHeroSection } from './NewHeroSection';
export { default as TrustIndicators } from './TrustIndicators';
export { default as HowItWorks } from './HowItWorks';
export { default as PlansSection } from './PlansSection';
export { default as ComparisonTable } from './ComparisonTable';
export { default as RoamingComparison } from './RoamingComparison';
export { default as FeaturesBento } from './FeaturesBento';
export { default as CoverageStats } from './CoverageStats';
export { default as DeviceCompatibility } from './DeviceCompatibility';
export { default as PromoCodeBanner } from './PromoCodeBanner';
export { default as AppDownload } from './AppDownload';
export { default as DopplerCrossSell } from './DopplerCrossSell';
export { default as SocialProof } from './SocialProof';
export { default as FAQSection } from './FAQSection';
export { default as TravelBlogsSection } from './TravelBlogsSection';
export { default as FinalCTA } from './FinalCTA';
```

- [ ] **Step 2: Verify no other files import old section names**

Search for imports of `HeroSection`, `FeaturesSection`, `ActivationSection` across the codebase. If any non-landing pages import them (unlikely — check dashboard, etc.), keep the old files. If only page.jsx files imported them, the old files are dead code and can be left in place (no deletion needed — just no longer imported).

- [ ] **Step 3: Commit**

```bash
git add packages/customer-app/src/components/sections/index.js
git commit -m "chore: update sections barrel to export new landing page components"
```

---

### Task 32b: Dark Theme Scoping — Known Limitation

**NOTE:** The dark theme is applied globally (body background #0a0a0a, text #f5f5f5). This affects ALL customer-app pages, not just the landing page. The Navbar and Footer are also dark-themed globally.

Inner pages (dashboard, login, cart, settings, payment-success, esim-plans, etc.) still have light-themed component classes (`bg-white`, `text-gray-900`). This creates a dark body with light content islands — which is actually a common dark-mode pattern and is acceptable as an interim state.

**Follow-up work (not in this plan's scope):**
- Adapt dashboard, login, cart, settings pages to dark theme
- Or: add a `theme` context to toggle light/dark per page

No action needed for this task — this is a documentation note for the follow-up.

---

### Task 33: Final Build + Commit

- [ ] **Step 1: Final build check**

```bash
cd /Users/romanpochtman/Developer/esimmain-main && npm run build:customer
```

Expected: Zero errors.

- [ ] **Step 2: Final commit with all remaining changes**

```bash
git add -A
git commit -m "feat: complete landing page redesign — dark theme, 17 sections, 18 languages"
```

---

## Parallelization Guide

For subagent-driven development, these task groups are independent and can run in parallel:

**Group A (Foundation):** Tasks 1-4, 5a, 5b, 5 (mostly sequential — Tasks 3+4 can parallelize after Task 2; Tasks 5a+5b can parallelize after Task 4)

**Group B (New Sections — batch 1):** Tasks 6, 7, 8, 9, 10, 11 (all independent, can run in parallel after Group A)

**Group C (New Sections — batch 2):** Tasks 12, 13, 14, 15, 16, 17, 18, 19 (all independent, can run in parallel after Group A)

**Group D (Existing Component Adaptations):** Tasks 20, 21, 22, 23 (all independent, can run in parallel after Task 2)

**Group E (Page Assembly):** Tasks 24, 25 (sequential, depends on Groups B+C+D)

**Group F (New Languages):** Tasks 26, 27, 28, 29 (sequential, depends on Task 25 for correct page.jsx pattern)

**Group G (Verification + Cleanup):** Tasks 30, 31, 32, 32a, 33 (sequential, depends on all above)

```
A (1-5b) ──┬──> B (6-11)  ──┐
           ├──> C (12-19) ──┼──> E (24-25) ──> F (26-29) ──> G (30-33)
           └──> D (20-23) ──┘
```
