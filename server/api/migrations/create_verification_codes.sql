-- Migration: Create verification_codes table for Doppler VPN contact verification
-- Date: 2026-03-03

-- Create verification_codes table
CREATE TABLE verification_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id text NOT NULL REFERENCES accounts(account_id),
  method text NOT NULL CHECK (method IN ('email', 'telegram')),
  contact_value text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  verified_at timestamptz,
  attempts int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Index for lookups by account
CREATE INDEX idx_verification_codes_account ON verification_codes(account_id);

-- Partial index for active (unverified) code lookups
CREATE INDEX idx_verification_codes_lookup ON verification_codes(account_id, code) WHERE verified_at IS NULL;

-- Add contact_verified column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS contact_verified boolean DEFAULT false;

-- Add contact_method and contact_value columns to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS contact_method text;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS contact_value text;
