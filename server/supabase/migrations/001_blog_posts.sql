-- ============================================
-- BLOG POSTS MIGRATION
-- Version: 001
-- Description: Creates blog_posts and blog_post_translations tables
--              for multilingual blog content management
-- ============================================

-- ============================================
-- ENUM TYPES
-- ============================================

-- Post status enum
DO $$ BEGIN
    CREATE TYPE post_status AS ENUM ('draft', 'published', 'archived', 'scheduled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Language code enum (matching existing supported languages)
DO $$ BEGIN
    CREATE TYPE blog_language_code AS ENUM ('en', 'es', 'fr', 'de', 'ar', 'he', 'ru');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- BLOG CATEGORIES TABLE (Optional normalization)
-- ============================================

CREATE TABLE IF NOT EXISTS blog_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    color_class VARCHAR(100) DEFAULT 'bg-gray-100/60 text-gray-800',
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default categories (only if table is empty)
INSERT INTO blog_categories (name, color_class, sort_order)
SELECT * FROM (VALUES
    ('General', 'bg-gray-100/60 text-gray-800', 1),
    ('Technology', 'bg-purple-100/60 text-purple-800', 2),
    ('Travel', 'bg-blue-100/60 text-blue-800', 3),
    ('Business', 'bg-yellow-100/60 text-yellow-800', 4),
    ('Tutorial', 'bg-indigo-100/60 text-indigo-800', 5),
    ('Security', 'bg-red-100/60 text-red-800', 6),
    ('Innovation', 'bg-green-100/60 text-green-800', 7),
    ('Tips', 'bg-teal-100/60 text-teal-800', 8),
    ('News', 'bg-orange-100/60 text-orange-800', 9),
    ('Guide', 'bg-green-100/60 text-green-800', 10)
) AS v(name, color_class, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM blog_categories LIMIT 1);

-- ============================================
-- BLOG POSTS TABLE (Base table)
-- ============================================

CREATE TABLE IF NOT EXISTS blog_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- URL identifier (same for all translations)
    base_slug VARCHAR(255) UNIQUE NOT NULL,

    -- Author info
    author VARCHAR(255),
    author_id UUID, -- Can reference auth.users if needed

    -- Classification
    category VARCHAR(100) NOT NULL DEFAULT 'General',
    tags TEXT[] DEFAULT '{}',

    -- Media
    featured_image TEXT,

    -- Status management
    status post_status NOT NULL DEFAULT 'draft',

    -- Metadata
    read_time VARCHAR(50) DEFAULT '5 min read',
    seo_keywords TEXT[] DEFAULT '{}',

    -- Engagement metrics
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,

    -- Timestamps
    published_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON blog_posts(status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_category ON blog_posts(category);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON blog_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status_published ON blog_posts(status, published_at DESC)
    WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_blog_posts_tags ON blog_posts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_blog_posts_base_slug ON blog_posts(base_slug);

-- ============================================
-- BLOG POST TRANSLATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blog_post_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent reference
    post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,

    -- Language identifier
    language blog_language_code NOT NULL,

    -- Content
    title TEXT NOT NULL,
    slug VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    excerpt TEXT,

    -- SEO
    seo_title VARCHAR(255),
    seo_description TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT blog_post_translations_unique_post_lang UNIQUE (post_id, language),
    CONSTRAINT blog_post_translations_unique_slug UNIQUE (slug)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blog_translations_post_id ON blog_post_translations(post_id);
CREATE INDEX IF NOT EXISTS idx_blog_translations_language ON blog_post_translations(language);
CREATE INDEX IF NOT EXISTS idx_blog_translations_slug ON blog_post_translations(slug);

-- Full-text search index (English configuration, works reasonably for most languages)
CREATE INDEX IF NOT EXISTS idx_blog_translations_search ON blog_post_translations
    USING GIN(to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, '') || ' ' || COALESCE(excerpt, '')));

-- ============================================
-- AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_blog_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON blog_posts;
CREATE TRIGGER update_blog_posts_updated_at
    BEFORE UPDATE ON blog_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_translations_updated_at ON blog_post_translations;
CREATE TRIGGER update_blog_translations_updated_at
    BEFORE UPDATE ON blog_post_translations
    FOR EACH ROW
    EXECUTE FUNCTION update_blog_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_post_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Public can read translations of published posts" ON blog_post_translations;
