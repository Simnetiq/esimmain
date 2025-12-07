#!/bin/bash

# Fix the stuck order kargi-mobile-7days-1gb

echo "🔧 Fixing order: kargi-mobile-7days-1gb"

curl -X POST https://www.simnetiq.store/api/retry-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "kargi-mobile-7days-1gb",
    "adminKey": "simnetiq-fix-2024"
  }'

echo ""
echo "✅ Done! Check your dashboard now."
