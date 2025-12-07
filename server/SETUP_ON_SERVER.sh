#!/bin/bash

# eSIM Service - Server Setup Script
# Run this on your server: bash SETUP_ON_SERVER.sh

set -e  # Exit on any error

echo "🚀 eSIM Service - Server Setup"
echo "================================"
echo ""

# Step 1: Move to the correct directory
echo "📁 Step 1: Setting up directory structure..."
cd ~
if [ -d "server" ]; then
    echo "✅ Server directory found"
    mv server /opt/esim-service
    echo "✅ Moved to /opt/esim-service"
else
    echo "❌ Error: server directory not found"
    echo "Please make sure you've extracted server.zip"
    exit 1
fi

cd /opt/esim-service

# Step 2: Check for Docker
echo ""
echo "🐳 Step 2: Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "📦 Docker not found. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

if ! command -v docker-compose &> /dev/null; then
    echo "📦 Installing Docker Compose..."
    apt-get update
    apt-get install -y docker-compose
    echo "✅ Docker Compose installed"
else
    echo "✅ Docker Compose already installed"
fi

# Step 3: Create .env file
echo ""
echo "📝 Step 3: Creating environment configuration..."
cat > .env << 'EOF'
# Supabase Configuration
SUPABASE_URL=REPLACE_WITH_YOUR_SUPABASE_URL
SUPABASE_SERVICE_KEY=REPLACE_WITH_YOUR_SUPABASE_KEY

# Stripe Configuration
STRIPE_SECRET_KEY=REPLACE_WITH_YOUR_STRIPE_KEY
STRIPE_WEBHOOK_SECRET=REPLACE_WITH_YOUR_WEBHOOK_SECRET

# PayPal Configuration (Optional)
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox

# Twilio Configuration (Optional - for OTP/SMS)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email Configuration (SMTP)
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=587
SMTP_USER=rpochtman@simnetiq.store
SMTP_PASSWORD=VWGolf2014Asd))!

# Dashboard Configuration
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=VWGolf2014Asd))!

# System Configuration
REDIS_URL=redis://redis:6379
APP_URL=http://72.61.87.54
NODE_ENV=production
LOG_LEVEL=info
PORT=3001
EOF

echo "✅ .env file created"

# Step 4: Create logs directory
echo ""
echo "📂 Step 4: Creating logs directory..."
mkdir -p logs
chmod 755 logs
echo "✅ Logs directory created"

# Step 5: Set up firewall
echo ""
echo "🔒 Step 5: Configuring firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
    echo "✅ Firewall configured"
else
    echo "⚠️  UFW not found, skipping firewall setup"
fi

# Step 6: Display next steps
echo ""
echo "✅ Setup Complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 NEXT STEPS - IMPORTANT!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1️⃣  Edit the .env file and add your API keys:"
echo "    nano /opt/esim-service/.env"
echo ""
echo "    You need to replace:"
echo "    - SUPABASE_URL"
echo "    - SUPABASE_SERVICE_KEY"
echo "    - STRIPE_SECRET_KEY"
echo "    - STRIPE_WEBHOOK_SECRET"
echo ""
echo "2️⃣  After editing .env, start the services:"
echo "    cd /opt/esim-service"
echo "    docker-compose up -d --build"
echo ""
echo "3️⃣  Check if services are running:"
echo "    docker-compose ps"
echo "    docker-compose logs -f"
echo ""
echo "4️⃣  Test the API:"
echo "    curl http://72.61.87.54/api/health"
echo ""
echo "5️⃣  Access the dashboard:"
echo "    http://72.61.87.54/dashboard"
echo "    Username: admin"
echo "    Password: VWGolf2014Asd))!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📚 For detailed guides, check:"
echo "   - STRIPE_WEBHOOK_SETUP.md (Stripe setup)"
echo "   - QUICK_DEPLOY_GUIDE.md (Complete guide)"
echo "   - SETUP_GUIDE.md (Detailed setup)"
echo ""
echo "🎉 Ready to configure your environment!"
echo ""

