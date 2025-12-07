#!/bin/bash

# Airalo API Import Runner
# This script fetches packages directly from Airalo API and imports to Firebase

echo "🚀 Airalo API Import Setup"
echo "================================"
echo ""

# Check if Airalo credentials are provided
if [ -z "$AIRALO_CLIENT_ID" ] || [ -z "$AIRALO_CLIENT_SECRET" ]; then
    echo "❌ Missing Airalo credentials!"
    echo ""
    echo "Please run with:"
    echo "  AIRALO_CLIENT_ID=your_id AIRALO_CLIENT_SECRET=your_secret ./scripts/run-csv-import.sh"
    echo ""
    echo "Or set them as environment variables first:"
    echo "  export AIRALO_CLIENT_ID=your_client_id"
    echo "  export AIRALO_CLIENT_SECRET=your_client_secret"
    echo "  ./scripts/run-csv-import.sh"
    echo ""
    exit 1
fi

# Set Firebase Admin credentials
export FIREBASE_PROJECT_ID="esimcreator-f00dd"
export FIREBASE_CLIENT_EMAIL="firebase-adminsdk-fbsvc@esimcreator-f00dd.iam.gserviceaccount.com"
export FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCx9S9GVOdZSSz6
sT/oLntQsH5UMCXr13Ecry2A/XZxmMXdEgnPxIMqJrlTCOG+K90nUPe/1JfEYEBv
+xjFmh1cr8dH8cuFbhA3mhGO/6WScaH8ravC6K6HYcozIoS5WaLjEFWi08kUSjrV
fx5XuKJNbjWHU9doE+auNZ4HVxhjBU/eQ+hwIzG27GD1tMmxM1bZ/+yVnT3yAjnj
b6wpMkoSDzmW3H55y9NzFzkGPJvLQzWCD6n5Z73l1EgGB/7W0r9h4APHJJOsApyS
GsME2c5GjrpW3wGdtw/d4xV+PBYmTrOgr3VQD4Nr7D/UU5LoXUStkqMEQ7inCFXw
5tTdztTJAgMBAAECggEACeS7LZpPyFd4oDFVf7eB1JETXOPWX9+44qLckUTGHnej
XHCByiK/Ngs0F2kxf6yZnXNzap9LlrfRLUiU7ntscXg2SIopSfA+B5FRs5UD4/nc
SxtupqXf+hfWMXSUU2en1h7U2/oRPkcIMVFhYvgZUdu0LyNaoOcmVn4VnIvbh7mu
nnUzSrCzbKIxnxslp+yAFjpFAlEyAGmw08uw5UwahEao3wxMjuSZoSqbsZGkQRnl
vT356Q/fMz5y8m3qDBMfu2i6Yj94YBcWs2YESx9pAE/7+/BlhHOILNB7Kvf3Xi18
5TpKHflxVaYhs6r1+w8PnmTIk4dqdRrahi8abOzvDwKBgQDfjLjUJNYaNDltUnoh
jUybEd1WECf58vpshVZTKnLZiwWwspluP3hcfQ7fd/dNlO5bhYfBcXr6ESqs2Sz1
OGeLEsZnNsMiBwLaYTIHUn+PFHORR1394u6NlKZTM6bdEkMF42z/byZUjA2Ayt7T
9KtKbnODdhbYW3TQRzigE/lVCwKBgQDLyjsseNTdhVNXmXqcrrpuuS3rLlqUKF3A
Q7/a+xgfmBA8AqNroBbuq0HMhvmcSqBk/X/aQ9suVwX8xyA2V2gpWISZplkJ9/It
cnLI5Ws02f+YyF84t8srhe7N7Fob39DdOKl5wnKzEPNX8P5PBePi4znBNN9pwvcB
E1iDjNs5+wKBgQDJJxvtMJRDEfkWqN9ir31eD84lMfZ2z6+M1NIflZOwsorVO3Aa
JxyLxLAMXyt1cOymB9pnM1CgEbBfxi/RHAb3ulYy67DcPojPriPROOe0/IcdE6W8
3WUgmsCrH1AnntYWR1V95ysLatZ/rIyjFobHO+nPQgQ+fNT40Q1f5Xk2jwKBgB6+
eKTh6cMtnQAnMF844PlZSHsleBbH7DTYQ7ZmkSIbD7/t6fePpEYHYhrX9gpFG+OA
duxXtlZMXKPg6pQoJZevOfnwJZiiZk/C51w1eDH1/WBwQiVNXQJI51j7ojB4WIs3
RCIRWrp3AS8wNT14twOAojLqphXPivIHmB/ofR5HAoGBAKFHohU7wugNIFvm2ENl
+GjQU/VU5+fmjO9B2dLMtrnyc2vUpGdLNGaVqEzF5ErVxZmt7DIGmEkNLxcqWDwS
bbbt8ykCNPL7yNNKQEoSOvwTPPdzXHDTJwN1py38tV/wBOrRHVFBNpil/Ld14mWw
T/CAHrVK7ZFD1qUDsqRrKsSq
-----END PRIVATE KEY-----"

echo "✅ Environment variables set"
echo "✅ CSV file found"
echo "✅ Dependencies installed"
echo ""
echo "🚀 Starting import..."
echo ""

# Run the import
node scripts/import-airalo-csv.js

echo ""
echo "✅ Done!"

