import { NextResponse } from 'next/server';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK for FCM (push notifications only)
if (!admin.apps.length) {
  try {
    let credential;
    
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      credential = admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID || 'esim-f0e3e',
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      });
    } else {
      credential = admin.credential.cert('./esim-service.json');
    }

    admin.initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'esim-f0e3e',
    });
  } catch {
    // Ignore initialization errors
  }
}

export async function POST(request) {
  try {
    const requestBody = await request.json();
    const { 
      title, 
      body: messageBody, 
      tokens = [],
      topic,
      data = {},
      imageUrl
    } = requestBody;

    if (!title || !messageBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    if (!tokens.length && !topic) {
      return NextResponse.json({ error: 'Either tokens or topic is required' }, { status: 400 });
    }

    const message = {
      notification: {
        title,
        body: messageBody,
        ...(imageUrl && { imageUrl })
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
        source: 'dashboard'
      },
      android: {
        priority: 'high',
        notification: { channelId: 'fcm_notifications', sound: 'default', clickAction: 'FLUTTER_NOTIFICATION_CLICK' }
      },
      apns: {
        payload: { aps: { alert: { title, body: messageBody }, sound: 'default', badge: 1 } }
      }
    };

    let response;
    const messaging = admin.messaging();

    if (topic) {
      message.topic = topic;
      response = await messaging.send(message);
    } else {
      const results = [];
      let successCount = 0;
      let failureCount = 0;
      const failedTokens = [];

      for (let i = 0; i < tokens.length; i++) {
        try {
          const result = await messaging.send({ ...message, token: tokens[i] });
          results.push({ success: true, messageId: result });
          successCount++;
        } catch (error) {
          results.push({ success: false, error: error.message });
          failedTokens.push(tokens[i]);
          failureCount++;
        }
      }

      response = { results, successCount, failureCount, failedTokens };
    }

    return NextResponse.json({
      success: true,
      messageId: response.messageId || 'multiple',
      sentCount: tokens.length,
      successCount: response.successCount || 1,
      failureCount: response.failureCount || 0,
      details: response
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send notification from web', details: error.message },
      { status: 500 }
    );
  }
}
