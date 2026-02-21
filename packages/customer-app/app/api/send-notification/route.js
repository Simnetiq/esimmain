import { NextResponse } from 'next/server';
import { sendFCMMessage, sendFCMToMultiple, sendFCMToTopic } from '@esim/shared/lib/fcm';

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

    const messageBase = {
      notification: {
        title,
        body: messageBody,
        ...(imageUrl && { image: imageUrl })
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
        source: 'dashboard'
      },
      android: {
        priority: 'high',
        notification: { channel_id: 'fcm_notifications', sound: 'default', click_action: 'FLUTTER_NOTIFICATION_CLICK' }
      },
      apns: {
        payload: { aps: { alert: { title, body: messageBody }, sound: 'default', badge: 1 } }
      }
    };

    let response;

    if (topic) {
      const result = await sendFCMToTopic(messageBase, topic);
      response = { messageId: result.name || 'sent', successCount: 1, failureCount: 0 };
    } else {
      response = await sendFCMToMultiple(messageBase, tokens);
    }

    return NextResponse.json({
      success: true,
      messageId: response.messageId || 'multiple',
      sentCount: tokens.length || 1,
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
