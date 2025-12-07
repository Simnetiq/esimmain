import { NextResponse } from 'next/server';
import admin from 'firebase-admin';
import { collection, query, getDocs, where, getDoc, doc } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    let credential;
    
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: 'esim-f0e3e',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
     
    } else {
      credential = admin.credential.cert('./esim-service.json');
 
    }

    admin.initializeApp({
      credential,
      projectId: 'esim-f0e3e',
    });
  } catch {
   
  }
}

/**
 * Generate notification content using OpenRouter
 */
async function generateNotificationWithAI(prompt, config) {
  try {
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
          {
            role: 'system',
            content: 'You are a helpful assistant that creates engaging, concise notification messages for a travel eSIM service called Simnetiq. Keep messages under 120 characters, friendly, and actionable.'
          },
          {
            role: 'user',
            content: prompt
          }
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
    
    if (!content) {
      throw new Error('No content generated from AI');
    }

    return content;
  } catch {

    throw error;
  }
}

/**
 * POST /api/ai-notification
 * Generate AI notification and send to users via FCM
 */
export async function POST(request) {
  try {
    
    const body = await request.json();
    const {
      prompt,
      title,
      userIds = [], // Specific users to send to (empty = all users)
      aiConfig, // Optional: override AI config
      testMode = false // If true, only returns generated content without sending
    } = body;

    // Validation
    if (!prompt) {

      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get OpenRouter configuration
    let config = aiConfig;
    if (!config || !config.apiKey) {
      
      // Try to load from Firestore first
      try {
        const openRouterConfigRef = doc(db, 'config', 'openrouter');
        const openRouterConfigDoc = await getDoc(openRouterConfigRef);
        
        if (openRouterConfigDoc.exists()) {
          const configData = openRouterConfigDoc.data();
          if (configData.api_key) {
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
        }
      } catch {
      
      }
      
      // Fallback to environment variables
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
    
      return NextResponse.json(
        { error: 'OpenRouter API key not configured. Please add it in the Config tab.' },
        { status: 500 }
      );
    }



    // Generate notification content with AI
    const aiGeneratedBody = await generateNotificationWithAI(prompt, config);
    


    // If test mode, return without sending
    if (testMode) {
      return NextResponse.json({
        success: true,
        testMode: true,
        generated: {
          title: title || 'Simnetiq Update',  
          body: aiGeneratedBody
        }
      });
    }

    // Get FCM tokens
    let tokensQuery = query(
      collection(db, 'fcm_tokens'),
      where('active', '==', true)
    );

    // Filter by specific users if provided
    if (userIds.length > 0) {
      tokensQuery = query(tokensQuery, where('userId', 'in', userIds));
    }

    const tokensSnapshot = await getDocs(tokensQuery);
    const tokens = [];
    
    tokensSnapshot.forEach((doc) => {
      tokens.push(doc.data().token);
    });

    if (tokens.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No active FCM tokens found',
        generated: {
          title: title || 'Simnetiq Update',
          body: aiGeneratedBody
        }
      });
    }



    // Build FCM message
    const message = {
      notification: {
        title: title || 'Simnetiq Update',
        body: aiGeneratedBody
      },
      data: {
        type: 'ai_daily_notification',
        timestamp: Date.now().toString(),
        source: 'ai_generator'
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'fcm_notifications',
          sound: 'default',
          clickAction: 'FLUTTER_NOTIFICATION_CLICK'
        }
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: title || 'Simnetiq Update',
              body: aiGeneratedBody
            },
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    // Send notifications
    const messaging = admin.messaging();
    let successCount = 0;
    let failureCount = 0;
    const failedTokens = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      try {
        const individualMessage = {
          ...message,
          token: token
        };
        
        await messaging.send(individualMessage);
        successCount++;
      } catch {
      
        failedTokens.push(token);
        failureCount++;
      }
    }



    return NextResponse.json({
      success: true,
      generated: {
        title: title || 'Simnetiq Update',
        body: aiGeneratedBody
      },
      sent: {
        total: tokens.length,
        success: successCount,
        failed: failureCount,
        failedTokens
      }
    });

  } catch {
  
    return NextResponse.json(
      { 
        error: 'Failed to generate and send AI notification',
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ai-notification
 * Get example prompts and test the AI generation
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'examples') {
    return NextResponse.json({
      success: true,
      examples: [
        {
          category: 'Travel Tips',
          prompts: [
            'Create a notification about saving money on international roaming',
            'Write a tip about activating eSIM before travel',
            'Share advice about data usage while traveling abroad'
          ]
        },
        {
          category: 'Promotional',
          prompts: [
            'Create an exciting notification about new country coverage',
            'Write about a flash sale on data plans',
            'Announce a weekend special offer'
          ]
        },
        {
          category: 'Engagement',
          prompts: [
            'Encourage users to refer friends with a friendly message',
            'Remind users to check their data balance',
            'Invite users to share their travel experience'
          ]
        },
        {
          category: 'Educational',
          prompts: [
            'Explain what eSIM is in simple terms',
            'Share how to check if device supports eSIM',
            'Describe benefits of eSIM over physical SIM'
          ]
        }
      ]
    });
  }

  return NextResponse.json({
    success: true,
    info: 'AI Notification Generator API',
    endpoints: {
      POST: 'Generate and send AI notification',
      'GET?action=examples': 'Get example prompts'
    }
  });
}

