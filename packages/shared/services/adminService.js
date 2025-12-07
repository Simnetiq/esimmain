// Admin service for managing user roles and permissions

import { doc, getDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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
 * @param {string} email - Email of the user to make super admin
 * @returns {Promise<boolean>} Success status
 */
export async function createSuperAdmin(email) {
  try {
    // Check if user already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('User not found. Please create the user account first.');
    }

    // Get the user document
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    // Update user role to super_admin
    await updateDoc(doc(db, 'users', userId), {
      role: 'super_admin',
      isSuperAdmin: true,
      adminPermissions: {
        canManageUsers: true,
        canManagePlans: true,
        canManageOrders: true,
        canViewAnalytics: true,
        canManageSettings: true
      },
      updatedAt: new Date()
    });

    return true;
  } catch {
    throw error;
  }
}

/**
 * Create an admin user
 * @param {string} email - Email of the user to make admin
 * @returns {Promise<boolean>} Success status
 */
export async function createAdmin(email) {
  try {
    // Check if user already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('User not found. Please create the user account first.');
    }

    // Get the user document
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    // Update user role to admin
    await updateDoc(doc(db, 'users', userId), {
      role: 'admin',
      isAdmin: true,
      adminPermissions: {
        canManageUsers: true,
        canManagePlans: true,
        canManageOrders: true,
        canViewAnalytics: true,
        canManageSettings: false
      },
      updatedAt: new Date()
    });

    return true;
  } catch {
    throw error;
  }
}

/**
 * Remove admin privileges from a user
 * @param {string} email - Email of the user to remove admin privileges
 * @returns {Promise<boolean>} Success status
 */
export async function removeAdminPrivileges(email) {
  try {
    // Check if user already exists
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      throw new Error('User not found.');
    }

    // Get the user document
    const userDoc = querySnapshot.docs[0];
    const userId = userDoc.id;

    // Update user role to customer
    await updateDoc(doc(db, 'users', userId), {
      role: 'customer',
      isAdmin: false,
      isSuperAdmin: false,
      adminPermissions: null,
      updatedAt: new Date()
    });

    return true;
  } catch {
    throw error;
  }
}

/**
 * Check if user has admin access
 * @param {object} userProfile - User profile object
 * @returns {boolean} True if user has admin access
 */
export function hasAdminAccess(userProfile) {
  if (!userProfile) return false;
  return userProfile.role === 'admin' || userProfile.role === 'super_admin';
}

/**
 * Check if user has super admin access
 * @param {object} userProfile - User profile object
 * @returns {boolean} True if user has super admin access
 */
export function hasSuperAdminAccess(userProfile) {
  if (!userProfile) return false;
  return userProfile.role === 'super_admin';
}

/**
 * Check if user has specific admin permission
 * @param {object} userProfile - User profile object
 * @param {string} permission - Permission to check
 * @returns {boolean} True if user has the permission
 */
export function hasAdminPermission(userProfile, permission) {
  if (!userProfile || !userProfile.adminPermissions) return false;
  
  // Super admin has all permissions
  if (userProfile.role === 'super_admin') return true;
  
  // Check specific permission
  return userProfile.adminPermissions[permission] === true;
}

/**
 * Get user role from Firestore
 * @param {string} userId - User ID
 * @returns {Promise<string>} User role
 */
export async function getUserRole(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      return userDoc.data().role || ADMIN_ROLES.USER;
    }
    return ADMIN_ROLES.USER;
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