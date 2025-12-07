#!/bin/bash

# API Testing Script
# Tests all API endpoints

set -e

API_URL="${1:-http://localhost}"

echo "🧪 Testing eSIM Service API"
echo "API URL: $API_URL"
echo "================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

test_endpoint() {
    local name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -n "Testing $name... "
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $http_code)"
        echo "  Response: $body" | head -c 100
        echo ""
    else
        echo -e "${RED}✗ FAIL${NC} (HTTP $http_code)"
        echo "  Response: $body"
        echo ""
    fi
}

# Test health endpoints
echo "=== Health Checks ==="
test_endpoint "Root Health" "GET" "/health"
test_endpoint "API Health" "GET" "/api/health"
echo ""

# Test payment endpoints
echo "=== Payment Endpoints ==="
test_endpoint "Create Stripe Payment" "POST" "/api/payment/stripe/create" \
    '{"amount": 29.99, "currency": "USD", "metadata": {"test": true}}'
echo ""

# Test OTP endpoints (will fail without valid phone)
echo "=== OTP Endpoints ==="
echo -e "${YELLOW}Note: OTP tests may fail without valid Twilio credentials${NC}"
test_endpoint "Send OTP" "POST" "/api/otp/send" \
    '{"phoneNumber": "+1234567890", "purpose": "test"}'
echo ""

# Test email endpoints
echo "=== Email Endpoints ==="
echo -e "${YELLOW}Note: Email tests may fail without valid SMTP credentials${NC}"
test_endpoint "Send Email" "POST" "/api/email/send" \
    '{"to": "test@example.com", "subject": "Test", "html": "<h1>Test</h1>", "text": "Test"}'
echo ""

# Test transaction endpoints
echo "=== Transaction Endpoints ==="
test_endpoint "Get Transactions" "GET" "/api/transactions"
echo ""

echo "================================"
echo "Testing complete!"
echo ""
echo "For more detailed testing:"
echo "  - Check dashboard: $API_URL/dashboard"
echo "  - View logs: docker-compose logs -f"
echo "  - Check Supabase for transaction logs"

