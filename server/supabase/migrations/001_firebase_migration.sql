-- Firebase → Supabase Migration: Create all missing tables
-- Run against: https://eujmomonscnlmwcbkbfy.supabase.co

-- ============================================================
-- USERS (profiles linked to Supabase Auth users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  firebase_uid text UNIQUE,
  email text,
  display_name text,
  role text DEFAULT 'customer' CHECK (role IN ('customer', 'admin', 'superadmin')),
  is_anonymous boolean DEFAULT false,
  email_verified boolean DEFAULT false,
  preferred_language text DEFAULT 'en',
  phone text,
  photo_url text,
  referred_by text,
  referral_code_used boolean DEFAULT false,
  referral_code text,
  referral_balance numeric DEFAULT 0,
  stripe_customer_id text,
  total_purchases integer DEFAULT 0,
  total_spent numeric DEFAULT 0,
  fraud_score integer DEFAULT 0,
  is_blocked boolean DEFAULT false,
  block_reason text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================================
-- USER TRANSACTIONS (subcollection in Firebase: users/{id}/transactions)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  amount numeric NOT NULL,
  description text,
  reference_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_transactions_user ON public.user_transactions(user_id);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.users(id),
  firebase_user_id text,
  plan_id text,
  plan_name text,
  country text,
  country_code text,
  data_amount text,
  validity_days integer,
  price numeric,
  net_price numeric,
  currency text DEFAULT 'USD',
  payment_method text,
  payment_intent_id text,
  stripe_session_id text,
  airalo_order_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
  esim_iccid text,
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- ============================================================
-- ESIMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.esims (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.users(id),
  firebase_user_id text,
  order_id text REFERENCES public.orders(id),
  iccid text,
  airalo_sim_id text,
  plan_name text,
  country text,
  country_code text,
  data_total text,
  data_remaining text,
  status text DEFAULT 'active',
  activation_code text,
  qr_code_url text,
  apn_type text,
  apn_value text,
  is_installed boolean DEFAULT false,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_esims_user ON public.esims(user_id);
CREATE INDEX IF NOT EXISTS idx_esims_iccid ON public.esims(iccid);

-- ============================================================
-- TOPUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.topups (
  id text PRIMARY KEY,
  user_id uuid REFERENCES public.users(id),
  esim_id text REFERENCES public.esims(id),
  order_id text,
  plan_id text,
  data_amount text,
  price numeric,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending',
  airalo_topup_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- CONFIG (app-wide settings)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- APPLICATION LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.application_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text DEFAULT 'info',
  message text,
  source text,
  user_id uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_app_logs_created ON public.application_logs(created_at DESC);

-- ============================================================
-- CONTACT REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.contact_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text NOT NULL,
  subject text,
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- NEWSLETTER SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  source text DEFAULT 'website',
  is_active boolean DEFAULT true,
  unsubscribed_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PROMO CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value numeric NOT NULL,
  max_uses integer,
  current_uses integer DEFAULT 0,
  min_purchase numeric DEFAULT 0,
  applicable_plans text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON public.promo_codes(code);

-- ============================================================
-- REFERRAL CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id),
  code text UNIQUE NOT NULL,
  commission_rate numeric DEFAULT 0.1,
  total_referrals integer DEFAULT 0,
  total_earnings numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- REFERRAL COMMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES public.users(id),
  referred_user_id uuid REFERENCES public.users(id),
  order_id text,
  amount numeric NOT NULL,
  commission_rate numeric,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- JOB APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position text NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  resume_url text,
  cover_letter text,
  linkedin_url text,
  portfolio_url text,
  status text DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'interview', 'accepted', 'rejected')),
  admin_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ============================================================
-- FRAUD DETECTION
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fraud_blocklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('email', 'ip', 'device', 'payment_method', 'user')),
  value text NOT NULL,
  reason text,
  blocked_by uuid,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_blocklist_type_value ON public.fraud_blocklist(type, value);

CREATE TABLE IF NOT EXISTS public.fraud_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  ip_address text,
  action text,
  risk_score integer DEFAULT 0,
  signals jsonb DEFAULT '{}',
  blocked boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_tracking_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  ip_address text,
  device_fingerprint text,
  amount numeric,
  currency text,
  payment_method text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_tracking_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  ip_address text,
  action text,
  success boolean,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  signal_type text,
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  reason text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_blocked_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  amount numeric,
  reason text,
  payment_intent_id text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fraud_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  warning_type text,
  message text,
  is_acknowledged boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- PAYMENT TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_id text,
  amount numeric,
  currency text DEFAULT 'USD',
  payment_method text,
  stripe_payment_intent_id text,
  status text DEFAULT 'pending',
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  order_id text,
  error_code text,
  error_message text,
  payment_method text,
  amount numeric,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- FCM TOKENS (push notifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text CHECK (platform IN ('ios', 'android', 'web')),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user ON public.fcm_tokens(user_id);

-- ============================================================
-- SYNC LOGS (Airalo sync tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type text NOT NULL,
  status text DEFAULT 'running',
  items_processed integer DEFAULT 0,
  items_created integer DEFAULT 0,
  items_updated integer DEFAULT 0,
  items_failed integer DEFAULT 0,
  error_message text,
  metadata jsonb DEFAULT '{}',
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- ============================================================
-- EMAIL LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "to" text NOT NULL,
  subject text,
  template text,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced')),
  message_id text,
  error text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- RLS Policies (basic — tighten later)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esims ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Users can read their own orders
CREATE POLICY "Users read own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own esims
CREATE POLICY "Users read own esims" ON public.esims FOR SELECT USING (auth.uid() = user_id);

-- Service role bypasses RLS (for admin/backend)
-- This is automatic in Supabase when using service_role key

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_esims_updated_at BEFORE UPDATE ON public.esims FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_requests_updated_at BEFORE UPDATE ON public.contact_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
