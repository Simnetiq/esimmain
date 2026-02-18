// Admin service for managing user roles and permissions - Supabase version

import { getSupabase, isSupabaseAvailable } from '../lib/supabase';

// Admin roles constants
export const ADMIN_ROLES = {
  USER: 'customer',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

// Admin permissions constants
export const ADMIN_PERMISSIONS = {
  [ADMIN_ROLES.USER]: [],
  [ADMIN_ROLES.ADMIN]: [
    'manage_users',
    'manage_plans',
    'manage_orders',
    'view_analytics',
    'manage_blog',
    'manage_newsletter',
    'manage_contact_requests'
  ],
  [ADMIN_ROLES.SUPER_ADMIN]: [
    'manage_admins',
    'manage_users',
    'manage_plans',
    'manage_orders',
    'view_analytics',
    'manage_config',
    'delete_data',
    'manage_blog',
    'manage_newsletter',
    'manage_contact_requests'
  ]
};

/**
 * Create a super admin user
 */
export async function createSuperAdmin(email) {
  try {
    const supabase = getSupabase();
    
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (fetchError) throw fetchError;
    if (!users || users.length === 0) {
      throw new Error('User not found. Please create the user account first.');
    }

    const userId = users[0].id;

    const { error } = await supabase
      .from('users')
      .update({
        role: 'super_admin',
        is_super_admin: true,
        admin_permissions: {
          canManageUsers: true,
          canManagePlans: true,
          canManageOrders: true,
          canViewAnalytics: true,
          canManageSettings: true
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Create an admin user
 */
export async function createAdmin(email) {
  try {
    const supabase = getSupabase();
    
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (fetchError) throw fetchError;
    if (!users || users.length === 0) {
      throw new Error('User not found. Please create the user account first.');
    }

    const userId = users[0].id;

    const { error } = await supabase
      .from('users')
      .update({
        role: 'admin',
        is_admin: true,
        admin_permissions: {
          canManageUsers: true,
          canManagePlans: true,
          canManageOrders: true,
          canViewAnalytics: true,
          canManageSettings: false
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Remove admin privileges from a user
 */
export async function removeAdminPrivileges(email) {
  try {
    const supabase = getSupabase();
    
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (fetchError) throw fetchError;
    if (!users || users.length === 0) {
      throw new Error('User not found.');
    }

    const userId = users[0].id;

    const { error } = await supabase
      .from('users')
      .update({
        role: 'customer',
        is_admin: false,
        is_super_admin: false,
        admin_permissions: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    throw error;
  }
}

/**
 * Check if user has admin access
 */
export function hasAdminAccess(userProfile) {
  if (!userProfile) return false;
  return userProfile.role === 'admin' || userProfile.role === 'super_admin';
}

/**
 * Check if user has super admin access
 */
export function hasSuperAdminAccess(userProfile) {
  if (!userProfile) return false;
  return userProfile.role === 'super_admin';
}

/**
 * Check if user has specific admin permission
 */
export function hasAdminPermission(userProfile, permission) {
  if (!userProfile || !userProfile.adminPermissions && !userProfile.admin_permissions) return false;
  if (userProfile.role === 'super_admin') return true;
  const perms = userProfile.adminPermissions || userProfile.admin_permissions;
  return perms?.[permission] === true;
}

/**
 * Get user role from Supabase
 */
export async function getUserRole(userId) {
  if (!userId) return ADMIN_ROLES.USER;
  try {
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return ADMIN_ROLES.USER;
      console.error('Error getting user role:', error);
      return ADMIN_ROLES.USER;
    }

    return data?.role || ADMIN_ROLES.USER;
  } catch (error) {
    console.error('Error getting user role:', error);
    return ADMIN_ROLES.USER;
  }
}

// Export adminService object for compatibility
export const adminService = {
  getUserRole,
  createSuperAdmin,
  createAdmin,
  removeAdminPrivileges,
  hasAdminAccess,
  hasSuperAdminAccess,
  hasAdminPermission
};
