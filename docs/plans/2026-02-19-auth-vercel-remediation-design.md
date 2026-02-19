# Auth + Vercel Build Remediation Plan

**Date:** 2026-02-19
**Status:** Pending Approval
**Scope:** Fix Google OAuth behavior, fix Apple OAuth `invalid_client`, stabilize Vercel builds

---

## 1. Root Cause Hypotheses (Evidence-Based)

### 1A. Apple Sign-In: `invalid_client` on Supabase callback

**Error from Supabase auth logs:**
```
oauth2: "invalid_client"
500: Unable to exchange external code: c0ef22bb5f3b24bad921359c95a6b4ee0.0.sxwv.XpNla3TvVGZ591JdgwZaGg
```

**Root Cause:** The Apple provider in Supabase Auth is **misconfigured or incomplete**. When Supabase tries to exchange the authorization code with Apple's token endpoint, Apple rejects it with `invalid_client`. This means one of:

1. **The `client_secret` (JWT) Supabase generates is wrong** — likely the Apple private key, Team ID, Key ID, or Services ID is incorrect or missing in the Supabase dashboard.
2. **The Apple Services ID (`com.simnetiq.web`) does not have the correct Return URL registered** — must include `https://eujmomonscnlmwcbkbfy.supabase.co/auth/v1/callback`.
3. **The Apple private key stored in Supabase** has formatting issues (newlines, header/footer stripped, etc.).

**Evidence:**
- Supabase logs show Apple `/authorize` redirects succeed (302) but `/callback` fails with `invalid_client`
- This confirms Supabase IS configured as a provider but the token exchange credentials are wrong
- The code currently has TWO Apple flows fighting each other: a custom `signInWithApple()` in AuthContext (direct Apple URL) AND Supabase's built-in Apple OAuth

### 1B. Google OAuth: "Login success before account selection"

**Root Cause:** This is **expected browser behavior when the user has a single active Google session**. Google skips the account picker when:
- Only one Google account is logged in to the browser
- The OAuth consent has already been granted for this client

The Supabase `onAuthStateChange` listener fires immediately when the callback page loads with valid tokens in the URL hash. The AuthRedirect component on `/login` detects the existing session and redirects before the user perceives the Google picker. This creates a "flash of success."

**Evidence from AuthRedirect.jsx:**
- It checks `currentUser` on mount and redirects immediately if authenticated
- If the user was previously logged in and the session is still valid in cookies, visiting `/login` auto-redirects to `/dashboard` — this looks like "success before selection"

**Additional issue:** The Google OAuth `redirectTo` uses `window.location.origin` which in production is `https://www.simnetiq.store`, but the Supabase Site URL / Redirect URLs must include this exact origin.

### 1C. Vercel Build Failure: `basePath` error

**Error:** `"Second argument (basePath) must be specified for names of resulting files"`

**Root Cause:** The `vercel.json` configuration has been oscillating between `"framework": "nextjs"` and `"framework": null`.

**Commit history shows:**
- `b676f04`: Removed `framework` field, set `outputDirectory: ".next"` → build errors
- `d9932a6`: Re-added `"framework": "nextjs"` → still errors
- `3d08481`: Changed to `"framework": null`, `"outputDirectory": ".next"` → the latest deploy succeeded (3 min ago)

**The actual fix was in the latest commit** — setting `"framework": null` with explicit `"outputDirectory": ".next"` tells Vercel to treat it as a generic build (not Next.js-framework-managed). This works because:
- The monorepo build runs from the root (`cd ../.. && npm run build:customer`)
- When `framework: "nextjs"`, Vercel's Next.js builder expects to control the build process and looks for Next.js output in a specific way — but since we use a custom build command from the monorepo root, Vercel's builder can't find the output where it expects it (causing the basePath error)
- With `framework: null`, Vercel just runs the build command and looks for output in `.next/`

**Current status:** The latest deployment (3 min ago) is `Ready` and appears to be working. However, this fix needs validation — `framework: null` means Vercel won't apply Next.js-specific optimizations (ISR, serverless functions routing, etc.).

---

## 2. Verification Steps

