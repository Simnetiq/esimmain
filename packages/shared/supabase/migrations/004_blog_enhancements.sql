-- Migration 004: Blog System Enhancements
-- Aligns Simnetiq blog schema with Doppler VPN reference architecture
-- Run date: 2026-02-24
-- Applied to: eujmomonscnlmwcbkbfy

-- ============================================================
-- 1. Add OG metadata and image_alt to blog_post_translations
-- ============================================================
ALTER TABLE blog_post_translations
  ADD COLUMN IF NOT EXISTS og_title varchar(70),
  ADD COLUMN IF NOT EXISTS og_description varchar(200),
  ADD COLUMN IF NOT EXISTS image_alt text;

-- ============================================================
-- 2. Create blog_internal_links (related posts)
-- ============================================================
CREATE TABLE IF NOT EXISTS blog_internal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  target_post_id uuid NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  link_order integer DEFAULT 0,
  CONSTRAINT unique_internal_link UNIQUE (source_post_id, target_post_id),
  CONSTRAINT no_self_link CHECK (source_post_id != target_post_id)
);

CREATE INDEX IF NOT EXISTS idx_internal_links_source ON blog_internal_links(source_post_id);
CREATE INDEX IF NOT EXISTS idx_internal_links_target ON blog_internal_links(target_post_id);

-- RLS
ALTER TABLE blog_internal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read internal links of published posts"
  ON blog_internal_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM blog_posts
      WHERE blog_posts.id = blog_internal_links.source_post_id
      AND blog_posts.status = 'published'
    )
  );

CREATE POLICY "Service role full access for blog_internal_links"
  ON blog_internal_links FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins full access blog_internal_links"
  ON blog_internal_links FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- ============================================================
-- 3. Drop broken unique slug constraint on translations
-- ============================================================
-- All translations share the same base_slug. Uniqueness is enforced
-- on blog_posts.base_slug instead.
ALTER TABLE blog_post_translations
  DROP CONSTRAINT IF EXISTS blog_post_translations_unique_slug;

-- ============================================================
-- 4. Update get_blog_post_by_slug to return available_languages
-- ============================================================
DROP FUNCTION IF EXISTS public.get_blog_post_by_slug(character varying, blog_language_code);

CREATE OR REPLACE FUNCTION public.get_blog_post_by_slug(
  p_slug character varying,
  p_language blog_language_code DEFAULT 'en'::blog_language_code
)
RETURNS TABLE(
  id uuid, base_slug character varying, author character varying, author_id uuid,
  category character varying, tags text[], featured_image text, status post_status,
  read_time character varying, seo_keywords text[], views integer, likes integer,
  comments integer, published_at timestamp with time zone, created_at timestamp with time zone,
  updated_at timestamp with time zone, translation_id uuid, language blog_language_code,
  title text, slug character varying, content text, excerpt text,
  seo_title character varying, seo_description text, is_fallback boolean,
  available_languages blog_language_code[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    WITH found_post AS (
        SELECT bp.id as post_id
        FROM blog_posts bp
        JOIN blog_post_translations bpt ON bp.id = bpt.post_id
        WHERE bpt.slug = p_slug AND bp.status = 'published'
        LIMIT 1
    ),
    preferred_translation AS (
        SELECT bpt.*, false as is_fallback
        FROM blog_post_translations bpt
        JOIN found_post fp ON bpt.post_id = fp.post_id
        WHERE bpt.language = p_language
    ),
    english_fallback AS (
        SELECT bpt.*, true as is_fallback
        FROM blog_post_translations bpt
        JOIN found_post fp ON bpt.post_id = fp.post_id
        WHERE bpt.language = 'en'
        AND NOT EXISTS (SELECT 1 FROM preferred_translation)
    ),
    any_fallback AS (
        SELECT bpt.*, true as is_fallback
        FROM blog_post_translations bpt
        JOIN found_post fp ON bpt.post_id = fp.post_id
        WHERE NOT EXISTS (SELECT 1 FROM preferred_translation)
        AND NOT EXISTS (SELECT 1 FROM english_fallback)
        ORDER BY bpt.language
        LIMIT 1
    ),
    final_translation AS (
        SELECT * FROM preferred_translation
        UNION ALL
        SELECT * FROM english_fallback
        UNION ALL
        SELECT * FROM any_fallback
        LIMIT 1
    )
    SELECT
        bp.id, bp.base_slug, bp.author, bp.author_id,
        bp.category, bp.tags, bp.featured_image, bp.status,
        bp.read_time, bp.seo_keywords, bp.views, bp.likes,
        bp.comments, bp.published_at, bp.created_at, bp.updated_at,
        ft.id as translation_id, ft.language, ft.title, ft.slug,
        ft.content, ft.excerpt, ft.seo_title, ft.seo_description,
        ft.is_fallback,
        (
            SELECT array_agg(bpt.language ORDER BY bpt.language)::blog_language_code[]
            FROM blog_post_translations bpt
            WHERE bpt.post_id = bp.id
        ) as available_languages
    FROM blog_posts bp
    JOIN final_translation ft ON bp.id = ft.post_id;
END;
$function$;
