import { NextResponse } from 'next/server';
import { doc, getDoc, updateDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';

// Supported languages for country translations
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'ar', name: 'Arabic' },
  { code: 'he', name: 'Hebrew' },
  { code: 'ru', name: 'Russian' }
];

// Translate a single country name
async function translateCountryName(openaiApiKey, countryName, targetLanguage) {
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

export async function POST(request) {
  try {
    const { countryCode, countryName, targetLanguages, translateAll } = await request.json();

    // Fetch OpenAI API key from Firestore
    const configRef = doc(db, 'config', 'openai');
    const configDoc = await getDoc(configRef);
    
    if (!configDoc.exists() || !configDoc.data().api_key) {
      return NextResponse.json(
        { success: false, error: 'OpenAI API key not configured. Go to Config > API Keys to set it up.' },
        { status: 400 }
      );
    }

    const openaiApiKey = configDoc.data().api_key;

    // If translateAll is true, translate ALL countries
    if (translateAll) {
      const countriesSnapshot = await getDocs(collection(db, 'countries'));
      const countries = countriesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      let successCount = 0;
      let skipCount = 0;
      let errorCount = 0;
      const results = [];

      for (const country of countries) {
        const englishName = country.translations?.en || country.name;
        if (!englishName) {
          skipCount++;
          continue;
        }

        // Find missing languages
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
          
          // Ensure English exists
          if (!newTranslations.en) {
            newTranslations.en = englishName;
          }

          // Translate to each missing language
          for (const targetLang of missingLanguages) {
            try {
              const translated = await translateCountryName(openaiApiKey, englishName, targetLang);
              newTranslations[targetLang] = translated;
              
              // Small delay to avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 200));
            } catch (err) {
              console.error(`Error translating ${country.code} to ${targetLang}:`, err);
            }
          }

          // Update country in Firestore
          const countryRef = doc(db, 'countries', country.id);
          await updateDoc(countryRef, {
            translations: newTranslations,
            translatedAt: serverTimestamp()
          });

          successCount++;
          results.push({ 
            country: country.code, 
            status: 'success', 
            languagesAdded: missingLanguages.length 
          });

        } catch (err) {
          console.error(`Error processing country ${country.code}:`, err);
          errorCount++;
          results.push({ country: country.code, status: 'error', error: err.message });
        }
      }

      return NextResponse.json({
        success: true,
        summary: {
          total: countries.length,
          translated: successCount,
          skipped: skipCount,
          errors: errorCount
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

    const languages = targetLanguages || SUPPORTED_LANGUAGES.map(l => l.code);
    const translations = {};

    for (const targetLang of languages) {
      try {
        const translated = await translateCountryName(openaiApiKey, countryName, targetLang);
        translations[targetLang] = translated;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error translating to ${targetLang}:`, err);
        translations[targetLang] = countryName; // Fallback to original
      }
    }

    // Update country in Firestore
    const countryRef = doc(db, 'countries', countryCode);
    const countryDoc = await getDoc(countryRef);
    
    if (countryDoc.exists()) {
      const existingTranslations = countryDoc.data().translations || {};
      await updateDoc(countryRef, {
        translations: { ...existingTranslations, ...translations },
        translatedAt: serverTimestamp()
      });
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
