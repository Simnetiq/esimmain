-- =============================================================================
-- Migration: RLS Hardening — All Tables
-- Date: 2026-03-17
-- Project: Simnetiq (eujmomonscnlmwcbkbfy)
-- Purpose: Enable RLS + define correct policies on every public table.
--          Safe to run multiple times (idempotent via DROP IF EXISTS guards).
-- =============================================================================
-- Access model summary:
--   anon / authenticated  → public catalog tables: SELECT only
--   authenticated (JWT)   → user-scoped tables: SELECT/INSERT/DELETE own rows only
--   service_role          → all tables, all operations (bypasses RLS)
-- =============================================================================


-- =============================================================================
-- HELPER: is_admin() function (used by several policies)
-- Creates it only if it doesn't exist yet; safe to run repeatedly.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;


-- =============================================================================
-- 1. users
--    - RLS on
--    - SELECT / UPDATE own row only (auth.uid() = id)
--    - No client INSERT (created by handle_new_user trigger)
--    - No client DELETE
-- =============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users: select own row"       ON public.users;
DROP POLICY IF EXISTS "Users: update own row"       ON public.users;
DROP POLICY IF EXISTS "Users: service role access"  ON public.users;
DROP POLICY IF EXISTS "Users: admin access"         ON public.users;

CREATE POLICY "Users: select own row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users: update own row"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role bypasses RLS automatically in Supabase, but an explicit policy
-- is added for clarity and defence-in-depth.
CREATE POLICY "Users: service role full access"
  ON public.users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 2. orders
--    - RLS on
--    - SELECT own rows only
--    - No client INSERT / UPDATE / DELETE (all mutations via service role / webhook)
-- =============================================================================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Orders: select own rows"          ON public.orders;
DROP POLICY IF EXISTS "Orders: service role full access" ON public.orders;

CREATE POLICY "Orders: select own rows"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Orders: service role full access"
  ON public.orders FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 3. user_esims
--    - RLS on
--    - SELECT own rows only
--    - No client INSERT / UPDATE / DELETE (eSIM created by webhook via service role)
-- =============================================================================
ALTER TABLE public.user_esims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "UserEsims: select own rows"          ON public.user_esims;
DROP POLICY IF EXISTS "UserEsims: service role full access" ON public.user_esims;

CREATE POLICY "UserEsims: select own rows"
  ON public.user_esims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "UserEsims: service role full access"
  ON public.user_esims FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 4. esim_topups
--    - RLS on
--    - SELECT own rows only
--    - No client INSERT / UPDATE / DELETE (created + updated by API routes)
-- =============================================================================
ALTER TABLE public.esim_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "EsimTopups: select own rows"          ON public.esim_topups;
DROP POLICY IF EXISTS "EsimTopups: service role full access" ON public.esim_topups;

CREATE POLICY "EsimTopups: select own rows"
  ON public.esim_topups FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "EsimTopups: service role full access"
  ON public.esim_topups FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 5. fcm_tokens
--    - RLS on
--    - Authenticated users can SELECT / INSERT / DELETE their own tokens
--      (push token registration is done from the client via anon+JWT)
--    - No UPDATE via client (use DELETE + INSERT to rotate tokens)
--    - Service role has full access (for /api/fcm-tokens admin GET route)
-- Note: the existing /api/fcm-tokens POST route uses service role — that
--       continues to work. This policy also allows the iOS client to manage
--       tokens directly via the Supabase anon key + JWT if the API route is
--       not used.
-- =============================================================================
ALTER TABLE public.fcm_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "FcmTokens: select own rows"          ON public.fcm_tokens;
DROP POLICY IF EXISTS "FcmTokens: insert own rows"          ON public.fcm_tokens;
DROP POLICY IF EXISTS "FcmTokens: delete own rows"          ON public.fcm_tokens;
DROP POLICY IF EXISTS "FcmTokens: service role full access" ON public.fcm_tokens;

