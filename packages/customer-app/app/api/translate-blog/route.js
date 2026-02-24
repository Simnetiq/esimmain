import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

function isAuthorized(request) {
  // Allow calls with BLOG_API_KEY (external/n8n)
  const apiKey = process.env.BLOG_API_KEY;
  const auth = request.headers.get('authorization');
  if (apiKey && auth?.startsWith('Bearer ') && auth.slice(7) === apiKey) {
    return true;
  }

  // Allow calls with internal header (from admin app on same origin)
  const internalKey = request.headers.get('x-internal-key');
  if (internalKey && internalKey === process.env.BLOG_API_KEY) {
    return true;
  }

  // Allow calls from same origin (Referer check for admin panel)
  const referer = request.headers.get('referer') || '';
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_BASE_URL,
    'https://www.simnetiq.store',
    'https://admin.simnetiq.store',
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  return allowedOrigins.some((origin) => referer.startsWith(origin));
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
      'ru': 'Russian'
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
            content: `You are a professional translator specializing in blog content translation. Translate the following blog post from English to ${targetLanguageName}.

CRITICAL MARKDOWN FORMATTING RULES - MUST FOLLOW EXACTLY:
1. OUTPUT MUST BE PURE MARKDOWN FORMAT ONLY - NO HTML TAGS WHATSOEVER
2. Use ## for H2 headings (e.g., ## Heading)
3. Use ### for H3 headings (e.g., ### Subheading)
4. Use **text** for bold text
5. Use *text* for italic text
6. Use - or * for unordered list items
7. Use 1. 2. 3. for ordered lists
8. Use blank lines between paragraphs (double line break)
9. Use blank lines before and after headings
10. Use blank lines before and after lists
11. NEVER use HTML tags like <h2>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <br>
12. NEVER use <br> or <br/> tags for line breaks - use actual line breaks (\\n)
13. Keep all links in markdown format: [text](url)
14. Keep all images in markdown format: ![alt](url)
15. Preserve code blocks with triple backticks: \`\`\`language\\ncode\\n\`\`\`
16. Match the original's spacing and structure exactly${isRTL ? '\n17. For RTL languages (Arabic/Hebrew): Ensure proper text direction but keep markdown syntax in LTR format' : ''}

Provide accurate, natural-sounding translations that maintain the original tone and style.`
          },
          {
            role: 'user',
            content: `Translate this blog post to ${targetLanguageName}. The content is in MARKDOWN format.

Title: ${title}

Content:
${content}

CRITICAL INSTRUCTIONS:
1. Output MUST be in PURE MARKDOWN format
2. DO NOT convert markdown to HTML
3. DO NOT use any HTML tags
4. Keep the exact same markdown structure as the original
5. Use ## for headings, **bold**, *italic*, - for lists
6. Use blank lines between sections
7. Translate ONLY the text content, keep all markdown syntax unchanged${isRTL ? '\n8. For RTL text: Write the translated text in the proper direction but keep markdown symbols in standard format' : ''}

Provide the translation in this exact JSON format:
{
  "title": "translated title",
  "content": "translated content in PURE MARKDOWN format with NO HTML tags"
}

REMEMBER: PURE MARKDOWN ONLY - NO HTML TAGS AT ALL!`
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
        return '\n' + content.replace(/<li>([\s\S]*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      })
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return NextResponse.json({
      success: true,
      translation: {
        title: translatedContent.title,
        content: cleanContent
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
