import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role for API routes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function getSupabase() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase environment variables not configured');
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

// Supported languages for region translations
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
  { code: 'ru', name: 'Russian' }
];

// Translate a region name using OpenAI
async function translateRegionName(openaiApiKey, regionName, targetLanguage) {
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
          content: `You are a professional translator. Translate region/continent names accurately and naturally.
Use the official/common name in the target language that native speakers would use.
For example:
- "Europe" in Spanish → "Europa"
- "Asia" in German → "Asien"
- "Middle East" in Arabic → "الشرق الأوسط"
- "Africa" in Hebrew → "אפריקה"
- "Americas" in Russian → "Америка"
- "Caribbean" in French → "Caraïbes"`
        },
        {
          role: 'user',
          content: `Translate this region/geographic area name to ${targetLanguageName}: "${regionName}"

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

// Get existing translations for a region from region_translations table
async function getRegionTranslations(supabase, regionId) {
  const { data, error } = await supabase
    .from('region_translations')
    .select('language_code, name, display_name, source, source_model')
    .eq('region_id', regionId);

  if (error) {
    console.error('Error fetching region translations:', error);
    return {};
  }

  // Convert to object keyed by language code
  const translations = {};
  data?.forEach(t => {
    translations[t.language_code] = {
      name: t.name,
      display_name: t.display_name,
      source: t.source,
      source_model: t.source_model
    };
  });

  return translations;
}

// Upsert a translation in region_translations table
async function upsertRegionTranslation(supabase, regionId, languageCode, name, source, sourceModel) {
  // Check if translation exists
  const { data: existing } = await supabase
    .from('region_translations')
    .select('id')
    .eq('region_id', regionId)
    .eq('language_code', languageCode)
    .maybeSingle();

  if (existing) {
    // Update existing
    const { error } = await supabase
      .from('region_translations')
      .update({
        name,
        source,
        source_model: sourceModel,
        last_updated_at: new Date().toISOString()
      })
      .eq('id', existing.id);

    if (error) throw error;
  } else {
    // Insert new
    const { error } = await supabase
      .from('region_translations')
      .insert({
        region_id: regionId,
        language_code: languageCode,
        name,
        source,
        source_model: sourceModel,
        translated_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString()
      });

    if (error) throw error;
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabase();
    const { regionId, regionName, targetLanguages, translateAll } = await request.json();

    // Get OpenAI API key
    let openaiApiKey = await getOpenAIKey(supabase);

    if (!openaiApiKey) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured. Set OPENAI_API_KEY in environment or add to config table.' },
        { status: 400 }
      );
    }

    // If translateAll is true, translate ALL regions
    if (translateAll) {
      // Fetch all active regions
      const { data: regions, error: regionsError } = await supabase
        .from('regions')
        .select('id, name, display_name')
        .eq('is_active', true);

      if (regionsError) throw regionsError;

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      const results = [];

      for (const region of regions) {
        // Get existing translations from region_translations table
        const existingTranslations = await getRegionTranslations(supabase, region.id);
        const englishName = existingTranslations.en?.name || region.name;

        if (!englishName) {
          skipCount++;
          continue;
        }

        // Find missing languages
        const existingLanguages = Object.keys(existingTranslations).filter(
          lang => existingTranslations[lang]?.name
        );
        const missingLanguages = SUPPORTED_LANGUAGES
          .map(lang => lang.code)
          .filter(code => !existingLanguages.includes(code));

        if (missingLanguages.length === 0) {
          skipCount++;
          results.push({ region: region.id, status: 'skipped', reason: 'All languages exist' });
          continue;
        }

        try {
          // Ensure English exists
          if (!existingTranslations.en?.name) {
            await upsertRegionTranslation(supabase, region.id, 'en', englishName, 'manual', null);
          }

          // Translate to each missing language (skip 'en' since we handle it above)
          for (const targetLang of missingLanguages) {
            if (targetLang === 'en') continue;
            try {
              const translated = await translateRegionName(openaiApiKey, englishName, targetLang);
              await upsertRegionTranslation(supabase, region.id, targetLang, translated, 'chatgpt', 'gpt-4o-mini');

              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
              console.error(`Error translating ${region.id} to ${targetLang}:`, err);
            }
          }

          successCount++;
          results.push({
            region: region.id,
            status: 'success',
            languagesAdded: missingLanguages.filter(l => l !== 'en').length
          });

        } catch (err) {
          console.error(`Error processing region ${region.id}:`, err);
          errorCount++;
          results.push({ region: region.id, status: 'error', error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          total: regions.length,
          translated: successCount,
          skipped: skipCount,
          errors: errorCount
        },
        results
      });
    }

    // Single region translation
    if (!regionId || !regionName) {
      return NextResponse.json(
        { success: false, error: 'Missing regionId or regionName' },
        { status: 400 }
      );
    }

    // Find the region in Supabase
    const { data: region, error: regionError } = await supabase
      .from('regions')
      .select('id, name')
      .eq('id', regionId)
      .maybeSingle();

    if (regionError) throw regionError;
    if (!region) {
      return NextResponse.json(
        { success: false, error: `Region "${regionId}" not found` },
        { status: 404 }
      );
    }

    const languages = targetLanguages || SUPPORTED_LANGUAGES.map(l => l.code);
    const existingTranslations = await getRegionTranslations(supabase, regionId);
    const newTranslations = { ...existingTranslations };

    for (const targetLang of languages) {
      try {
        const translated = await translateRegionName(openaiApiKey, regionName, targetLang);
        await upsertRegionTranslation(supabase, regionId, targetLang, translated, 'chatgpt', 'gpt-4o-mini');

        newTranslations[targetLang] = {
          name: translated,
          source: 'chatgpt',
          source_model: 'gpt-4o-mini'
        };

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error translating to ${targetLang}:`, err);
        // Keep existing translation or use original name
        if (!newTranslations[targetLang]) {
          await upsertRegionTranslation(supabase, regionId, targetLang, regionName, 'manual', null);
          newTranslations[targetLang] = {
            name: regionName,
            source: 'manual'
          };
        }
      }
    }

    // Return translations in simple format for UI
    const translationsSimple = {};
    Object.keys(newTranslations).forEach(lang => {
      translationsSimple[lang] = newTranslations[lang].name;
    });

    return NextResponse.json({
      success: true,
      translations: translationsSimple,
      fullTranslations: newTranslations
    });

  } catch (error) {
    console.error('Translation error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
