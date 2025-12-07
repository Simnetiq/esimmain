# eSIM Service - Server Infrastructure

Complete server infrastructure for eSIM service handling payments, OTP, emails, and monitoring.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Nginx (Reverse Proxy)                │
│                    Port 80/443 - Load Balancer               │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
        ┌───────▼────────┐         ┌───────▼────────┐
        │   API Service   │         │   Dashboard    │
        │   Port 3001     │         │   Port 3002    │
        │                 │         │                │
        │ - Payments      │         │ - Monitoring   │
        │ - OTP           │         │ - Analytics    │
        │ - Emails        │         │ - Health       │
        └────────┬────────┘         └────────────────┘
                 │
        ┌────────▼────────┐
        │  Redis Cache    │
        │  Port 6379      │
        └─────────────────┘
                 │
        ┌────────▼────────┐
        │    Supabase     │
        │   (PostgreSQL)  │
        └─────────────────┘
```

## 📦 Services

### 1. API Service (Port 3001)
- **Payment Processing**: Stripe & PayPal integration
- **OTP Service**: SMS & WhatsApp via Twilio
- **Email Service**: SMTP with Nodemailer
- **Transaction Logging**: All payments logged to Supabase
- **Rate Limiting**: Redis-based rate limiting
- **Health Checks**: Built-in health monitoring

### 2. Dashboard (Port 3002)
- **Real-time Monitoring**: WebSocket-based live updates
- **System Health**: Monitor all services status
- **Analytics**: Transaction trends and statistics
- **Docker Management**: View container status
- **Quick Actions**: Direct access to APIs and tools

### 3. Redis (Port 6379)
- **Caching**: Fast data access
- **Rate Limiting**: API request throttling
- **OTP Storage**: Temporary OTP storage
- **Session Management**: User sessions

### 4. Nginx (Port 80/443)
- **Reverse Proxy**: Route requests to services
- **Load Balancing**: Distribute traffic
- **SSL Termination**: HTTPS support
- **Security Headers**: XSS, CSRF protection

## 🚀 Quick Start

### Prerequisites
- VPS with Ubuntu 20.04+ (minimum 2GB RAM)
- Docker & Docker Compose
- Domain name (optional, for SSL)

### 1. Initial VPS Setup

SSH into your VPS:
```bash
ssh root@72.61.87.54
```

Run the setup script:
```bash
cd /opt/esim-service
chmod +x setup-vps.sh
./setup-vps.sh
```

### 2. Configure Environment

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```bash
nano .env
```

Required configurations:
- **Supabase**: URL and service key
- **Stripe**: Secret key and webhook secret
- **PayPal**: Client ID and secret
- **Twilio**: Account SID, auth token, phone number
- **SMTP**: Email server credentials
- **Dashboard**: Username and password

### 3. Set Up Supabase Database

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Run the schema from `supabase/schema.sql`
4. Verify tables are created

### 4. Deploy Services

From your local machine:
```bash
cd server
chmod +x deploy.sh
./deploy.sh
```

Or manually on VPS:
```bash
cd /opt/esim-service
docker-compose up -d --build
```

### 5. Verify Deployment

Check service status:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f
```

Test health:
```bash
curl http://YOUR_VPS_IP/health
curl http://YOUR_VPS_IP/api/health
```

## 📊 Accessing the Dashboard

Navigate to: `http://YOUR_VPS_IP/dashboard`

Default credentials (change in `.env`):
- Username: `admin`
- Password: `change_this_password`

Dashboard features:
- ✅ System health monitoring
- 💰 Transaction statistics
- 📧 Email delivery status
- 🐳 Docker container status
- 📈 Analytics charts
- 🔄 Real-time updates

## 🔌 API Endpoints

### Payment Endpoints
```bash
# Create Stripe payment
POST /api/payment/stripe/create
{
  "amount": 29.99,
  "currency": "USD",
  "metadata": { "plan": "basic" }
}

# Create PayPal order
POST /api/payment/paypal/create
{
  "amount": 29.99,
  "currency": "USD",
  "metadata": { "plan": "basic" }
}

# Capture PayPal payment
POST /api/payment/paypal/capture/:orderId

# Get transaction
GET /api/payment/transaction/:paymentId
```

