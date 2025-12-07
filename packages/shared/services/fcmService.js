// FCM Service for sending notifications from dashboard to mobile devices

const FCM_API_BASE_URL = '/api/send-notification';
const FCM_TOKENS_URL = '/api/fcm-tokens';

/**
 * Send FCM notification to specific users
 * @param {Object} notificationData - Notification details
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body
 * @param {string[]} notificationData.userIds - Array of user IDs to send to
 * @param {Object} notificationData.data - Custom data payload
 * @param {string} notificationData.imageUrl - Optional image URL
 * @returns {Promise<Object>} Response with success status and details
 */
export const sendNotificationToUsers = async (notificationData) => {
  try {
    const { title, body, userIds, data = {}, imageUrl } = notificationData;

    if (!title || !body) {
      throw new Error('Title and body are required');
    }

    if (!userIds || userIds.length === 0) {
      throw new Error('At least one user ID is required');
    }

    // Get FCM tokens for the specified users
    const tokens = await getFCMTokensForUsers(userIds);
    
    if (tokens.length === 0) {
      throw new Error('No active FCM tokens found for the specified users');
    }

    // Send notification
    const response = await fetch(FCM_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        tokens,
        data: {
          ...data,
          sentFrom: 'dashboard'
        },
        imageUrl
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send notification');
    }

    return result;
  } catch {
    throw new Error('Failed to send notification');
  }
};

/**
 * Send FCM notification to all users
 * @param {Object} notificationData - Notification details
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body
 * @param {Object} notificationData.data - Custom data payload
 * @param {string} notificationData.imageUrl - Optional image URL
 * @param {number} notificationData.limit - Limit number of users (default: 1000)
 * @returns {Promise<Object>} Response with success status and details
 */
export const sendNotificationToAllUsers = async (notificationData) => {
  try {
    const { title, body, data = {}, imageUrl, limit = 1000 } = notificationData;

    if (!title || !body) {
      throw new Error('Title and body are required');
    }

    // Get all active FCM tokens
    const response = await fetch(`${FCM_TOKENS_URL}?limit=${limit}`);
    const tokensData = await response.json();

    if (!tokensData.success || tokensData.tokens.length === 0) {
      throw new Error('No active FCM tokens found');
    }

    const tokens = tokensData.tokens.map(token => token.token);

    // Send notification
    let sendResponse;
    try {
      sendResponse = await fetch(FCM_API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          body,
          tokens,
          data: {
            ...data,
            sentFrom: 'dashboard'
          },
          imageUrl
        }),
      });
    } catch {
      throw new Error(`Network error: ${fetchError.message}`);
    }

    if (!sendResponse.ok) {
      throw new Error('Failed to send notification');
    }

    return sendResponse.json();
  } catch {
    throw new Error('Failed to send notification');
  }
};

/**
 * Send FCM notification to a topic
 * @param {Object} notificationData - Notification details
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.body - Notification body
 * @param {string} notificationData.topic - Topic name (e.g., 'all_users', 'premium_users')
 * @param {Object} notificationData.data - Custom data payload
 * @param {string} notificationData.imageUrl - Optional image URL
 * @returns {Promise<Object>} Response with success status and details
 */
export const sendNotificationToTopic = async (notificationData) => {
  try {
    const { title, body, topic, data = {}, imageUrl } = notificationData;

    if (!title || !body || !topic) {
      throw new Error('Title, body, and topic are required');
    }

    // Send notification to topic
    const response = await fetch(FCM_API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        topic,
        data: {
          ...data,
          sentFrom: 'dashboard'
        },
        imageUrl
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to send notification');
    }

    return result;
  } catch {
    throw new Error('Failed to send notification');
  }
};

/**
 * Get FCM tokens for specific users
 * @param {string[]} userIds - Array of user IDs
 * @returns {Promise<string[]>} Array of FCM tokens
 */
export const getFCMTokensForUsers = async (userIds) => {
  try {
    const tokens = [];
    
    for (const userId of userIds) {
      const response = await fetch(`${FCM_TOKENS_URL}?userId=${userId}`);
      const data = await response.json();
      
      if (data.success && data.tokens.length > 0) {
        tokens.push(...data.tokens.map(token => token.token));
      }
    }

    return [...new Set(tokens)]; // Remove duplicates
  } catch {
    return [];
  }
};

/**
 * Get FCM token statistics
 * @returns {Promise<Object>} Token statistics
 */
export const getFCMTokenStats = async () => {
  try {
    const response = await fetch(FCM_TOKENS_URL);
    const data = await response.json();

    if (!data.success) {
      throw new Error('Failed to fetch token stats');
    }

    const tokens = data.tokens;
    const stats = {
      totalTokens: tokens.length,
      platforms: {
        ios: tokens.filter(t => t.platform === 'ios').length,
        android: tokens.filter(t => t.platform === 'android').length,
        unknown: tokens.filter(t => t.platform === 'unknown').length
      },
      activeTokens: tokens.filter(t => t.active).length,
      inactiveTokens: tokens.filter(t => !t.active).length
    };

    return stats;
  } catch {
    throw new Error('Failed to fetch token stats');
  }
};
