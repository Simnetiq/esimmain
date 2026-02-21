/**
 * Lightweight FCM HTTP v1 API client.
 * Uses Google Cloud service account credentials + OAuth2 JWT to call
 * https://fcm.googleapis.com/v1/projects/{projectId}/messages:send
 *
 * Required env vars (Google Cloud service account, not Firebase SDK):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 */
import crypto from 'crypto';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

let cachedToken = null;
let tokenExpiry = 0;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Create a signed JWT and exchange it for a Google OAuth2 access token.
 */
async function getAccessToken(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && now < tokenExpiry - 60) {
    return cachedToken;
  }

  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: FCM_SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    })
  );

  const signInput = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign
    .sign(privateKey, 'base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${signInput}.${signature}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`FCM token exchange failed: ${err}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 3600);
  return cachedToken;
}

/**
 * Send a single FCM message via HTTP v1 API.
 * @param {Object} message - FCM message payload (must include `token` or `topic`)
 * @returns {Promise<Object>} FCM response
 */
export async function sendFCMMessage(message) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FCM credentials missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
  }

  const accessToken = await getAccessToken(clientEmail, privateKey);
  const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const code = err.error?.code || res.status;
    const msg = err.error?.message || res.statusText;
    throw new Error(`FCM send failed (${code}): ${msg}`);
  }

  return res.json();
}

/**
 * Send an FCM message to multiple tokens, collecting results.
 * @param {Object} messageBase - Message without `token` (token added per-recipient)
 * @param {string[]} tokens - Array of FCM device tokens
 * @returns {Promise<{successCount: number, failureCount: number, failedTokens: string[]}>}
 */
export async function sendFCMToMultiple(messageBase, tokens) {
  let successCount = 0;
  let failureCount = 0;
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

  return { successCount, failureCount, failedTokens };
}

/**
 * Send an FCM message to a topic.
 * @param {Object} messageBase - Message without `topic`
 * @param {string} topic - Topic name
 * @returns {Promise<Object>} FCM response
 */
export async function sendFCMToTopic(messageBase, topic) {
  return sendFCMMessage({ ...messageBase, topic });
}