DROP POLICY IF EXISTS "Public can read categories" ON blog_categories;
DROP POLICY IF EXISTS "Admins can manage posts" ON blog_posts;
DROP POLICY IF EXISTS "Admins can manage translations" ON blog_post_translations;
DROP POLICY IF EXISTS "Admins can manage categories" ON blog_categories;
DROP POLICY IF EXISTS "Service role full access posts" ON blog_posts;
DROP POLICY IF EXISTS "Service role full access translations" ON blog_post_translations;

-- Public read access for published posts
CREATE POLICY "Public can read published posts" ON blog_posts
    FOR SELECT
    USING (status = 'published');

CREATE POLICY "Public can read translations of published posts" ON blog_post_translations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM blog_posts
            WHERE blog_posts.id = blog_post_translations.post_id
            AND blog_posts.status = 'published'
        )
    );

CREATE POLICY "Public can read categories" ON blog_categories
    FOR SELECT
    USING (true);

-- Service role has full access (for server-side admin operations)
CREATE POLICY "Service role full access posts" ON blog_posts
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access translations" ON blog_post_translations
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to increment views (atomic)
CREATE OR REPLACE FUNCTION increment_blog_views(p_post_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE blog_posts
    SET views = views + 1
    WHERE id = p_post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get post with translation (with fallback)
CREATE OR REPLACE FUNCTION get_blog_post_by_slug(
    p_slug VARCHAR(255),
    p_language blog_language_code DEFAULT 'en'
)
RETURNS TABLE (
    id UUID,
    base_slug VARCHAR(255),
    author VARCHAR(255),
    author_id UUID,
    category VARCHAR(100),
    tags TEXT[],
    featured_image TEXT,
    status post_status,
    read_time VARCHAR(50),
    seo_keywords TEXT[],
    views INTEGER,
    likes INTEGER,
    comments INTEGER,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    translation_id UUID,
    language blog_language_code,
    title TEXT,
    slug VARCHAR(255),
    content TEXT,
    excerpt TEXT,
    seo_title VARCHAR(255),
    seo_description TEXT,
    is_fallback BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH found_post AS (
        -- Find the post by any of its translation slugs
        SELECT bp.id as post_id
        FROM blog_posts bp
        JOIN blog_post_translations bpt ON bp.id = bpt.post_id
        WHERE bpt.slug = p_slug AND bp.status = 'published'
        LIMIT 1
    ),
    preferred_translation AS (
        -- Try to get the requested language
        SELECT bpt.*, false as is_fallback
        FROM blog_post_translations bpt
        JOIN found_post fp ON bpt.post_id = fp.post_id
        WHERE bpt.language = p_language
    ),
    english_fallback AS (
        -- Fallback to English
        SELECT bpt.*, true as is_fallback
        FROM blog_post_translations bpt
        JOIN found_post fp ON bpt.post_id = fp.post_id
        WHERE bpt.language = 'en'
        AND NOT EXISTS (SELECT 1 FROM preferred_translation)
    ),
    any_fallback AS (
        -- Fallback to any available
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
        bp.id,
        bp.base_slug,
        bp.author,
        bp.author_id,
        bp.category,
        bp.tags,
        bp.featured_image,
        bp.status,
        bp.read_time,
        bp.seo_keywords,
        bp.views,
        bp.likes,
        bp.comments,
        bp.published_at,
        bp.created_at,
        bp.updated_at,
        ft.id as translation_id,
        ft.language,
        ft.title,
        ft.slug,
        ft.content,
        ft.excerpt,
        ft.seo_title,
        ft.seo_description,
        ft.is_fallback
    FROM blog_posts bp
    JOIN final_translation ft ON bp.id = ft.post_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get published posts with translations
CREATE OR REPLACE FUNCTION get_published_blog_posts(
    p_language blog_language_code DEFAULT 'en',
    p_limit INTEGER DEFAULT 10,
    p_offset INTEGER DEFAULT 0,
    p_category VARCHAR(100) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    base_slug VARCHAR(255),
    author VARCHAR(255),
    category VARCHAR(100),
    tags TEXT[],
    featured_image TEXT,
    views INTEGER,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    title TEXT,
    slug VARCHAR(255),
    excerpt TEXT,
    language blog_language_code,
    is_fallback BOOLEAN,
    available_languages blog_language_code[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bp.id,
        bp.base_slug,
        bp.author,
        bp.category,
        bp.tags,
        bp.featured_image,
        bp.views,
        bp.published_at,
        bp.created_at,
        COALESCE(t_pref.title, t_en.title, t_any.title) as title,
        COALESCE(t_pref.slug, t_en.slug, t_any.slug) as slug,
        COALESCE(t_pref.excerpt, t_en.excerpt, t_any.excerpt) as excerpt,
        COALESCE(t_pref.language, t_en.language, t_any.language) as language,
        (t_pref.id IS NULL) as is_fallback,
        (
            SELECT array_agg(bpt.language ORDER BY bpt.language)::blog_language_code[]
            FROM blog_post_translations bpt
            WHERE bpt.post_id = bp.id
        ) as available_languages
    FROM blog_posts bp
    LEFT JOIN blog_post_translations t_pref ON bp.id = t_pref.post_id AND t_pref.language = p_language
    LEFT JOIN blog_post_translations t_en ON bp.id = t_en.post_id AND t_en.language = 'en' AND t_pref.id IS NULL
    LEFT JOIN LATERAL (
        SELECT * FROM blog_post_translations
        WHERE post_id = bp.id
        ORDER BY language
        LIMIT 1
    ) t_any ON t_pref.id IS NULL AND t_en.id IS NULL
    WHERE bp.status = 'published'
    AND (p_category IS NULL OR bp.category = p_category)
    ORDER BY bp.published_at DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to search blog posts
CREATE OR REPLACE FUNCTION search_blog_posts(
    p_search_term TEXT,
    p_language blog_language_code DEFAULT 'en',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    base_slug VARCHAR(255),
    author VARCHAR(255),
    category VARCHAR(100),
    tags TEXT[],
    featured_image TEXT,
    views INTEGER,
    published_at TIMESTAMPTZ,
    title TEXT,
    slug VARCHAR(255),
    excerpt TEXT,
    language blog_language_code,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT ON (bp.id)
        bp.id,
        bp.base_slug,
        bp.author,
        bp.category,
        bp.tags,
        bp.featured_image,
        bp.views,
        bp.published_at,
        bpt.title,
        bpt.slug,
        bpt.excerpt,
        bpt.language,
        ts_rank(
            to_tsvector('english', COALESCE(bpt.title, '') || ' ' || COALESCE(bpt.content, '') || ' ' || COALESCE(bpt.excerpt, '')),
            plainto_tsquery('english', p_search_term)
        ) as rank
    FROM blog_posts bp
    JOIN blog_post_translations bpt ON bp.id = bpt.post_id
    WHERE bp.status = 'published'
    AND (
        bpt.language = p_language
        OR (NOT EXISTS (
            SELECT 1 FROM blog_post_translations
            WHERE post_id = bp.id AND language = p_language
        ) AND bpt.language = 'en')
    )
    AND (
        to_tsvector('english', COALESCE(bpt.title, '') || ' ' || COALESCE(bpt.content, '') || ' ' || COALESCE(bpt.excerpt, ''))
        @@ plainto_tsquery('english', p_search_term)
        OR bpt.title ILIKE '%' || p_search_term || '%'
        OR bpt.content ILIKE '%' || p_search_term || '%'
        OR p_search_term = ANY(bp.tags)
    )
    ORDER BY bp.id, rank DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get distinct categories
CREATE OR REPLACE FUNCTION get_blog_categories()
RETURNS TABLE (category VARCHAR(100)) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT bp.category
    FROM blog_posts bp
    WHERE bp.status = 'published'
    ORDER BY bp.category;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE blog_posts IS 'Base blog post data shared across all language translations';
COMMENT ON TABLE blog_post_translations IS 'Language-specific content for blog posts';
COMMENT ON TABLE blog_categories IS 'Predefined blog categories with styling';
COMMENT ON FUNCTION get_blog_post_by_slug IS 'Fetches a published blog post by slug with language fallback (requested -> en -> any)';
COMMENT ON FUNCTION get_published_blog_posts IS 'Fetches paginated published posts with language fallback';
COMMENT ON FUNCTION search_blog_posts IS 'Full-text search across blog posts with language preference';
COMMENT ON FUNCTION increment_blog_views IS 'Atomically increments the view count for a blog post';
