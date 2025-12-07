#!/bin/bash

echo "🧹 Cleaning Next.js cache and rebuilding..."

# Navigate to customer-app directory
cd "$(dirname "$0")"

# Remove Next.js cache
rm -rf .next

# Remove node_modules/.cache if it exists
rm -rf node_modules/.cache

# Clear npm cache (optional but helps)
npm cache clean --force 2>/dev/null || true

echo "✅ Cache cleared!"
echo "🔄 Please restart your dev server with: npm run dev"


