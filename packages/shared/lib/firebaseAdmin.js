import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let adminClient = null;
let initializationError = null;

/**
 * Initialize Supabase Admin client (server-side only)
 * Replaces Firebase Admin SDK initialization
 */
export function initializeFirebaseAdmin() {
  if (adminClient) return;
  if (initializationError) throw initializationError;

  if (!supabaseUrl || !supabaseServiceKey) {
    const missing = [];
    if (!supabaseUrl) missing.push('SUPABASE_URL');
    if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    initializationError = new Error(
      `Supabase Admin credentials missing: ${missing.join(', ')}. Please check your environment variables.`
    );
    console.error('❌', initializationError.message);
    throw initializationError;
  }

  try {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  } catch (error) {
    initializationError = new Error(`Failed to initialize Supabase Admin: ${error.message}`);
    console.error('❌', initializationError.message);
    throw initializationError;
  }
}

/**
 * Get Supabase Admin client (replaces getAdminDb)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getAdminDb() {
  initializeFirebaseAdmin();
  return adminClient;
}

/**
 * Get Admin Auth - Supabase admin auth operations
 * @returns {{ updateUser: Function }}
 */
export function getAdminAuth() {
  initializeFirebaseAdmin();
  return adminClient.auth.admin;
}

/**
 * Check if admin is initialized
 */
export function isAdminInitialized() {
  return adminClient !== null;
}

export default adminClient;
