// Browser-like test for notification sending
// This simulates what the web dashboard should be doing

async function testBrowserLikeRequest() {
  try {
    // Step 1: Get FCM tokens (like the web dashboard does)
    const tokensResponse = await fetch('/api/fcm-tokens');
    
    if (!tokensResponse.ok) {
      throw new Error(`FCM tokens fetch failed: ${tokensResponse.status} ${tokensResponse.statusText}`);
    }
    
    const tokensData = await tokensResponse.json();
    
    if (!tokensData.success || !tokensData.tokens?.length) {
      throw new Error('No FCM tokens available');
    }
    
    const tokens = tokensData.tokens.map(token => token.token);
    
    // Step 2: Send notification (like the web dashboard does)
    const notificationData = {
      title: 'Browser Test Notification',
      body: 'Testing from browser-like environment',
      tokens: tokens,
      data: {
        type: 'browser_test',
        timestamp: Date.now().toString(),
        sentFrom: 'dashboard'
      }
    };
    
    const notificationResponse = await fetch('/api/send-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData)
    });
    
    if (!notificationResponse.ok) {
      const errorText = await notificationResponse.text();
      throw new Error(`Notification send failed: ${notificationResponse.status} ${notificationResponse.statusText} - ${errorText}`);
    }
    
    const result = await notificationResponse.json();
    
    return result;
    
  } catch (error) {
    throw error;
  }
}

// Test if we're in a browser environment
if (typeof window !== 'undefined') {
  testBrowserLikeRequest()
    .then(result => {
    })
    .catch(error => {
    });
} else {
}

// Export for manual testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testBrowserLikeRequest };
}
