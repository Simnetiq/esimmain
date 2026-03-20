import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const LANGUAGE_NAMES = {
  es: 'Spanish', fr: 'French', de: 'German', ar: 'Arabic',
  he: 'Hebrew', hi: 'Hindi', it: 'Italian', ja: 'Japanese',
  ko: 'Korean', nl: 'Dutch', pl: 'Polish', pt: 'Portuguese',
  ru: 'Russian', th: 'Thai', tr: 'Turkish', uk: 'Ukrainian',
  zh: 'Chinese',
};

// TODO: Add session-based auth to all admin API routes (translate-blog,
// translate-countries, translate-regions, sync-airalo, etc.)
// Currently protected by admin panel login only.

function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured. SUPABASE_SERVICE_ROLE_KEY is required.');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
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

export async function POST(request) {
  try {
    const { title, content, targetLanguage, postId, baseSlug } = await request.json();

    if (!title || !content || !targetLanguage) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    const openaiApiKey = await getOpenAIKey(supabase);

    const targetLanguageName = LANGUAGE_NAMES[targetLanguage] || targetLanguage;
    const isRTL = ['ar', 'he'].includes(targetLanguage);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator for an eSIM technology blog. Translate the following blog post from English to ${targetLanguageName}.

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
- Do NOT add commentary - return ONLY the JSON object`
          },
          {
            role: 'user',
            content: JSON.stringify({ title, content })
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const translatedContent = JSON.parse(data.choices[0].message.content);

    // Post-process to ensure pure markdown
    let cleanContent = translatedContent.content
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p>([\s\S]*?)<\/p>/gi, '\n$1\n')
      .replace(/<h2>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<h4>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
      .replace(/<(strong|b)>([\s\S]*?)<\/(strong|b)>/gi, '**$2**')
      .replace(/<(em|i)>([\s\S]*?)<\/(em|i)>/gi, '*$2*')
      .replace(/<ul>([\s\S]*?)<\/ul>/gi, (match, content) => {
        return '\n' + content.replace(/<li>([\s\S]*?)<\/li>/gi, '- $1\n') + '\n';
      })
      .replace(/<ol>([\s\S]*?)<\/ol>/gi, (match, content) => {
        let counter = 1;
        return '\n' + content.replace(/<li>([\s\S]*?)<\/li>/gi, (_, liContent) => `${counter++}. ${liContent}\n`) + '\n';
      })
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const translation = {
      title: translatedContent.title,
      content: cleanContent,
      seo_title: (translatedContent.seo_title || translatedContent.title).slice(0, 70),
      seo_description: (translatedContent.seo_description || '').slice(0, 220),
      og_title: (translatedContent.og_title || translatedContent.seo_title || translatedContent.title).slice(0, 70),
      og_description: (translatedContent.og_description || translatedContent.seo_description || '').slice(0, 200)
    };

    // If postId is provided, save the translation directly via service role
    if (postId) {
      const excerpt = cleanContent.substring(0, 160).replace(/<[^>]*>/g, '').replace(/[#*_~`>\-|]/g, '');
      const slug = baseSlug || '';

      const { error: upsertError } = await supabase
        .from('blog_post_translations')
        .upsert({
          post_id: postId,
          language: targetLanguage,
          title: translation.title,
          slug,
          content: translation.content,
          excerpt,
          seo_title: translation.seo_title,
          seo_description: translation.seo_description,
          og_title: translation.og_title || null,
          og_description: translation.og_description || null,
        }, {
          onConflict: 'post_id,language',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Translation save error:', upsertError);
        throw new Error(`Failed to save translation: ${upsertError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      translation,
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
