# Complete Setup Guide - eSIM Service

Step-by-step guide to set up the complete eSIM service infrastructure.

## 📋 Prerequisites Checklist

Before starting, ensure you have:

- [ ] VPS access (IP: 72.61.87.54)
- [ ] Supabase account and project
- [ ] Stripe account (for payments)
- [ ] PayPal developer account (optional)
- [ ] Twilio account (for OTP/SMS)
- [ ] SMTP email account (Gmail, SendGrid, etc.)
- [ ] Domain name (optional, for SSL)

## 🎯 Step 1: Supabase Setup

### 1.1 Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Note down:
   - Project URL: `https://xxxxx.supabase.co`
   - Service Role Key: `eyJhbGc...`

### 1.2 Create Database Tables
1. Go to SQL Editor in Supabase dashboard
2. Copy contents from `server/supabase/schema.sql`
3. Execute the SQL
4. Verify tables created:
   - transactions
   - email_logs
   - otp_logs
   - health_logs
   - api_logs

### 1.3 Configure API Settings
1. Go to Settings → API
2. Enable "Public API"
3. Note the anon/public key (not needed for server)
4. Service role key is what we need

## 🎯 Step 2: Stripe Setup

### 2.1 Create Stripe Account
1. Go to [stripe.com](https://stripe.com)
2. Create account or sign in
3. Complete business verification

### 2.2 Get API Keys
1. Go to Developers → API keys
2. Copy:
   - Secret key: `sk_test_...` (test mode) or `sk_live_...` (live mode)
3. Note: Start with test mode

### 2.3 Set Up Webhooks
1. Go to Developers → Webhooks
2. Add endpoint: `http://YOUR_VPS_IP/api/payment/stripe/webhook`
3. Select events:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy webhook signing secret: `whsec_...`

## 🎯 Step 3: Twilio Setup (OTP/SMS)

### 3.1 Create Twilio Account
1. Go to [twilio.com](https://twilio.com)
2. Sign up for free trial or paid account
3. Verify your phone number

### 3.2 Get Credentials
1. Go to Console Dashboard
2. Copy:
   - Account SID: `ACxxxxx...`
   - Auth Token: `xxxxx...`

### 3.3 Get Phone Number
1. Go to Phone Numbers → Buy a Number
2. Select number with SMS capability
3. Note the phone number: `+1234567890`

### 3.4 Enable WhatsApp (Optional)
1. Go to Messaging → Try it out → WhatsApp
2. Follow setup instructions
3. Use same phone number format

## 🎯 Step 4: Email Setup (SMTP)

### Option A: Gmail
1. Enable 2-factor authentication
2. Generate App Password:
   - Google Account → Security → App Passwords
   - Select "Mail" and "Other"
   - Copy generated password
3. Settings:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `your-email@gmail.com`
   - Password: `app-password`

### Option B: SendGrid
1. Create account at [sendgrid.com](https://sendgrid.com)
2. Create API key
3. Settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - User: `apikey`
   - Password: `SG.xxxxx...`

## 🎯 Step 5: VPS Setup

### 5.1 Connect to VPS
```bash
ssh root@72.61.87.54
# Password: VWJetta2014Asd))
```

### 5.2 Run Initial Setup
```bash
# Download setup script
curl -o setup-vps.sh https://raw.githubusercontent.com/YOUR_REPO/server/setup-vps.sh

# Make executable
chmod +x setup-vps.sh

# Run setup
./setup-vps.sh
```

This will:
- Update system packages
- Install Docker & Docker Compose
- Configure firewall
- Set up fail2ban
- Create deployment directory

### 5.3 Verify Installation
```bash
docker --version
docker-compose --version
ufw status
```

## 🎯 Step 6: Deploy Application

### 6.1 Clone Repository (on VPS)
```bash
cd /opt
git clone YOUR_REPOSITORY esim-service
cd esim-service/server
```

Or copy files manually:
```bash
# From local machine
cd /path/to/esimmain
rsync -avz --progress server/ root@72.61.87.54:/opt/esim-service/
```

### 6.2 Configure Environment
```bash
cd /opt/esim-service
cp .env.example .env
nano .env
```

Fill in all values:
```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# PayPal (optional)
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
PAYPAL_MODE=sandbox

# Twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+1234567890

# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=YourSecurePassword123!

# Hostinger (if needed)
HOSTINGER_API_KEY=hrJLLYoLbcdLvTcnBlhZdfyJqI8GUhmeU8zipQfPfdc35905
```

### 6.3 Start Services
```bash
docker-compose up -d --build
```

### 6.4 Verify Services
```bash
# Check status
docker-compose ps

# Check logs
docker-compose logs -f

# Test health
curl http://localhost/health
curl http://localhost/api/health
```

## 🎯 Step 7: Test Everything

### 7.1 Test API Health
```bash
curl http://72.61.87.54/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "api": "up",
    "redis": "up",
    "supabase": "up"
  }
}
```

### 7.2 Test Payment (Stripe)
```bash
curl -X POST http://72.61.87.54/api/payment/stripe/create \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 29.99,
    "currency": "USD",
    "metadata": {"test": true}
  }'
```

### 7.3 Test OTP
```bash
curl -X POST http://72.61.87.54/api/otp/send \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "purpose": "verification"
  }'
```

### 7.4 Test Email
```bash
curl -X POST http://72.61.87.54/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Test</h1>",
    "text": "Test"
  }'
```

### 7.5 Access Dashboard
1. Open browser: `http://72.61.87.54/dashboard`
2. Enter credentials from `.env`
3. Verify all services show as "healthy"
4. Check transaction stats

## 🎯 Step 8: SSL Setup (Production)

### 8.1 Point Domain to VPS
1. Go to your domain registrar
2. Add A record: `@ → 72.61.87.54`
3. Add A record: `www → 72.61.87.54`
4. Wait for DNS propagation (5-30 minutes)

### 8.2 Install Certbot
```bash
apt-get install certbot python3-certbot-nginx
```

### 8.3 Get SSL Certificate
```bash
certbot certonly --standalone -d your-domain.com -d www.your-domain.com
```

### 8.4 Update Nginx Config
```bash
nano /opt/esim-service/nginx/nginx.conf
```

Uncomment HTTPS section and update domain name.

### 8.5 Restart Services
```bash
docker-compose restart nginx
```

## 🎯 Step 9: Production Checklist

Before going live:

- [ ] Change all test keys to production keys
- [ ] Update Stripe to live mode
- [ ] Update PayPal to live mode
- [ ] Set strong dashboard password
- [ ] Enable SSL/HTTPS
- [ ] Set up monitoring (UptimeRobot, etc.)
- [ ] Configure backup strategy
- [ ] Test all payment flows
- [ ] Test all email templates
- [ ] Test OTP delivery
- [ ] Review security settings
- [ ] Set up error alerting
- [ ] Document API keys securely

## 🎯 Step 10: Monitoring & Maintenance

### Daily Tasks
- Check dashboard for system health
- Review transaction logs
- Monitor email delivery

### Weekly Tasks
- Review error logs
- Check disk space
- Update Docker images

### Monthly Tasks
- Review and rotate logs
- Update system packages
- Review security settings
- Backup database

## 🆘 Common Issues

### Issue: Services won't start
```bash
# Check logs
docker-compose logs

# Rebuild
docker-compose down
docker-compose up -d --build --force-recreate
```

### Issue: Can't connect to Supabase
- Verify URL and key in `.env`
- Check Supabase project status
- Test connection: `curl SUPABASE_URL/rest/v1/`

### Issue: Payments failing
- Check Stripe dashboard for errors
- Verify webhook endpoint is accessible
- Check API logs: `docker-compose logs api`

### Issue: Emails not sending
- Test SMTP credentials
- Check email logs in dashboard
- Verify firewall allows port 587

## 📞 Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Stripe Docs**: https://stripe.com/docs
- **Twilio Docs**: https://www.twilio.com/docs
- **Docker Docs**: https://docs.docker.com

## ✅ Success Criteria

Your setup is complete when:
- ✅ All services show "healthy" in dashboard
- ✅ Test payment processes successfully
- ✅ OTP sends and verifies correctly
- ✅ Emails deliver successfully
- ✅ Transactions log to Supabase
- ✅ Dashboard is accessible and updating
- ✅ SSL certificate is active (production)

---

**Congratulations!** 🎉 Your eSIM service infrastructure is now live!

