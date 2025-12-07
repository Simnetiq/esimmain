# 🎯 START HERE - eSIM Service Setup

Welcome! This guide will get your eSIM service up and running in **under 2 hours**.

## 📋 What You're Building

A complete backend infrastructure that handles:
- 💳 **Payments** (Stripe & PayPal)
- 📱 **OTP/SMS** (Twilio)
- 📧 **Emails** (SMTP)
- 🗄️ **Database** (Supabase)
- 📊 **Monitoring** (Real-time Dashboard)

## 🚀 Quick Start (3 Steps)

### Step 1: Set Up Services (30 min)

You need accounts for these services:

1. **Supabase** (Database) - FREE
   - Go to: https://supabase.com
   - Create project
   - Save: Project URL & Service Key

2. **Stripe** (Payments) - FREE TEST MODE
   - Go to: https://stripe.com
   - Create account
   - Save: Secret Key & Webhook Secret

3. **Twilio** (OTP/SMS) - FREE TRIAL
   - Go to: https://twilio.com
   - Sign up
   - Save: Account SID, Auth Token, Phone Number

4. **Email Provider** (SMTP) - FREE
   - Gmail: Enable App Password
   - Or SendGrid: Get API Key

### Step 2: Deploy to VPS (30 min)

**Option A: Manual Upload (Recommended - No Git Required)**

```bash
# 1. From your LOCAL machine, compress and upload
cd /Users/romanpochtman/Developer/esimmain
tar -czf server.tar.gz server/ --exclude='**/node_modules' --exclude='**/logs'
scp server.tar.gz root@72.61.87.54:/opt/

# 2. SSH into VPS
ssh root@72.61.87.54
# Password: VWJetta2014Asd))

# 3. Extract files
cd /opt
tar -xzf server.tar.gz
cd server

# 4. Run setup script (installs Docker, etc.)
chmod +x setup-vps.sh
./setup-vps.sh

# 5. Configure environment
nano .env  # Copy from .env.template and fill in your API keys

# 6. Start services
docker-compose up -d --build

# 7. Check status
docker-compose ps
curl http://localhost/health
```

**Option B: If Files Are on GitHub**

```bash
# 1. SSH into VPS
ssh root@72.61.87.54

# 2. Clone repository
cd /opt
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git esim-service
cd esim-service/server

# 3. Run setup
chmod +x setup-vps.sh
./setup-vps.sh

# 4. Configure and start (same as above steps 5-7)
```

### Step 3: Test Everything (15 min)

```bash
# Run automated tests
./test-api.sh http://72.61.87.54

# Access dashboard
# Open: http://72.61.87.54/dashboard
# Login with credentials from .env
```

## 📚 Documentation Guide

We've created comprehensive documentation for you:

### 🎯 **START_HERE.md** (This file)
- Quick overview
- 3-step setup
- What to read next

### 📖 **README.md** 
- Complete API documentation
- All endpoints and examples
- Architecture overview
- **Read this**: For API reference

### 🔧 **SETUP_GUIDE.md**
- Detailed step-by-step instructions
- Service configuration
- Troubleshooting
- **Read this**: When setting up for the first time

### ✅ **DEPLOYMENT_CHECKLIST.md**
- Complete deployment checklist
- Pre-deployment verification
- Post-deployment testing
- **Read this**: Before going live

### 📊 **PROJECT_SUMMARY.md**
- What was created
- File structure
- Features overview
- **Read this**: To understand the project

### 🚀 **QUICK_REFERENCE.md**
- Common commands
- Quick troubleshooting
- Emergency procedures
- **Read this**: Keep handy for daily operations

## 🗂️ File Structure

```
server/
├── 📄 START_HERE.md              ← You are here!
├── 📄 README.md                  ← API Documentation
├── 📄 SETUP_GUIDE.md             ← Detailed Setup
├── 📄 DEPLOYMENT_CHECKLIST.md    ← Pre-launch Checklist
├── 📄 PROJECT_SUMMARY.md         ← Project Overview
├── 📄 QUICK_REFERENCE.md         ← Quick Commands
│
├── 🐳 docker-compose.yml         ← Docker orchestration
├── 🔒 .env.example               ← Environment template
│
├── 🚀 Scripts:
│   ├── deploy.sh                 ← Deploy to VPS
│   ├── setup-vps.sh              ← Initial VPS setup
│   ├── quick-start.sh            ← Quick start helper
│   └── test-api.sh               ← API testing
│
├── 🔌 api/                       ← Main API Service
│   ├── routes/                   ← API endpoints
│   ├── services/                 ← Business logic
│   ├── middleware/               ← Express middleware
│   └── config/                   ← Configuration
│
├── 📊 dashboard/                 ← Monitoring Dashboard
│   ├── views/                    ← Dashboard UI
│   ├── public/                   ← Static assets
│   └── server.js                 ← Dashboard server
│
├── 🌐 nginx/                     ← Reverse Proxy
│   └── nginx.conf                ← Nginx config
│
└── 🗄️ supabase/                  ← Database
    └── schema.sql                ← Database schema
```

## 🎓 Learning Path

