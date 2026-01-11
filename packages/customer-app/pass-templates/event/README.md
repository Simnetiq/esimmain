# Event Pass Template

This directory contains the Apple Wallet pass template for FoundMiles event passes.

## Required Images

Add the following PNG images to this directory:

| File | Size | Purpose |
|------|------|---------|
| `icon.png` | 29x29 | Notification icon |
| `icon@2x.png` | 58x58 | Notification icon (retina) |
| `icon@3x.png` | 87x87 | Notification icon (3x) |
| `logo.png` | 160x50 | Top-left logo |
| `logo@2x.png` | 320x100 | Top-left logo (retina) |
| `strip.png` | 312x123 | Background strip (optional) |
| `strip@2x.png` | 624x246 | Background strip (retina, optional) |
| `thumbnail.png` | 90x90 | Event ticket thumbnail (optional) |
| `thumbnail@2x.png` | 180x180 | Thumbnail (retina, optional) |

## Certificates

The following certificate files are required in the `certs/` directory at the project root:

- `wwdr.pem` - Apple Worldwide Developer Relations (WWDR) certificate
- `pass-cert.pem` - Your Pass Type ID certificate
- `pass-key.pem` - Private key for the certificate

## Setup Instructions

1. Create the images listed above with your FoundMiles branding
2. Download the Apple WWDR certificate from https://www.apple.com/certificateauthority/
3. Export your Pass Type ID certificate from Apple Developer Portal
4. Set the required environment variables (see .env.example)
