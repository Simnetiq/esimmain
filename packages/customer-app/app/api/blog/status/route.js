import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

function requireApiKey(request) {
  const apiKey = process.env.BLOG_API_KEY;
  if (!apiKey) return false;

  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  const provided = Buffer.from(auth.slice(7));
  const expected = Buffer.from(apiKey);
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

export async function GET(request) {
  if (!requireApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  try {
    // Post counts
    const { data: posts } = await supabase
      .from('blog_posts')
      .select('id, status');

    const totalPosts = posts?.length || 0;
    const publishedPosts = posts?.filter((p) => p.status === 'published').length || 0;
    const draftPosts = posts?.filter((p) => p.status === 'draft').length || 0;

    // Translation coverage
    const { data: translations } = await supabase
      .from('blog_post_translations')
      .select('language');

    const coverage = {};
    (translations || []).forEach((t) => {
      coverage[t.language] = (coverage[t.language] || 0) + 1;
    });

    // Recent posts
    const { data: recentPosts } = await supabase
      .from('blog_posts')
      .select('base_slug, published_at, blog_post_translations(title, language)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5);

    const recent = (recentPosts || []).map((p) => {
      const enTranslation = p.blog_post_translations?.find((t) => t.language === 'en');
      return {
        slug: p.base_slug,
        title: enTranslation?.title || p.blog_post_translations?.[0]?.title || 'Untitled',
        published_at: p.published_at,
      };
    });

    return NextResponse.json({
      status: 'healthy',
      total_posts: totalPosts,
      published_posts: publishedPosts,
      draft_posts: draftPosts,
      translation_coverage: coverage,
      recent_posts: recent,
    });
  } catch (err) {
    console.error('[blog/status] Error:', err);
    return NextResponse.json(
      { status: 'error', error: err.message },
      { status: 500 }
    );
  }
}
