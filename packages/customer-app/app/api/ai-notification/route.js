import { NextResponse } from 'next/server';
import { sendFCMMessage } from '@esim/shared/lib/fcm';
import { getSupabaseAdmin } from '@esim/shared/lib/supabaseAdmin';

async function generateNotificationWithAI(prompt, config) {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'HTTP-Referer': config.siteUrl,
      'X-Title': config.siteName
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates engaging, concise notification messages for a travel eSIM service called Simnetiq. Keep messages under 120 characters, friendly, and actionable.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenRouter API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content?.trim();
  if (!content) throw new Error('No content generated from AI');
  return content;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { prompt, title, userIds = [], aiConfig, testMode = false } = body;

    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    const supabase = getSupabaseAdmin();

    let config = aiConfig;
    if (!config || !config.apiKey) {
      // Try Supabase config first
      try {
        const { data: configData } = await supabase
          .from('app_config')
          .select('*')
          .eq('id', 'openrouter')
          .single();
        
        if (configData?.api_key) {
          config = {
            apiKey: configData.api_key,
            model: configData.model || 'openai/gpt-3.5-turbo',
            baseUrl: 'https://openrouter.ai/api/v1',
            maxTokens: configData.max_tokens || 150,
            temperature: configData.temperature || 0.7,
            siteName: configData.site_name || 'Simnetiq',
            siteUrl: configData.site_url || 'https://esim.Simnetiq.net'
          };
        }
      } catch { /* ignore */ }
      
      // Fallback to env
      if (!config || !config.apiKey) {
        config = {
          apiKey: process.env.OPENROUTER_API_KEY,
          model: process.env.OPENROUTER_MODEL || 'openai/gpt-3.5-turbo',
          baseUrl: 'https://openrouter.ai/api/v1',
          maxTokens: parseInt(process.env.OPENROUTER_MAX_TOKENS) || 150,
          temperature: parseFloat(process.env.OPENROUTER_TEMPERATURE) || 0.7,
          siteName: process.env.OPENROUTER_SITE_NAME || 'Simnetiq',
          siteUrl: process.env.OPENROUTER_SITE_URL || 'https://esim.Simnetiq.net'
        };
      }
    }

    if (!config.apiKey) {
      return NextResponse.json({ error: 'OpenRouter API key not configured.' }, { status: 500 });
    }

    const aiGeneratedBody = await generateNotificationWithAI(prompt, config);

    if (testMode) {
      return NextResponse.json({
        success: true, testMode: true,
        generated: { title: title || 'Simnetiq Update', body: aiGeneratedBody }
      });
    }

    // Get FCM tokens from Supabase
    let tokenQuery = supabase
      .from('fcm_tokens')
      .select('token')
      .eq('active', true);

    if (userIds.length > 0) {
      tokenQuery = tokenQuery.in('user_id', userIds);
    }

    const { data: tokenRows } = await tokenQuery;
    const tokens = (tokenRows || []).map(r => r.token);

    if (tokens.length === 0) {
      return NextResponse.json({
        success: false, error: 'No active FCM tokens found',
        generated: { title: title || 'Simnetiq Update', body: aiGeneratedBody }
      });
    }

    const notifTitle = title || 'Simnetiq Update';
    const messageBase = {
      notification: { title: notifTitle, body: aiGeneratedBody },
      data: { type: 'ai_daily_notification', timestamp: Date.now().toString(), source: 'ai_generator' },
      android: { priority: 'high', notification: { channel_id: 'fcm_notifications', sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' } },
      apns: { payload: { aps: { alert: { title: notifTitle, body: aiGeneratedBody }, sound: 'default', badge: 1 } } }
    };

    let successCount = 0, failureCount = 0;
    const failedTokens = [];

    for (const token of tokens) {
      try {
        await sendFCMMessage({ ...messageBase, token });
        successCount++;
      } catch {
        failedTokens.push(token);
        failureCount++;
      }
    }

    return NextResponse.json({
      success: true,
      generated: { title: title || 'Simnetiq Update', body: aiGeneratedBody },
      sent: { total: tokens.length, success: successCount, failed: failureCount, failedTokens }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate and send AI notification', details: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'examples') {
    return NextResponse.json({
      success: true,
      examples: [
        { category: 'Travel Tips', prompts: ['Create a notification about saving money on international roaming', 'Write a tip about activating eSIM before travel', 'Share advice about data usage while traveling abroad'] },
        { category: 'Promotional', prompts: ['Create an exciting notification about new country coverage', 'Write about a flash sale on data plans', 'Announce a weekend special offer'] },
        { category: 'Engagement', prompts: ['Encourage users to refer friends with a friendly message', 'Remind users to check their data balance', 'Invite users to share their travel experience'] },
        { category: 'Educational', prompts: ['Explain what eSIM is in simple terms', 'Share how to check if device supports eSIM', 'Describe benefits of eSIM over physical SIM'] }
      ]
    });
  }

  return NextResponse.json({ success: true, info: 'AI Notification Generator API', endpoints: { POST: 'Generate and send AI notification', 'GET?action=examples': 'Get example prompts' } });
}
