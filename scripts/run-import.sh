#!/bin/bash

# Simple import runner that loads env from .env.local

echo "🚀 Starting Airalo CSV Import..."
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found in root directory!"
    exit 1
fi

# Load environment variables from .env.local
set -a
source .env.local
set +a

echo "✅ Environment variables loaded from .env.local"
echo "🚀 Running import script..."
echo ""

# Run the import
node scripts/import-airalo-csv.js














