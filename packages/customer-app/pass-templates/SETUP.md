# Apple Wallet Pass Setup Guide

This guide explains how to configure Apple Wallet pass generation for FoundMiles events.

## Prerequisites

1. Apple Developer account with access to Certificates, Identifiers & Profiles
2. Pass Type ID created in Apple Developer Portal
3. Pass signing certificate exported from Keychain

## Step 1: Create Pass Type ID

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/passTypeId)
2. Click "+" to create a new identifier
3. Select "Pass Type IDs"
4. Enter description: `FoundMiles Event Pass`
5. Enter identifier: `pass.com.foundmiles.event`
6. Click Continue and Register

## Step 2: Create Pass Signing Certificate

1. Go to [Certificates](https://developer.apple.com/account/resources/certificates/list)
2. Click "+" to create a new certificate
3. Select "Pass Type ID Certificate"
4. Select your Pass Type ID (`pass.com.foundmiles.event`)
5. Follow the CSR (Certificate Signing Request) instructions
6. Download the certificate (.cer file)
7. Double-click to install in Keychain Access

## Step 3: Export Certificate for Server

```bash
# 1. Open Keychain Access
# 2. Find the "Pass Type ID: pass.com.foundmiles.event" certificate
# 3. Right-click > Export > Save as .p12 file

# 4. Convert .p12 to PEM files
openssl pkcs12 -in pass-certificate.p12 -clcerts -nokeys -out pass-cert.pem
openssl pkcs12 -in pass-certificate.p12 -nocerts -nodes -out pass-key.pem

# 5. Download Apple WWDR certificate
curl -O https://www.apple.com/certificateauthority/AppleWWDRCAG4.cer

# 6. Convert WWDR to PEM
openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem
```

## Step 4: Set Up Certificate Files

Create a `certs/` directory in the project root and add:

```
certs/
├── wwdr.pem         # Apple WWDR certificate
├── pass-cert.pem    # Your Pass Type ID certificate
└── pass-key.pem     # Private key for the certificate
```

**Security Note:** Never commit these files to git. Add `certs/` to your `.gitignore`.

## Step 5: Add Pass Template Images

Add the following images to `pass-templates/event/`:

| File | Size | Required |
|------|------|----------|
| `icon.png` | 29x29 | Yes |
| `icon@2x.png` | 58x58 | Yes |
| `icon@3x.png` | 87x87 | No |
| `logo.png` | 160x50 | No |
| `logo@2x.png` | 320x100 | No |
| `strip.png` | 312x123 | No |
| `strip@2x.png` | 624x246 | No |

## Step 6: Configure Environment Variables

Add the following to your `.env.local`:

```bash
# Supabase Server Configuration (required for auth)
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_KEY=your-service-role-key

# Apple Wallet Pass Configuration
APPLE_TEAM_ID=YOUR_APPLE_TEAM_ID
PASS_TYPE_IDENTIFIER=pass.com.foundmiles.event
PASS_KEY_PASSWORD=your_p12_export_password

# Optional: Custom paths (defaults shown)
# PASS_CERTS_PATH=/path/to/certs
# PASS_TEMPLATE_PATH=/path/to/pass-templates/event
```

### Finding Your Team ID

1. Go to [Apple Developer Account](https://developer.apple.com/account)
2. Your Team ID is shown in the top right or in Membership Details
3. It's a 10-character alphanumeric string (e.g., `A1B2C3D4E5`)

## Step 7: Test the Configuration

Run your development server and test the endpoint:

```bash
# Get a Supabase access token from your mobile app or web console
# You can get this from supabase.auth.getSession() -> session.access_token
# Then test the endpoint:

curl -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  http://localhost:3000/api/passes/event/EVENT_ID \
  -o test-pass.pkpass

# Rename to .zip and extract to inspect contents:
unzip test-pass.pkpass -d test-pass/
```

## Troubleshooting

### "Pass configuration not valid"
- Ensure all certificate files exist in the `certs/` directory
- Check that `icon.png` and `icon@2x.png` exist in the template directory
- Verify environment variables are set correctly

### "Certificate error"
- The certificate may be expired - check dates in Keychain Access
- Ensure the certificate matches the Pass Type ID
- Verify the WWDR certificate is the correct version (G4)

### "Pass doesn't appear in Wallet"
- iOS Simulator doesn't support Wallet - test on a real device
- Check that the pass JSON is valid (extract .pkpass as .zip)
- Ensure `passTypeIdentifier` matches your registered ID exactly

## Production Deployment

For production (Vercel, etc.):

1. Store certificate files as base64-encoded secrets
2. Decode and write files at build/runtime
3. Or use a secrets manager like AWS Secrets Manager

Example for Vercel:

```bash
# Encode certificates as base64
base64 -i certs/wwdr.pem | pbcopy  # Copy to clipboard
# Paste into PASS_WWDR_CERT_BASE64 secret

# In your code, decode at runtime:
# Buffer.from(process.env.PASS_WWDR_CERT_BASE64, 'base64')
```

## Resources

- [Apple Wallet Developer Guide](https://developer.apple.com/documentation/walletpasses)
- [PassKit Package Format Reference](https://developer.apple.com/library/archive/documentation/UserExperience/Reference/PassKit_Bundle/Chapters/Introduction.html)
- [passkit-generator Documentation](https://github.com/alexandercerutti/passkit-generator)
