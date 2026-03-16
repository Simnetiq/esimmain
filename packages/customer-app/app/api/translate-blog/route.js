import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

function isAuthorized(request) {
  const apiKey = process.env.BLOG_API_KEY;
  if (!apiKey) return false;

  const expected = Buffer.from(apiKey);

  // Allow calls with BLOG_API_KEY (external/n8n)
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    const provided = Buffer.from(auth.slice(7));
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return true;
    }
  }

  // Allow calls with internal header (from admin app on same origin)
  const internalKey = request.headers.get('x-internal-key');
  if (internalKey) {
    const provided = Buffer.from(internalKey);
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) {
      return true;
    }
  }

  return false;
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { title, content, targetLanguage } = await request.json();

    if (!title || !content || !targetLanguage) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch OpenAI API key from Supabase config
    const supabase = getSupabaseAdmin();
    const { data: configData, error: configError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'openai')
      .single();

    if (configError || !configData?.value?.api_key) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured' },
        { status: 400 }
      );
    }

    const openaiApiKey = configData.value.api_key;

    const languageNames = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ar': 'Arabic',
      'he': 'Hebrew',
      'hi': 'Hindi',
      'ja': 'Japanese',
      'pl': 'Polish',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'uk': 'Ukrainian',
      'zh': 'Chinese'
    };

    const targetLanguageName = languageNames[targetLanguage] || targetLanguage;
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
- If a field would be identical to another, still provide it separately
- Do NOT add commentary - return ONLY the JSON object`
          },
          {
            role: 'user',
            content: JSON.stringify({ title, content })
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API request failed');
    }

    const data = await response.json();
    const translatedContent = JSON.parse(data.choices[0].message.content);

    // Post-process to ensure pure markdown
    let cleanContent = translatedContent.content;

    cleanContent = cleanContent
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

    // Truncate SEO fields to DB constraints
    return NextResponse.json({
      success: true,
      translation: {
        title: translatedContent.title,
        content: cleanContent,
        seo_title: (translatedContent.seo_title || translatedContent.title).slice(0, 70),
        seo_description: (translatedContent.seo_description || '').slice(0, 220),
        og_title: (translatedContent.og_title || translatedContent.seo_title || translatedContent.title).slice(0, 70),
        og_description: (translatedContent.og_description || translatedContent.seo_description || '').slice(0, 200)
      }
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
