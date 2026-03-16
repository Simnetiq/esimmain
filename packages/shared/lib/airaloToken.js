/**
 * Shared Airalo OAuth token cache.
 * Airalo tokens are valid for 24 hours; we cache for 23 hours to be safe.
 * The /v2/token endpoint is rate-limited to 5 requests per minute.
 */

let tokenCache = {
  token: null,
  expiresAt: 0,
  baseUrl: null,
};

const CACHE_DURATION_MS = 23 * 60 * 60 * 1000; // 23 hours

/**
 * Get a cached Airalo access token, or fetch a new one if expired.
 * @param {string} baseUrl - Airalo API base URL
 * @param {string} clientId
 * @param {string} clientSecret
 * @returns {Promise<string>} access token
 */
export async function getAiraloToken(baseUrl, clientId, clientSecret) {
  const now = Date.now();

  if (tokenCache.token && tokenCache.expiresAt > now && tokenCache.baseUrl === baseUrl) {
    return tokenCache.token;
  }

  const response = await fetch(`${baseUrl}/v2/token`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Airalo auth failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const token = data.data?.access_token;
  if (!token) throw new Error('No access_token in Airalo response');

  tokenCache = {
    token,
    expiresAt: now + CACHE_DURATION_MS,
    baseUrl,
  };

  return token;
}

/**
 * Resolve Airalo credentials and base URL from environment variables.
 * @returns {{ clientId: string, clientSecret: string, baseUrl: string }}
 */
export function getAiraloCredentials() {
  const airaloMode = process.env.AIRALO_MODE || 'production';
  const isSandbox = airaloMode === 'sandbox' || airaloMode === 'test';

  const clientId = isSandbox
    ? (process.env.AIRALO_CLIENT_ID_SANDBOX || process.env.AIRALO_CLIENT_ID)
    : process.env.AIRALO_CLIENT_ID;

  const clientSecret = isSandbox
    ? (process.env.AIRALO_CLIENT_SECRET_SANDBOX || process.env.AIRALO_CLIENT_SECRET)
    : process.env.AIRALO_CLIENT_SECRET;

  const baseUrl = isSandbox
    ? (process.env.AIRALO_BASE_URL_SANDBOX || 'https://sandbox-partners-api.airalo.com')
    : (process.env.AIRALO_BASE_URL || 'https://partners-api.airalo.com');

  if (!clientId || !clientSecret) {
    throw new Error('Airalo credentials not configured. Set AIRALO_CLIENT_ID and AIRALO_CLIENT_SECRET.');
  }

  return { clientId, clientSecret, baseUrl };
}