CREATE POLICY "FcmTokens: select own rows"
  ON public.fcm_tokens FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "FcmTokens: insert own rows"
  ON public.fcm_tokens FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "FcmTokens: delete own rows"
  ON public.fcm_tokens FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "FcmTokens: service role full access"
  ON public.fcm_tokens FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 6. dataplans  — public catalog, read-only for anon/authenticated
-- =============================================================================
ALTER TABLE public.dataplans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Dataplans: public read"               ON public.dataplans;
DROP POLICY IF EXISTS "Dataplans: service role full access"  ON public.dataplans;

CREATE POLICY "Dataplans: public read"
  ON public.dataplans FOR SELECT
  USING (true);

CREATE POLICY "Dataplans: service role full access"
  ON public.dataplans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 7. countries  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Countries: public read"              ON public.countries;
DROP POLICY IF EXISTS "Countries: service role full access" ON public.countries;

CREATE POLICY "Countries: public read"
  ON public.countries FOR SELECT
  USING (true);

CREATE POLICY "Countries: service role full access"
  ON public.countries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 8. regions  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Regions: public read"              ON public.regions;
DROP POLICY IF EXISTS "Regions: service role full access" ON public.regions;

CREATE POLICY "Regions: public read"
  ON public.regions FOR SELECT
  USING (true);

CREATE POLICY "Regions: service role full access"
  ON public.regions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 9. plan_topups  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.plan_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PlanTopups: public read"              ON public.plan_topups;
DROP POLICY IF EXISTS "PlanTopups: service role full access" ON public.plan_topups;

CREATE POLICY "PlanTopups: public read"
  ON public.plan_topups FOR SELECT
  USING (true);

CREATE POLICY "PlanTopups: service role full access"
  ON public.plan_topups FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 10. regional_plans  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.regional_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RegionalPlans: public read"              ON public.regional_plans;
DROP POLICY IF EXISTS "RegionalPlans: service role full access" ON public.regional_plans;

CREATE POLICY "RegionalPlans: public read"
  ON public.regional_plans FOR SELECT
  USING (true);

CREATE POLICY "RegionalPlans: service role full access"
  ON public.regional_plans FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 11. regional_plan_countries  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.regional_plan_countries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RegionalPlanCountries: public read"              ON public.regional_plan_countries;
DROP POLICY IF EXISTS "RegionalPlanCountries: service role full access" ON public.regional_plan_countries;

CREATE POLICY "RegionalPlanCountries: public read"
  ON public.regional_plan_countries FOR SELECT
  USING (true);

CREATE POLICY "RegionalPlanCountries: service role full access"
  ON public.regional_plan_countries FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 12. plan_translations  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.plan_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PlanTranslations: public read"              ON public.plan_translations;
DROP POLICY IF EXISTS "PlanTranslations: service role full access" ON public.plan_translations;

CREATE POLICY "PlanTranslations: public read"
  ON public.plan_translations FOR SELECT
  USING (true);

CREATE POLICY "PlanTranslations: service role full access"
  ON public.plan_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 13. country_translations  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.country_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "CountryTranslations: public read"              ON public.country_translations;
DROP POLICY IF EXISTS "CountryTranslations: service role full access" ON public.country_translations;

CREATE POLICY "CountryTranslations: public read"
  ON public.country_translations FOR SELECT
  USING (true);

CREATE POLICY "CountryTranslations: service role full access"
  ON public.country_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 14. region_translations  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.region_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RegionTranslations: public read"              ON public.region_translations;
DROP POLICY IF EXISTS "RegionTranslations: service role full access" ON public.region_translations;

CREATE POLICY "RegionTranslations: public read"
  ON public.region_translations FOR SELECT
  USING (true);

CREATE POLICY "RegionTranslations: service role full access"
  ON public.region_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 15. regional_plan_translations  — public catalog, read-only
