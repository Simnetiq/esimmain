import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';
import { revalidatePath } from 'next/cache';

const SUPPORTED_LANGUAGES = ['es', 'fr', 'de', 'ar', 'he', 'ru'];

const LANGUAGE_NAMES = {
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  ar: 'Arabic',
  he: 'Hebrew',
  ru: 'Russian',
};

function requireApiKey(request) {
  const apiKey = process.env.BLOG_API_KEY;
  if (!apiKey) return false;

  const auth = request.headers.get('authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === apiKey;
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
          content: `You are a professional translator. Translate the blog post title and content from English to ${languageName}.

Rules:
- Output MUST be pure Markdown format - NO HTML tags
- Preserve ALL Markdown formatting exactly
- Keep technical terms in English: eSIM, SIM, QR code, APN, LTE, 5G, iOS, Android, GB, MB
- Keep brand names in English: Simnetiq, Apple, Google, Samsung
${isRTL ? '- For RTL languages: translate naturally, the app handles RTL rendering\n' : ''}- Return valid JSON with "title" and "content" keys only`,
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

  let cleanContent = result.content
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    title: result.title,
    content: cleanContent,
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

  const { post_id } = body;
  if (!post_id) {
    return NextResponse.json(
      { error: 'post_id is required' },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // Fetch the post and its English translation
  const { data: post, error: postError } = await supabase
    .from('blog_posts')
    .select('id, base_slug, status')
    .eq('id', post_id)
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  const { data: enTranslation, error: enError } = await supabase
    .from('blog_post_translations')
    .select('title, content, slug')
    .eq('post_id', post_id)
    .eq('language', 'en')
    .single();

  if (enError || !enTranslation) {
    return NextResponse.json(
      { error: 'English translation not found. Cannot translate without source.' },
      { status: 400 }
    );
  }

  // Determine target languages
  const { data: existingTranslations } = await supabase
    .from('blog_post_translations')
    .select('language')
    .eq('post_id', post_id);

  const existingLangs = (existingTranslations || []).map((t) => t.language);
  const force = body.force === true;

  let targetLangs = body.target_languages || SUPPORTED_LANGUAGES;
  targetLangs = targetLangs.filter((lang) => {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return false;
    if (!force && existingLangs.includes(lang)) return false;
    return true;
  });

  if (targetLangs.length === 0) {
    return NextResponse.json({
      success: true,
      post_id,
      translations: {
        completed: [],
        failed: [],
        skipped: existingLangs,
      },
      message: 'All requested languages already have translations. Use force: true to re-translate.',
    });
  }

  let openaiKey;
  try {
    openaiKey = await getOpenAIKey(supabase);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  const results = { completed: [], failed: [], skipped: existingLangs.filter((l) => l !== 'en') };

  for (const lang of targetLangs) {
    try {
      // Log translation job
      const { data: job } = await supabase
        .from('translation_jobs')
        .insert({
          entity_type: 'blog_post',
          entity_id: post_id,
          target_languages: [lang],
          status: 'processing',
          source_language: 'en',
          triggered_by: 'api',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      const translated = await translateContent(
        enTranslation.title,
        enTranslation.content,
        lang,
        openaiKey
      );

      const translatedExcerpt = translated.content
        .replace(/<[^>]*>/g, '')
        .replace(/[#*_~`>\-|]/g, '')
        .substring(0, 160)
        .trim();

      // Upsert translation (handles both insert and update for force mode)
      await supabase
        .from('blog_post_translations')
        .upsert(
          {
            post_id,
            language: lang,
            title: translated.title,
            slug: enTranslation.slug, // Same slug
            content: translated.content,
            excerpt: translatedExcerpt,
            seo_title: translated.title,
            seo_description: translatedExcerpt,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'post_id,language' }
        );

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
      console.error(`[blog/translate] Translation to ${lang} failed:`, err);
      results.failed.push(lang);
    }

    // Rate limit protection
    if (targetLangs.indexOf(lang) < targetLangs.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Revalidate ISR paths
  try {
    const slug = post.base_slug;
    revalidatePath('/blog');
    results.completed.forEach((lang) => {
      const prefix = lang === 'en' ? '' : `/${lang}`;
      revalidatePath(`${prefix}/blog/${slug}`);
      if (lang !== 'en') revalidatePath(`${prefix}/blog`);
    });
  } catch {
    // Best-effort
  }

  return NextResponse.json({
    success: true,
    post_id,
    translations: {
      completed: results.completed,
      failed: results.failed,
      skipped: results.skipped,
    },
  });
}