### OTP Endpoints
```bash
# Send OTP via SMS
POST /api/otp/send
{
  "phoneNumber": "+1234567890",
  "purpose": "verification"
}

# Send OTP via WhatsApp
POST /api/otp/send/whatsapp
{
  "phoneNumber": "+1234567890",
  "purpose": "verification"
}

# Verify OTP
POST /api/otp/verify
{
  "phoneNumber": "+1234567890",
  "otp": "123456",
  "purpose": "verification"
}
```

### Email Endpoints
```bash
# Send generic email
POST /api/email/send
{
  "to": "user@example.com",
  "subject": "Test Email",
  "html": "<h1>Hello</h1>",
  "text": "Hello"
}

# Send verification email
POST /api/email/verification
{
  "email": "user@example.com",
  "verificationToken": "abc123"
}

# Send password reset
POST /api/email/password-reset
{
  "email": "user@example.com",
  "resetToken": "xyz789"
}

# Send order confirmation
POST /api/email/order-confirmation
{
  "email": "user@example.com",
  "orderDetails": {
    "orderId": "ORD123",
    "planName": "Basic Plan",
    "amount": 29.99,
    "currency": "USD"
  }
}
```

### Transaction Endpoints
```bash
# Get all transactions
GET /api/transactions?page=1&limit=50&status=completed&provider=stripe

# Get specific transaction
GET /api/transactions/:paymentId
```

### Health Endpoint
```bash
# Check system health
GET /api/health
```

## 🔐 Security

### Implemented Security Measures
- ✅ Rate limiting on all endpoints
- ✅ Helmet.js security headers
- ✅ CORS protection
- ✅ Input validation with Joi
- ✅ Basic authentication for dashboard
- ✅ Firewall (UFW) configuration
- ✅ Fail2ban for brute force protection
- ✅ Environment variable protection

### SSL/HTTPS Setup (Recommended)

1. Install Certbot:
```bash
apt-get install certbot python3-certbot-nginx
```

2. Get SSL certificate:
```bash
certbot --nginx -d your-domain.com
```

3. Update `nginx/nginx.conf` with SSL configuration

4. Restart Nginx:
```bash
docker-compose restart nginx
```

## 📝 Logging

Logs are stored in `/opt/esim-service/logs/`:
- `combined-YYYY-MM-DD.log`: All logs
- `error-YYYY-MM-DD.log`: Error logs only
- Logs rotate daily, kept for 14 days

View logs:
```bash
# API logs
docker-compose logs -f api

# Dashboard logs
docker-compose logs -f dashboard

# All logs
docker-compose logs -f

# Specific service logs
tail -f logs/combined-$(date +%Y-%m-%d).log
```

## 🔧 Maintenance

### Update Services
```bash
cd /opt/esim-service
docker-compose pull
docker-compose up -d --build
```

### Backup Database
```bash
# Supabase has automatic backups
# For manual backup, use Supabase dashboard or CLI
```

### Monitor Resources
```bash
# Check disk space
df -h

# Check memory
free -h

# Check Docker stats
docker stats

# Check container health
docker-compose ps
```

### Restart Services
```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart api
docker-compose restart dashboard
docker-compose restart redis
```

## 🐛 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs api

# Check environment variables
docker-compose config

# Rebuild containers
docker-compose down
docker-compose up -d --build --force-recreate
```

### Database Connection Issues
- Verify Supabase URL and key in `.env`
- Check Supabase dashboard for service status
- Verify network connectivity

### Payment Issues
- Check Stripe/PayPal credentials
- Verify webhook endpoints are accessible
- Check transaction logs in Supabase

### Email Not Sending
- Verify SMTP credentials
- Check email logs in dashboard
- Test SMTP connection manually

## 📊 Monitoring & Alerts

### Built-in Monitoring
- Dashboard provides real-time health checks
- WebSocket updates every 5 seconds
- Transaction tracking
- Email delivery monitoring

### External Monitoring (Recommended)
- **UptimeRobot**: Monitor uptime
- **Sentry**: Error tracking
- **Datadog**: Infrastructure monitoring
- **CloudWatch**: AWS monitoring (if applicable)

## 🔄 CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to VPS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to VPS
        run: |
          cd server
          ./deploy.sh
```

## 📞 Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Verify environment variables
3. Check Supabase dashboard
4. Review API documentation

## 📄 License

Proprietary - eSIM Service

---

**Server Information:**
- VPS IP: 72.61.87.54
- OS: Ubuntu
- Hostinger API Key: hrJLLYoLbcdLvTcnBlhZdfyJqI8GUhmeU8zipQfPfdc35905

