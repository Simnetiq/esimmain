#!/bin/bash

# Firebase Functions Setup Script
# This script helps you set up Firebase Functions for Stripe webhooks

set -e  # Exit on error

echo "🚀 Firebase Functions Setup for Stripe Webhooks"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI not found${NC}"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

echo -e "${GREEN}✅ Firebase CLI found${NC}"
echo ""

# Navigate to functions directory
cd "$(dirname "$0")/functions"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

# Go back to root
cd ..

# Check if logged in to Firebase
echo -e "${BLUE}🔐 Checking Firebase authentication...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Firebase${NC}"
    echo "Logging in..."
    firebase login
fi

echo -e "${GREEN}✅ Authenticated with Firebase${NC}"
echo ""

# List projects
echo -e "${BLUE}📋 Available Firebase projects:${NC}"
firebase projects:list

echo ""
echo -e "${YELLOW}⚙️  Configuration needed:${NC}"
echo ""
echo "Run these commands to configure your Stripe keys:"
echo ""
echo -e "${BLUE}firebase functions:config:set \\"
echo "  stripe.secret_key_test=\"sk_test_YOUR_TEST_KEY\" \\"
echo "  stripe.webhook_secret=\"whsec_YOUR_WEBHOOK_SECRET\" \\"
echo "  stripe.mode=\"test\"${NC}"
echo ""
echo "Then deploy with:"
echo -e "${BLUE}firebase deploy --only functions:stripeWebhook${NC}"
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📖 For detailed instructions, see FIREBASE_SETUP_COMMANDS.md"