### For First-Time Setup:
1. **START_HERE.md** (this file) - Overview
2. **SETUP_GUIDE.md** - Follow step-by-step
3. **DEPLOYMENT_CHECKLIST.md** - Verify everything
4. **QUICK_REFERENCE.md** - Bookmark for later

### For API Integration:
1. **README.md** - API documentation
2. **PROJECT_SUMMARY.md** - Architecture
3. Test with Postman/curl

### For Operations:
1. **QUICK_REFERENCE.md** - Daily commands
2. **Dashboard** - Monitor health
3. **Logs** - Troubleshoot issues

## 🔑 Key Credentials

You'll need to configure these in `.env`:

```env
# Supabase (Database)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# Stripe (Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Twilio (OTP/SMS)
TWILIO_ACCOUNT_SID=ACxxxxx...
TWILIO_AUTH_TOKEN=xxxxx...
TWILIO_PHONE_NUMBER=+1234567890

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Dashboard
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=YourSecurePassword123!
```

## 🎯 Your VPS Details

```
IP Address: 72.61.87.54
Username: root
Password: VWJetta2014Asd))
OS: Ubuntu
Hostinger API: hrJLLYoLbcdLvTcnBlhZdfyJqI8GUhmeU8zipQfPfdc35905
```

## 🌐 Service URLs (After Deployment)

- **API**: http://72.61.87.54/api/
- **Dashboard**: http://72.61.87.54/dashboard
- **Health Check**: http://72.61.87.54/health

## 📊 What You Get

### API Endpoints
- ✅ Payment processing (Stripe & PayPal)
- ✅ OTP sending (SMS & WhatsApp)
- ✅ Email delivery (transactional)
- ✅ Transaction logging
- ✅ Health monitoring

### Dashboard Features
- ✅ Real-time system health
- ✅ Transaction statistics
- ✅ Email delivery tracking
- ✅ Docker container status
- ✅ Analytics charts
- ✅ Live updates (WebSocket)

### Infrastructure
- ✅ Docker containerization
- ✅ Redis caching
- ✅ Nginx reverse proxy
- ✅ Supabase database
- ✅ Automated health checks
- ✅ Rate limiting
- ✅ Error logging

## ⚡ Quick Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Test API
./test-api.sh http://72.61.87.54

# Access dashboard
open http://72.61.87.54/dashboard
```

## 🆘 Need Help?

### Common Issues

**Services won't start?**
```bash
docker-compose logs
docker-compose down && docker-compose up -d --build
```

**Can't connect to database?**
- Check Supabase URL in `.env`
- Verify service key is correct
- Check Supabase dashboard status

**Payments failing?**
- Verify Stripe keys in `.env`
- Check webhook configuration
- Review Stripe dashboard

**Emails not sending?**
- Test SMTP credentials
- Check email logs in dashboard
- Verify firewall allows port 587

### Get Support

1. Check **QUICK_REFERENCE.md** for commands
2. Review **SETUP_GUIDE.md** for detailed steps
3. Check logs: `docker-compose logs -f`
4. Review service dashboards (Supabase, Stripe, Twilio)

## ✅ Success Checklist

Your setup is complete when:
- [ ] All services running (`docker-compose ps`)
- [ ] Health check passes (`curl http://72.61.87.54/health`)
- [ ] Dashboard accessible
- [ ] Test payment works
- [ ] Test OTP sends
- [ ] Test email delivers
- [ ] Transactions log to Supabase

## 🎉 Next Steps

After successful setup:

1. **Test Everything**
   - Run `./test-api.sh`
   - Test each endpoint manually
   - Verify dashboard shows data

2. **Integrate with Frontend**
   - Use API endpoints from README.md
   - Test payment flow
   - Test OTP verification

3. **Go to Production**
   - Switch to production API keys
   - Enable SSL/HTTPS
   - Set up monitoring alerts
   - Configure backups

4. **Monitor & Maintain**
   - Check dashboard daily
   - Review logs weekly
   - Update services monthly

## 📞 Important Links

- **Supabase Dashboard**: https://app.supabase.com
- **Stripe Dashboard**: https://dashboard.stripe.com
- **Twilio Console**: https://console.twilio.com
- **Hostinger Panel**: https://hpanel.hostinger.com

## 💡 Pro Tips

1. **Start with Test Mode**: Use test API keys first
2. **Monitor Logs**: Keep an eye on logs during testing
3. **Use Dashboard**: It shows real-time status
4. **Test Webhooks**: Verify Stripe webhooks work
5. **Backup .env**: Keep credentials safe
6. **Document Changes**: Note any customizations

## 🚀 Ready to Start?

1. **Read**: SETUP_GUIDE.md for detailed instructions
2. **Configure**: Set up your service accounts
3. **Deploy**: Follow the 3-step quick start above
4. **Test**: Run the test script
5. **Launch**: Go live with confidence!

---

**Time to Complete**: ~2 hours
**Difficulty**: Intermediate
**Prerequisites**: Basic Linux, Docker knowledge

**Let's build something amazing! 🎉**

---

Need help? Check the other documentation files or review the logs.
Everything you need is in this `server/` folder!