-- =============================================================================
ALTER TABLE public.regional_plan_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RegionalPlanTranslations: public read"              ON public.regional_plan_translations;
DROP POLICY IF EXISTS "RegionalPlanTranslations: service role full access" ON public.regional_plan_translations;

CREATE POLICY "RegionalPlanTranslations: public read"
  ON public.regional_plan_translations FOR SELECT
  USING (true);

CREATE POLICY "RegionalPlanTranslations: service role full access"
  ON public.regional_plan_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 16. promo_codes  — SENSITIVE: service role only, no client access
--    /api/promo/validate uses supabaseAdmin (service role key)
--    anon and authenticated roles must never be able to enumerate codes
-- =============================================================================
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "PromoCodes: service role only"       ON public.promo_codes;
-- Drop any previously permissive policies that might exist
DROP POLICY IF EXISTS "PromoCodes: public read"             ON public.promo_codes;
DROP POLICY IF EXISTS "PromoCodes: authenticated read"      ON public.promo_codes;

CREATE POLICY "PromoCodes: service role only"
  ON public.promo_codes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 17. translation_jobs  — INTERNAL: service role only
-- =============================================================================
ALTER TABLE public.translation_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "TranslationJobs: service role only"  ON public.translation_jobs;
DROP POLICY IF EXISTS "TranslationJobs: public read"        ON public.translation_jobs;

CREATE POLICY "TranslationJobs: service role only"
  ON public.translation_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- =============================================================================
-- 18. blog_posts  — SELECT published posts for anon/authenticated
--                   All writes via service role only
-- =============================================================================
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "BlogPosts: public read published"    ON public.blog_posts;
DROP POLICY IF EXISTS "BlogPosts: service role full access" ON public.blog_posts;
DROP POLICY IF EXISTS "BlogPosts: admin full access"        ON public.blog_posts;

CREATE POLICY "BlogPosts: public read published"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

CREATE POLICY "BlogPosts: service role full access"
  ON public.blog_posts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "BlogPosts: admin full access"
  ON public.blog_posts FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- =============================================================================
-- 19. blog_post_translations  — SELECT translations of published posts only
--                               All writes via service role only
-- =============================================================================
ALTER TABLE public.blog_post_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "BlogPostTranslations: public read published"    ON public.blog_post_translations;
DROP POLICY IF EXISTS "BlogPostTranslations: service role full access" ON public.blog_post_translations;
DROP POLICY IF EXISTS "BlogPostTranslations: admin full access"        ON public.blog_post_translations;

CREATE POLICY "BlogPostTranslations: public read published"
  ON public.blog_post_translations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.blog_posts
      WHERE blog_posts.id = blog_post_translations.post_id
        AND blog_posts.status = 'published'
    )
  );

CREATE POLICY "BlogPostTranslations: service role full access"
  ON public.blog_post_translations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "BlogPostTranslations: admin full access"
  ON public.blog_post_translations FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());


-- =============================================================================
-- REVOKE explicit anon/authenticated grants on sensitive tables
-- Supabase grants SELECT on all tables to anon by default in the public schema.
-- Revoking here ensures RLS is the only guard even if Supabase defaults change.
-- =============================================================================
REVOKE INSERT, UPDATE, DELETE ON public.users                    FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.orders                   FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_esims               FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.esim_topups              FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.dataplans                FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.countries                FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.regions                  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.plan_topups              FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.regional_plans           FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.regional_plan_countries  FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.plan_translations        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.country_translations     FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.region_translations      FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.regional_plan_translations FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.blog_posts               FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.blog_post_translations   FROM anon, authenticated;
REVOKE ALL                    ON public.promo_codes              FROM anon, authenticated;
REVOKE ALL                    ON public.translation_jobs         FROM anon, authenticated;


-- =============================================================================
-- Verification queries (run manually to confirm)
-- =============================================================================
-- SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY tablename;
--
-- SELECT schemaname, tablename, policyname, roles, cmd, qual
--   FROM pg_policies
--   WHERE schemaname = 'public'
--   ORDER BY tablename, policyname;
