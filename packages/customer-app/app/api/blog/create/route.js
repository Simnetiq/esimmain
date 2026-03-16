import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

const SUPPORTED_LANGUAGES = ['es', 'fr', 'de', 'ar', 'he', 'hi', 'it', 'ja', 'ko', 'nl', 'pl', 'pt', 'ru', 'th', 'tr', 'uk', 'zh'];

const LANGUAGE_NAMES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
  he: 'Hebrew',
  hi: 'Hindi',
  ja: 'Japanese',
  pl: 'Polish',
  pt: 'Portuguese',
  ru: 'Russian',
  uk: 'Ukrainian',
  zh: 'Chinese',
};

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

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);
}

async function getOpenAIKey(supabase) {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'openai')
    .single();

  if (error || !data?.value?.api_key) {
    throw new Error('OpenAI API key not configured in app_config');
  }
  return data.value.api_key;
}

async function translateContent(title, content, targetLanguage, openaiKey) {
  const languageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
  const isRTL = ['ar', 'he'].includes(targetLanguage);

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a professional translator for an eSIM technology blog. Translate the blog post from English to ${languageName}.

Rules:
- Output MUST be pure Markdown format - NO HTML tags
- Use ## for H2, ### for H3, **bold**, *italic*, - for lists
- Preserve ALL Markdown formatting exactly
- Keep technical terms in English: eSIM, SIM, QR code, APN, LTE, 5G, iOS, Android, GB, MB
- Keep brand names in English: Simnetiq, Apple, Google, Samsung
${isRTL ? '- For RTL languages: translate naturally, the app handles RTL rendering\n' : ''}- Return valid JSON with these exact keys: title, content, seo_title, seo_description, og_title, og_description
- seo_title: max 70 chars, optimized for search engines
- seo_description: max 220 chars, compelling summary for search results
- og_title: max 70 chars, engaging title for social media sharing
- og_description: max 200 chars, social media preview description
- Do NOT add commentary - return ONLY the JSON object`,
        },
        {
          role: 'user',
          content: JSON.stringify({ title, content }),
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  // Strip any HTML tags the model may have introduced
  let cleanContent = result.content
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title: result.title,
    content: cleanContent,
    seo_title: (result.seo_title || result.title).slice(0, 70),
    seo_description: (result.seo_description || '').slice(0, 220),
    og_title: (result.og_title || result.seo_title || result.title).slice(0, 70),
    og_description: (result.og_description || result.seo_description || '').slice(0, 200),
    tokens_used: data.usage?.total_tokens || null,
  };
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

  const { title, content } = body;
  if (!title || !content) {
    return NextResponse.json(
      { error: 'title and content are required' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Generate slug
  const slug = body.slug ? slugify(body.slug) : slugify(title);
  if (!slug || slug.length < 3) {
    return NextResponse.json(
      { error: 'Generated slug is too short. Provide a longer title or custom slug.' },
      { status: 400 }
    );
  }

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('blog_posts')
    .select('id, base_slug')
    .eq('base_slug', slug)
    .single();

  if (existing) {
    return NextResponse.json(
      {
        error: 'Slug already exists',
        existing_post_id: existing.id,
        slug: existing.base_slug,
      },
      { status: 409 }
    );
  }

  const excerpt =
    body.excerpt ||
    content
      .replace(/<[^>]*>/g, '')
      .replace(/[#*_~`>\-|]/g, '')
      .substring(0, 160)
      .trim();

  const status = body.status || 'published';

  // Create base post
  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .insert({
      base_slug: slug,
      author: body.author || 'Simnetiq',
      category: body.category || 'General',
      tags: body.tags || [],
      featured_image: body.featured_image || null,
      status,
      seo_keywords: body.seo_keywords || [],
      published_at: status === 'published' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (postError) {
    console.error('[blog/create] Post insert error:', postError);
    return NextResponse.json({ error: postError.message }, { status: 500 });
  }

  // Insert English translation
  const { error: enError } = await supabase
    .from('blog_post_translations')
    .insert({
      post_id: post.id,
      language: 'en',
      title,
      slug,
      content,
      excerpt,
      seo_title: (body.seo_title || title).slice(0, 70),
      seo_description: (body.seo_description || excerpt).slice(0, 220),
      og_title: body.og_title ? body.og_title.slice(0, 70) : null,
      og_description: body.og_description ? body.og_description.slice(0, 200) : null,
    });

  if (enError) {
    // Rollback: delete the post if English translation fails
    await supabase.from('blog_posts').delete().eq('id', post.id);
    console.error('[blog/create] EN translation error:', enError);
    return NextResponse.json(
      { error: 'Failed to create English translation: ' + enError.message },
      { status: 500 }
    );
  }

  // Auto-translate
  const targetLangs =
    body.auto_translate !== false
      ? body.target_languages || SUPPORTED_LANGUAGES
      : [];

  const results = { completed: ['en'], failed: [], errors: [] };
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || 'https://www.simnetiq.store';

  if (targetLangs.length > 0) {
    let openaiKey;
    try {
      openaiKey = await getOpenAIKey(supabase);
    } catch (err) {
      // Translations will all fail but post is created
      results.errors.push({
        language: 'all',
        error: err.message,
      });
      targetLangs.length = 0; // Skip translation loop
    }

    for (const lang of targetLangs) {
      if (!SUPPORTED_LANGUAGES.includes(lang)) continue;

      try {
        // Log translation job
        const { data: job } = await supabase
          .from('translation_jobs')
          .insert({
            entity_type: 'blog_post',
            entity_id: post.id,
            target_languages: [lang],
            status: 'processing',
            source_language: 'en',
            triggered_by: 'api',
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        const translated = await translateContent(
          title,
          content,
          lang,
          openaiKey
        );

        const translatedExcerpt = translated.content
          .replace(/<[^>]*>/g, '')
          .replace(/[#*_~`>\-|]/g, '')
          .substring(0, 160)
          .trim();

        await supabase.from('blog_post_translations').insert({
          post_id: post.id,
          language: lang,
          title: translated.title,
          slug, // Same slug for all languages
          content: translated.content,
          excerpt: translatedExcerpt,
          seo_title: translated.seo_title || translated.title.slice(0, 70),
          seo_description: translated.seo_description || translatedExcerpt.slice(0, 220),
          og_title: translated.og_title || null,
          og_description: translated.og_description || null,
        });

        // Update job status
        if (job) {
          await supabase
            .from('translation_jobs')
            .update({
              status: 'completed',
              languages_completed: [lang],
              completed_at: new Date().toISOString(),
            })
            .eq('id', job.id);
        }

        results.completed.push(lang);
      } catch (err) {
        console.error(`[blog/create] Translation to ${lang} failed:`, err);
        results.failed.push(lang);
        results.errors.push({ language: lang, error: err.message });
      }

      // Rate limit protection between translations
      if (targetLangs.indexOf(lang) < targetLangs.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }

  // Build URLs
  const urls = {};
  results.completed.forEach((lang) => {
    const prefix = lang === 'en' ? '' : `/${lang}`;
    urls[lang] = `${baseUrl}${prefix}/blog/${slug}`;
  });

  // Revalidate ISR paths
  try {
    revalidatePath('/blog');
    results.completed.forEach((lang) => {
      const prefix = lang === 'en' ? '' : `/${lang}`;
      revalidatePath(`${prefix}/blog/${slug}`);
      if (lang !== 'en') revalidatePath(`${prefix}/blog`);
    });
  } catch {
    // ISR revalidation is best-effort
  }

  // Webhook callback
  if (body.webhook_url) {
    try {
      await fetch(body.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          post_id: post.id,
          slug,
          urls,
          translations: {
            completed: results.completed,
            failed: results.failed,
          },
          translation_complete: results.failed.length === 0,
          errors: results.errors,
        }),
      });
    } catch {
      // Webhook failure is non-fatal
    }
  }

  return NextResponse.json(
    {
      success: true,
      post_id: post.id,
      slug,
      urls,
      translations: {
        completed: results.completed,
        failed: results.failed,
        pending: [],
      },
      translation_complete: results.failed.length === 0,
      errors: results.errors,
    },
    { status: 201 }
  );
}
