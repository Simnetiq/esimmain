import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'zh', name: 'Chinese' }
];

async function translateCountryName(openaiApiKey, countryName, targetLanguage) {
  const languageNames = {
    'en': 'English', 'es': 'Spanish', 'fr': 'French', 'de': 'German',
    'ar': 'Arabic', 'he': 'Hebrew', 'hi': 'Hindi', 'ja': 'Japanese',
    'pl': 'Polish', 'pt': 'Portuguese', 'ru': 'Russian', 'uk': 'Ukrainian', 'zh': 'Chinese'
  };

  const targetLanguageName = languageNames[targetLanguage] || targetLanguage;

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
          content: `You are a professional translator. Translate country names accurately and naturally. Use the official/common name in the target language.`
        },
        {
          role: 'user',
          content: `Translate this country name to ${targetLanguageName}: "${countryName}"\n\nRespond with ONLY the translated name, nothing else.`
        }
      ],
      temperature: 0.1,
      max_tokens: 100
    })
  });

  if (!response.ok) {
    throw new Error('OpenAI API request failed');
  }

  const data = await response.json();
  return data.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

export async function POST(request) {
  try {
    const { countryCode, countryName, targetLanguages, translateAll } = await request.json();

    const supabase = getSupabaseAdmin();

    // Fetch OpenAI API key
    const { data: configData, error: configError } = await supabase
      .from('app_config')
      .select('*')
      .eq('id', 'openai')
      .single();
    
    if (configError || !configData?.api_key) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured. Go to Config > API Keys to set it up.' },
        { status: 400 }
      );
    }

    const openaiApiKey = configData.api_key;

    if (translateAll) {
      const { data: countries, error } = await supabase
        .from('countries')
        .select('*');

      if (error) throw error;

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      const results = [];

      for (const country of (countries || [])) {
        const englishName = country.translations?.en || country.name;
        if (!englishName) {
          skipCount++;
          continue;
        }

        const existingLanguages = Object.keys(country.translations || {});
        const missingLanguages = SUPPORTED_LANGUAGES
          .map(lang => lang.code)
          .filter(code => !existingLanguages.includes(code));

        if (missingLanguages.length === 0) {
          skipCount++;
          results.push({ country: country.code, status: 'skipped', reason: 'All languages exist' });
          continue;
        }

        try {
          const newTranslations = { ...country.translations };
          if (!newTranslations.en) newTranslations.en = englishName;

          for (const targetLang of missingLanguages) {
            try {
              const translated = await translateCountryName(openaiApiKey, englishName, targetLang);
              newTranslations[targetLang] = translated;
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
              console.error(`Error translating ${country.code} to ${targetLang}:`, err);
            }
          }

          await supabase
            .from('countries')
            .update({
              translations: newTranslations,
              translated_at: new Date().toISOString()
            })
            .eq('id', country.id);

          successCount++;
          results.push({ country: country.code, status: 'success', languagesAdded: missingLanguages.length });
        } catch (err) {
          console.error(`Error processing country ${country.code}:`, err);
          errorCount++;
          results.push({ country: country.code, status: 'error', error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        summary: { total: (countries || []).length, translated: successCount, skipped: skipCount, errors: errorCount },
        results
      });
    }

    // Single country translation
    if (!countryCode || !countryName) {
      return NextResponse.json(
        { success: false, error: 'Missing countryCode or countryName' },
        { status: 400 }
      );
    }

    const languages = targetLanguages || SUPPORTED_LANGUAGES.map(l => l.code);
    const translations = {};

    for (const targetLang of languages) {
      try {
        const translated = await translateCountryName(openaiApiKey, countryName, targetLang);
        translations[targetLang] = translated;
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error translating to ${targetLang}:`, err);
        translations[targetLang] = countryName;
      }
    }

    // Update country
    const { data: existingCountry } = await supabase
      .from('countries')
      .select('translations')
      .eq('id', countryCode)
      .single();

    if (existingCountry) {
      const merged = { ...(existingCountry.translations || {}), ...translations };
      await supabase
        .from('countries')
        .update({
          translations: merged,
          translated_at: new Date().toISOString()
        })
        .eq('id', countryCode);
    }

    return NextResponse.json({
      success: true,
      translations
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
