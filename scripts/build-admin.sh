#!/bin/sh
cd ../..
npm run build:admin
mkdir -p packages/admin-app/.next/export
echo '<!DOCTYPE html><html><body>Not Found</body></html>' > packages/admin-app/.next/export/404.html
echo '{"version":1,"success":true,"outDirectory":".next"}' > packages/admin-app/.next/export-detail.json
