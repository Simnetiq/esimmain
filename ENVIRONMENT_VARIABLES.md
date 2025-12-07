# 🔐 Environment Variables Reference

## Complete list of required environment variables for production deployment

Copy these to your Vercel project settings → Environment Variables

---

## 🔵 Airalo API Configuration

```bash
# MODE: Set to 'production' when ready to go live
AIRALO_MODE=production

# Production Credentials (from Airalo Account Manager)
AIRALO_CLIENT_ID=your_production_client_id
AIRALO_CLIENT_SECRET=your_production_client_secret
AIRALO_BASE_URL=https://partners-api.airalo.com

# Optional: Sandbox credentials for testing
AIRALO_CLIENT_ID_SANDBOX=your_sandbox_client_id
AIRALO_CLIENT_SECRET_SANDBOX=your_sandbox_client_secret
AIRALO_BASE_URL_SANDBOX=https://sandbox-partners-api.airalo.com
```

---

## 💳 Stripe Payment Configuration

```bash
# MODE: Set to 'live' for production
STRIPE_MODE=live

# Production Keys (from Stripe Dashboard → Developers → API Keys)
STRIPE_SECRET_KEY_LIVE=sk_live_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Fallback keys (use production keys in production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional: Test keys for development
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_WEBHOOK_SECRET_TEST=whsec_test_...
```

---

## 🔥 Firebase Configuration

```bash
# Client SDK (from Firebase Console → Project Settings → General)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Admin SDK (from Firebase Console → Project Settings → Service Accounts)
FIREBASE_ADMIN_PROJECT_ID=your-project-id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 🪙 Coinbase Commerce (Crypto Payments)

```bash
COINBASE_COMMERCE_API_KEY=your_api_key
NEXT_PUBLIC_COINBASE_COMMERCE_API_KEY=your_api_key
```

---

## 📧 Email Service (Resend)

```bash
RESEND_API_KEY=re_...
```

---

## 🌐 Application URLs

```bash
NEXT_PUBLIC_BASE_URL=https://www.simnetiq.com
NEXT_PUBLIC_APP_URL=https://www.simnetiq.com
```

---

## 🔐 Payment Security

```bash
# Secret key for order verification (generate a random string)
PAYMENT_SECRET_KEY=your_random_secret_key_here_min_32_chars
```

---

## 📋 Quick Copy for Vercel

For Vercel deployment, add these variables in:
**Project Settings → Environment Variables**

Set for: **Production**, **Preview**, and **Development** environments

---

## 🔄 Mode Switching

### Production Mode:
```bash
AIRALO_MODE=production
STRIPE_MODE=live
```

### Testing Mode:
```bash
AIRALO_MODE=sandbox
STRIPE_MODE=test
```

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] `AIRALO_MODE=production`
- [ ] `STRIPE_MODE=live`
- [ ] All Firebase keys are set
- [ ] Stripe production keys are configured
- [ ] Airalo production credentials are set
- [ ] Base URLs point to production domain
- [ ] Webhook secrets are configured
- [ ] Email service is configured

---

## 🚨 Security Notes

1. **Never commit** these values to git
2. **Keep private keys** secure and encrypted
3. **Rotate keys** regularly
4. **Use different keys** for dev/staging/production
5. **Set proper** Vercel environment scopes

---

Last Updated: Dec 7, 2025
