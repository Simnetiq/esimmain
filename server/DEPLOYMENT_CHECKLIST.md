# 🚀 Deployment Checklist

Use this checklist to deploy your eSIM service to the VPS.

## ✅ Pre-Deployment

### Accounts & Credentials
- [ ] Supabase project created
- [ ] Stripe account set up
- [ ] Twilio account configured
- [ ] SMTP/Email service ready
- [ ] VPS access confirmed (72.61.87.54)

### Configuration Files
- [ ] `.env` file created and filled
- [ ] All API keys added to `.env`
- [ ] Dashboard credentials set
- [ ] Supabase URL and key added

## ✅ VPS Preparation

### Initial Setup
```bash
# SSH into VPS
ssh root@72.61.87.54
# Password: VWJetta2014Asd))

# Run setup script
cd /opt/esim-service
chmod +x setup-vps.sh
./setup-vps.sh
```

- [ ] Docker installed
- [ ] Docker Compose installed
- [ ] Firewall configured
- [ ] Fail2ban enabled
- [ ] Deployment directory created

## ✅ Database Setup

### Supabase Configuration
```sql
-- Run in Supabase SQL Editor
-- Copy from: server/supabase/schema.sql
```

- [ ] Tables created (transactions, email_logs, otp_logs, health_logs, api_logs)
- [ ] Indexes created
- [ ] Functions created
- [ ] Connection tested

## ✅ Service Configuration

### Environment Variables
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_SERVICE_KEY` set
- [ ] `STRIPE_SECRET_KEY` set
- [ ] `STRIPE_WEBHOOK_SECRET` set
- [ ] `TWILIO_ACCOUNT_SID` set
- [ ] `TWILIO_AUTH_TOKEN` set
- [ ] `TWILIO_PHONE_NUMBER` set
- [ ] `SMTP_HOST` set
- [ ] `SMTP_USER` set
- [ ] `SMTP_PASSWORD` set
- [ ] `DASHBOARD_USERNAME` set
- [ ] `DASHBOARD_PASSWORD` set (strong password!)

## ✅ Deployment

### Deploy Services
```bash
cd /opt/esim-service
docker-compose up -d --build
```

- [ ] All containers started
- [ ] No errors in logs
- [ ] Health check passes

### Verify Services
```bash
# Check status
docker-compose ps

# Check logs
docker-compose logs -f

# Test endpoints
curl http://72.61.87.54/health
curl http://72.61.87.54/api/health
```

- [ ] API service running
- [ ] Dashboard running
- [ ] Redis running
- [ ] Nginx running

## ✅ Testing

### API Tests
```bash
# Run test script
chmod +x test-api.sh
./test-api.sh http://72.61.87.54
```

- [ ] Health endpoint works
- [ ] Payment endpoint responds
- [ ] OTP endpoint responds
- [ ] Email endpoint responds
- [ ] Transactions endpoint works

### Dashboard Access
```
URL: http://72.61.87.54/dashboard
Username: [from .env]
Password: [from .env]
```

- [ ] Dashboard accessible
- [ ] Login works
- [ ] All services show "healthy"
- [ ] Stats display correctly
- [ ] Real-time updates working

### Integration Tests
- [ ] Create test Stripe payment
- [ ] Send test OTP
- [ ] Send test email
- [ ] Verify transaction logged in Supabase
- [ ] Check email logged in Supabase

## ✅ Webhook Configuration

### Stripe Webhooks
```
URL: http://72.61.87.54/api/payment/stripe/webhook
Events: payment_intent.succeeded, payment_intent.payment_failed
```

- [ ] Webhook endpoint added in Stripe
- [ ] Webhook secret added to `.env`
- [ ] Test webhook sent
- [ ] Webhook received and processed

## ✅ Security

### Basic Security
- [ ] Firewall enabled (ports 22, 80, 443 only)
- [ ] Fail2ban running
- [ ] Strong dashboard password set
- [ ] Environment variables secured
- [ ] Rate limiting enabled

### SSL/HTTPS (Production)
- [ ] Domain pointed to VPS
- [ ] SSL certificate obtained
- [ ] Nginx configured for HTTPS
- [ ] HTTP redirects to HTTPS
- [ ] Certificate auto-renewal set up

## ✅ Monitoring

### Set Up Monitoring
- [ ] Dashboard accessible
- [ ] Health checks working
- [ ] Logs rotating properly
- [ ] External monitoring configured (optional)

### Alerts (Optional)
- [ ] UptimeRobot configured
- [ ] Email alerts set up
- [ ] Slack/Discord webhooks (optional)

## ✅ Documentation

### Team Documentation
- [ ] API endpoints documented
- [ ] Dashboard access shared
- [ ] Emergency procedures documented
- [ ] Backup procedures documented

## ✅ Go Live

### Final Checks
- [ ] All tests passing
- [ ] No errors in logs
- [ ] Dashboard shows all green
- [ ] Transactions logging correctly
- [ ] Emails sending
- [ ] OTP working

### Switch to Production
- [ ] Stripe test mode → live mode
- [ ] PayPal sandbox → live
- [ ] Update webhook URLs
- [ ] Test with real payment (small amount)
- [ ] Monitor for 24 hours

## ✅ Post-Deployment

### Day 1
- [ ] Monitor logs continuously
- [ ] Check dashboard every hour
- [ ] Test all critical flows
- [ ] Verify transaction logging

### Week 1
- [ ] Daily log review
- [ ] Performance monitoring
- [ ] Error rate tracking
- [ ] User feedback collection

### Ongoing
- [ ] Weekly system updates
- [ ] Monthly security review
- [ ] Quarterly backup testing
- [ ] Regular performance optimization

## 🆘 Rollback Plan

If something goes wrong:

```bash
# Stop services
docker-compose down

# Restore previous version
git checkout previous-version

# Restart services
docker-compose up -d --build

# Verify
curl http://72.61.87.54/health
```

## 📞 Emergency Contacts

- **VPS Provider**: Hostinger
- **API Key**: hrJLLYoLbcdLvTcnBlhZdfyJqI8GUhmeU8zipQfPfdc35905
- **Supabase Support**: support@supabase.io
- **Stripe Support**: https://support.stripe.com
- **Twilio Support**: https://support.twilio.com

## ✅ Success Criteria

Deployment is successful when:
- ✅ All services running without errors
- ✅ Dashboard accessible and showing healthy status
- ✅ Test payment completes successfully
- ✅ Test OTP sends and verifies
- ✅ Test email delivers
- ✅ Transactions log to Supabase
- ✅ No errors in logs for 1 hour
- ✅ Real-time monitoring working

---

**Date Deployed**: _______________
**Deployed By**: _______________
**Version**: 1.0.0

