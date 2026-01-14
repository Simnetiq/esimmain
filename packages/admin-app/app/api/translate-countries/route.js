import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supportedLanguages, languageNameMap } from '@esim/shared/utils/languageUtils';

// Create Supabase client with service role for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Use centralized language configuration from shared utils
const SUPPORTED_LANGUAGES = supportedLanguages;

// Translate a single country name using OpenAI
async function translateCountryName(openaiApiKey, countryName, targetLanguage) {
  const targetLanguageName = languageNameMap[targetLanguage] || targetLanguage;

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
          content: `You are a professional translator. Translate country names accurately and naturally.
Use the official/common name in the target language that native speakers would use.
For example:
- "United States" in Spanish → "Estados Unidos"
- "Germany" in German → "Deutschland"
- "United Kingdom" in Arabic → "المملكة المتحدة"
- "France" in Hebrew → "צרפת"`
        },
        {
          role: 'user',
          content: `Translate this country name to ${targetLanguageName}: "${countryName}"

Respond with ONLY the translated name, nothing else.`
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

// Fetch OpenAI API key from Supabase config table
async function getOpenAIKey(supabase) {
  const { data, error } = await supabase
    .from('config')
    .select('value')
    .eq('key', 'openai_api_key')
    .maybeSingle();

  if (error || !data?.value) {
    // Fallback to environment variable
    const envKey = process.env.OPENAI_API_KEY;
    if (envKey) return envKey;
    return null;
  }

  return data.value;
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const { countryCode, countryName, targetLanguages, translateAll } = await request.json();

    // Get OpenAI API key
    let openaiApiKey = await getOpenAIKey(supabase);

    if (!openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured. Set OPENAI_API_KEY in environment or add to config table.' },
        { status: 400 }
      );
    }

    // If translateAll is true, translate ALL countries
    if (translateAll) {
      // Fetch all countries with existing translations (including locked/verified status)
      const { data: countries, error: countriesError } = await supabase
        .from('countries')
        .select(`
          id,
          name,
          iso_code,
          country_translations (
            language_code,
            name,
            is_locked,
            is_verified
          )
        `)
        .eq('is_active', true);

      if (countriesError) throw countriesError;

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      let protectedCount = 0;
      const results = [];

      for (const country of countries) {
        // Build existing translations object with metadata
        const existingTranslations = {};
        const protectedLanguages = new Set();

        (country.country_translations || []).forEach(t => {
          existingTranslations[t.language_code] = t.name;
          // Track locked or verified translations - these should NEVER be overwritten
          if (t.is_locked || t.is_verified) {
            protectedLanguages.add(t.language_code);
          }
        });

        const englishName = existingTranslations.en || country.name;
        if (!englishName) {
          skipCount++;
          continue;
        }

        // Find missing languages (exclude protected translations)
        const existingLanguages = Object.keys(existingTranslations);
        const missingLanguages = SUPPORTED_LANGUAGES
          .map(lang => lang.code)
          .filter(code => !existingLanguages.includes(code) && !protectedLanguages.has(code));

        if (missingLanguages.length === 0) {
          skipCount++;
          const protectedList = Array.from(protectedLanguages);
          results.push({
            country: country.iso_code,
            status: 'skipped',
            reason: protectedList.length > 0
              ? `All languages exist (${protectedList.length} protected)`
              : 'All languages exist'
          });
          continue;
        }

        try {
          const newTranslations = [];

          // Ensure English exists (only if not protected)
          if (!existingTranslations.en && !protectedLanguages.has('en')) {
            newTranslations.push({
              country_id: country.id,
              language_code: 'en',
              name: englishName,
              source: 'manual',
              is_verified: false,
              is_locked: false,
              translated_at: new Date().toISOString(),
              last_updated_at: new Date().toISOString()
            });
          }

          // Translate to each missing language (skip 'en' and protected languages)
          for (const targetLang of missingLanguages) {
            if (targetLang === 'en') continue; // Skip English, handled separately
            if (protectedLanguages.has(targetLang)) {
              protectedCount++;
              continue; // NEVER overwrite locked or verified translations
            }

            try {
              const translated = await translateCountryName(openaiApiKey, englishName, targetLang);
              newTranslations.push({
                country_id: country.id,
                language_code: targetLang,
                name: translated,
                source: 'chatgpt',
                source_model: 'gpt-4o-mini',
                is_verified: false,
                is_locked: false,
                translated_at: new Date().toISOString(),
                last_updated_at: new Date().toISOString()
              });

              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
              console.error(`Error translating ${country.iso_code} to ${targetLang}:`, err);
            }
          }

          // Upsert translations to Supabase (only for non-protected translations)
          if (newTranslations.length > 0) {
            const { error: upsertError } = await supabase
              .from('country_translations')
              .upsert(newTranslations, { onConflict: 'country_id,language_code' });

            if (upsertError) {
              throw upsertError;
            }
          }

          successCount++;
          results.push({
            country: country.iso_code,
            status: 'success',
            languagesAdded: newTranslations.length,
            protectedSkipped: protectedLanguages.size
          });

        } catch (err) {
          console.error(`Error processing country ${country.iso_code}:`, err);
          errorCount++;
          results.push({ country: country.iso_code, status: 'error', error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          total: countries.length,
          translated: successCount,
          skipped: skipCount,
          errors: errorCount,
          protectedSkipped: protectedCount
        },
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

    // Find the country in Supabase
    const { data: country, error: countryError } = await supabase
      .from('countries')
      .select('id, name')
      .or(`id.eq.${countryCode.toLowerCase()},iso_code.eq.${countryCode.toUpperCase()}`)
      .maybeSingle();

    if (countryError) throw countryError;
    if (!country) {
      return NextResponse.json(
        { success: false, error: `Country "${countryCode}" not found` },
        { status: 404 }
      );
    }

    const languages = targetLanguages || SUPPORTED_LANGUAGES.map(l => l.code);
    const translations = {};
    const translationRows = [];

    for (const targetLang of languages) {
      try {
        const translated = await translateCountryName(openaiApiKey, countryName, targetLang);
        translations[targetLang] = translated;
        translationRows.push({
          country_id: country.id,
          language_code: targetLang,
          name: translated,
          source: 'chatgpt',
          source_model: 'gpt-4o-mini'
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error translating to ${targetLang}:`, err);
        translations[targetLang] = countryName; // Fallback to original
        translationRows.push({
          country_id: country.id,
          language_code: targetLang,
          name: countryName,
          source: 'manual'
        });
      }
    }

    // Upsert translations to Supabase
    const { error: upsertError } = await supabase
      .from('country_translations')
      .upsert(translationRows, { onConflict: 'country_id,language_code' });

    if (upsertError) throw upsertError;

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
