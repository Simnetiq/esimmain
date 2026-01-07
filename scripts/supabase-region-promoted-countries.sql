-- Migration: Create region_promoted_countries table
-- Purpose: Allow admins to select up to 16 promoted countries per region with explicit ordering
-- Run this migration in Supabase SQL Editor

-- Create the region_promoted_countries table
CREATE TABLE IF NOT EXISTS public.region_promoted_countries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  region_id text NOT NULL,
  country_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT region_promoted_countries_pkey PRIMARY KEY (id),
  CONSTRAINT region_promoted_countries_region_id_fkey
    FOREIGN KEY (region_id) REFERENCES public.regions(id) ON DELETE CASCADE,
  CONSTRAINT region_promoted_countries_country_id_fkey
    FOREIGN KEY (country_id) REFERENCES public.countries(id) ON DELETE CASCADE,
  CONSTRAINT region_promoted_countries_unique
    UNIQUE (region_id, country_id),
  CONSTRAINT region_promoted_countries_position_check
    CHECK (position >= 0 AND position < 16)
) TABLESPACE pg_default;

-- Create index for fast lookups by region
CREATE INDEX IF NOT EXISTS idx_region_promoted_countries_region
  ON public.region_promoted_countries(region_id, position);

-- Create index for active promoted countries
CREATE INDEX IF NOT EXISTS idx_region_promoted_countries_active
  ON public.region_promoted_countries(is_active, region_id);

-- Add updated_at trigger
CREATE TRIGGER trg_update_region_promoted_countries_updated_at
  BEFORE UPDATE ON public.region_promoted_countries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.region_promoted_countries ENABLE ROW LEVEL SECURITY;

-- Allow public read access for active promoted countries
CREATE POLICY "Allow public read access"
  ON public.region_promoted_countries
  FOR SELECT
  USING (is_active = true);

-- Allow authenticated users (admins) full access
CREATE POLICY "Allow admin full access"
  ON public.region_promoted_countries
  FOR ALL
  USING (auth.role() = 'authenticated');

-- Add comment for documentation
COMMENT ON TABLE public.region_promoted_countries IS
  'Admin-controlled promoted countries per region. Max 16 countries per region with explicit position ordering.';

COMMENT ON COLUMN public.region_promoted_countries.position IS
  'Display order (0-15). Lower numbers appear first.';

-- Seed initial data for popular region (optional - remove if you want to start empty)
-- INSERT INTO public.region_promoted_countries (region_id, country_id, position) VALUES
-- ('popular', 'us', 0),
-- ('popular', 'es', 1),
-- ('popular', 'fr', 2),
-- ('popular', 'it', 3),
-- ('popular', 'gb', 4),
-- ('popular', 'de', 5),
-- ('popular', 'jp', 6),
-- ('popular', 'th', 7)
-- ON CONFLICT (region_id, country_id) DO NOTHING;
