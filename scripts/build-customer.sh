#!/bin/sh
cd ../..
npm run build:customer
mkdir -p packages/customer-app/.next/export
echo '<!DOCTYPE html><html><body>Not Found</body></html>' > packages/customer-app/.next/export/404.html
echo '{"version":1,"success":true,"outDirectory":".next"}' > packages/customer-app/.next/export-detail.json