### 2A. Confirm current Vercel deployment is functional
- [ ] Visit `https://www.simnetiq.store` and verify pages load
- [ ] Test that API routes work (e.g., `/api/auth/apple/callback`)
- [ ] Test that serverless functions execute (critical for Apple callback)

### 2B. Test Google OAuth end-to-end
- [ ] Open an incognito window
- [ ] Navigate to `https://www.simnetiq.store/login`
- [ ] Click "Continue with Google"
- [ ] Verify Google account picker appears
- [ ] After selecting account, verify redirect to `/auth/callback` then `/dashboard`
- [ ] Check Supabase auth logs for successful login event

### 2C. Test Apple OAuth (after fix)
- [ ] Navigate to `https://www.simnetiq.store/login`
- [ ] Click "Continue with Apple"
- [ ] Verify Apple ID authorization page appears
- [ ] After authorization, verify redirect flow completes to `/dashboard`
- [ ] Check Supabase auth logs for successful Apple login event

---

## 3. Exact Configuration Values Required

### 3A. Apple Developer Console Configuration

**Step 1: Verify the App ID**
- Go to: Certificates, Identifiers & Profiles → Identifiers
- Find or create App ID with bundle ID matching your app
- Ensure "Sign In with Apple" capability is **enabled**

**Step 2: Configure the Services ID**
- Identifier: `com.simnetiq.web` (this is your `APPLE_CLIENT_ID`)
- Enable "Sign In with Apple"
- Click "Configure" and set:
  - **Primary App ID:** Your app's App ID
  - **Domains:** `eujmomonscnlmwcbkbfy.supabase.co`
  - **Return URLs:** `https://eujmomonscnlmwcbkbfy.supabase.co/auth/v1/callback`

> CRITICAL: The return URL must be EXACTLY `https://eujmomonscnlmwcbkbfy.supabase.co/auth/v1/callback` — this is where Supabase's built-in OAuth flow expects Apple to POST back to.

**Step 3: Verify the Key**
- Go to Keys → find key `956DM4P985`
- Ensure "Sign In with Apple" is enabled for this key
- The associated App ID must match your Primary App ID

### 3B. Supabase Auth Provider Configuration

In the Supabase Dashboard → Authentication → Providers → Apple:

| Field | Value |
|---|---|
| **Enabled** | `true` |
| **Client ID (Services ID)** | `com.simnetiq.web` |
| **Secret Key (Apple Private Key)** | The full PEM key (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`) |
| **Team ID** | `F7YY9U667A` |
| **Key ID** | `956DM4P985` |

> NOTE: The private key must be the **raw PEM format**, not escaped. Supabase dashboard handles it as multiline text.

### 3C. Supabase Auth General Settings

| Setting | Value |
|---|---|
| **Site URL** | `https://www.simnetiq.store` |
| **Redirect URLs** | `https://www.simnetiq.store/auth/callback`, `https://simnetiq.store/auth/callback`, `http://localhost:3000/auth/callback` |

### 3D. Required Environment Variables (Vercel)

These must be set in Vercel project settings for **Production**:

| Variable | Value | Visibility |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://eujmomonscnlmwcbkbfy.supabase.co` | All environments |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | (current JWT) | All environments |
| `SUPABASE_URL` | `https://eujmomonscnlmwcbkbfy.supabase.co` | Server only |
| `SUPABASE_SERVICE_ROLE_KEY` | (current service role JWT) | Server only, Production |
| `SUPABASE_SERVICE_KEY` | (same as SERVICE_ROLE_KEY — alias used by supabaseServer.js) | Server only |

**Variables to REMOVE** (no longer needed after consolidating to Supabase-native Apple):
| Variable | Reason |
|---|---|
| `APPLE_TEAM_ID` | Supabase handles this internally |
| `APPLE_KEY_ID` | Supabase handles this internally |
| `APPLE_CLIENT_ID` | Supabase handles this internally |
| `APPLE_PRIVATE_KEY` | Supabase handles this internally |

---

## 4. Code Changes Required

### 4A. Consolidate Apple Sign-In to Supabase-native OAuth

**File: `packages/shared/contexts/AuthContext.jsx`**

Replace the custom `signInWithApple()` function with Supabase OAuth (mirror the Google flow):

```javascript
// BEFORE (custom Apple flow):
async function signInWithApple() {
  if (typeof window === 'undefined') return;
  const clientId = 'com.simnetiq.web';
  const redirectUri = 'https://simnetiq.store/api/auth/apple/callback';
  // ... manual URL construction ...
  window.location.href = `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

// AFTER (Supabase-native flow):
async function signInWithApple() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
      },
    });
    if (error) throw error;
    return data;
  } catch (error) {
    throw error;
  }
}
```

### 4B. Remove the custom Apple callback API route

**Delete:** `packages/customer-app/app/api/auth/apple/callback/route.js`

This file is no longer needed — Supabase handles the token exchange via its own `/auth/v1/callback` endpoint.

### 4C. Vercel Configuration (Already Fixed)

The current `vercel.json` with `"framework": null` is working. However, we should switch back to `"framework": "nextjs"` with a corrected `outputDirectory` to preserve Next.js-specific features:

**Recommended approach:** Test if `"framework": "nextjs"` works now that the root `package.json` has `next@^15.5.12` (the latest commit also upgraded this). If it does, use it. If not, keep `framework: null`.

### 4D. Fix AuthRedirect "flash of success" for Google

**File: `packages/customer-app/src/components/AuthRedirect.jsx`**

Add a guard to ensure the session is fresh (not stale from a previous login):

This is a minor UX issue, not a blocking bug. The current behavior is:
1. User visits `/login` → AuthRedirect checks `currentUser` → if logged in, redirect to dashboard
2. This is correct behavior. If the user doesn't want auto-login, they should log out first.

**No code change needed** unless you want to add a "not you?" button on the login page.

---

## 5. Safe Rebuild Procedure

### Step 1: Configure Apple in Supabase Dashboard
1. Go to Supabase Dashboard → Auth → Providers → Apple
2. Enter the exact values from Section 3B
3. Save

### Step 2: Configure Apple Developer Console
1. Verify Services ID `com.simnetiq.web` has return URL: `https://eujmomonscnlmwcbkbfy.supabase.co/auth/v1/callback`
2. Verify domain `eujmomonscnlmwcbkbfy.supabase.co` is registered

### Step 3: Update Supabase Auth Settings
1. Set Site URL to `https://www.simnetiq.store`
2. Add redirect URLs per Section 3C

### Step 4: Code Changes
1. Update `signInWithApple()` in AuthContext.jsx
2. Delete the custom Apple callback route
3. Commit and push

### Step 5: Verify Vercel Deployment
1. Monitor Vercel dashboard for successful build
2. Run post-fix validation checklist

---

## 6. Post-Fix Validation Checklist

- [ ] **Build:** Vercel deployment completes without errors
- [ ] **Google OAuth:** Login works in incognito (account picker shown, redirects to dashboard)
- [ ] **Apple OAuth:** Login works (Apple ID page shown, redirects back to app, session created)
- [ ] **Session Persistence:** Refresh page after login — user stays logged in
- [ ] **Logout:** Clicking logout clears session, redirects to login
- [ ] **Profile Creation:** New OAuth users get a profile in the `users` table
- [ ] **Supabase Auth Logs:** No `invalid_client` errors for Apple
- [ ] **Supabase Auth Logs:** Successful login events for both providers
- [ ] **API Routes:** Other API routes still functional (Stripe checkout, etc.)
- [ ] **Middleware:** Language detection still works correctly

---

## 7. Supabase MCP Tools Usage

| Tool | Purpose | When |
|---|---|---|
| `get_logs(service: "auth")` | Monitor auth events for `invalid_client` errors | After configuring Apple provider |
| `execute_sql` | Query `auth.users` to verify Apple user creation | After first successful Apple login |
| `get_advisors(type: "security")` | Check for security issues (missing RLS, etc.) | After all changes are deployed |
| `get_project` | Verify project status is healthy | Before and after changes |

### Verification Query (after Apple login succeeds):
```sql
SELECT id, email, raw_app_meta_data->>'provider' as provider, created_at
FROM auth.users
WHERE raw_app_meta_data->>'provider' = 'apple'
ORDER BY created_at DESC LIMIT 5;
```
