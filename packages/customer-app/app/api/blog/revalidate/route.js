import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { revalidatePath } from 'next/cache';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'de', 'ar', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'uk', 'zh'];

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

export async function POST(request) {
  if (!requireApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { slug, languages } = body;
  const targetLangs = languages?.filter((l) => SUPPORTED_LANGUAGES.includes(l)) || SUPPORTED_LANGUAGES;

  const revalidated = [];

  try {
    // Always revalidate blog list pages
    revalidatePath('/blog');
    revalidated.push('/blog');

    targetLangs.forEach((lang) => {
      if (lang !== 'en') {
        revalidatePath(`/${lang}/blog`);
        revalidated.push(`/${lang}/blog`);
      }
    });

    // Revalidate specific post pages if slug provided
    if (slug) {
      targetLangs.forEach((lang) => {
        const prefix = lang === 'en' ? '' : `/${lang}`;
        const path = `${prefix}/blog/${slug}`;
        revalidatePath(path);
        revalidated.push(path);
      });
    }

    // Revalidate sitemap
    revalidatePath('/sitemap.xml');
    revalidated.push('/sitemap.xml');

    return NextResponse.json({
      success: true,
      revalidated,
    });
  } catch (err) {
    console.error('[blog/revalidate] Error:', err);
    return NextResponse.json(
      { error: 'Revalidation failed: ' + err.message },
      { status: 500 }
    );
  }
}
