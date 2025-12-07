'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import { collection, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@esim/shared/firebase/config';
import {
  Users,
  Plus,
  X,
  Edit2,
  Trash2,
  Globe,
  ShoppingCart,
  AlertCircle,
  Upload,
  Link,
  Palette,
  FileText
} from 'lucide-react';

const AdminHome = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    fraudAttempts: 0,
    blogPosts: 0,
    lastBlogPost: null,
    loading: true
  });

  const [shortcuts, setShortcuts] = useState([]);

  const [showAddShortcut, setShowAddShortcut] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState(null);
  const [newShortcut, setNewShortcut] = useState({ 
    name: '', 
    description: '',
    link: '', 
    external: true,
    iconType: 'auto', // 'auto', 'custom', 'default'
    customIcon: '',
    borderColor: '#e5e7eb' // default gray border
  });

  // Predefined border colors
  const borderColors = [
    { name: 'Gray', value: '#e5e7eb' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Teal', value: '#14b8a6' },
  ];

  // Get favicon URL from a website URL (Google's favicon service)
  const getFaviconUrl = (url) => {
    try {
      const domain = new URL(url).hostname;
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      return null;
    }
  };


  // Load statistics
  useEffect(() => {
    const loadStats = async () => {
      try {
        // Load users count
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnapshot.size;

        // Load orders count
        const ordersSnapshot = await getDocs(collection(db, 'orders'));
        const totalOrders = ordersSnapshot.size;

        // Load fraud tracking attempts count
        const fraudSnapshot = await getDocs(collection(db, 'fraud_tracking_attempts'));
        const fraudAttempts = fraudSnapshot.size;

        // Load blog posts count and find latest
        const blogSnapshot = await getDocs(collection(db, 'blog'));
        const blogPosts = blogSnapshot.size;
        let lastBlogPost = null;
        
        blogSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const postDate = data.createdAt?.toDate() || data.publishedAt?.toDate();
          if (postDate && (!lastBlogPost || postDate > lastBlogPost)) {
            lastBlogPost = postDate;
          }
        });

        setStats({
          totalUsers,
          totalOrders,
          fraudAttempts,
          blogPosts,
          lastBlogPost,
          loading: false
        });
      } catch (error) {
        console.error('Error loading stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  // Load shortcuts from Firestore (shared across all admins)
  useEffect(() => {
    const shortcutsRef = doc(db, 'adminSettings', 'shortcuts');
    
    const unsubscribe = onSnapshot(shortcutsRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().shortcuts) {
        setShortcuts(docSnap.data().shortcuts);
      }
    }, (error) => {
      console.error('Error loading shortcuts:', error);
    });

    return () => unsubscribe();
  }, []);

  // Save shortcuts to Firestore (shared across all admins)
  const saveShortcuts = async (newShortcuts) => {
    setShortcuts(newShortcuts);
    try {
      const shortcutsRef = doc(db, 'adminSettings', 'shortcuts');
      await setDoc(shortcutsRef, { shortcuts: newShortcuts }, { merge: true });
    } catch (error) {
      console.error('Error saving shortcuts:', error);
    }
  };

  // Add new shortcut
  const handleAddShortcut = () => {
    if (!newShortcut.name || !newShortcut.link) return;

    const shortcut = {
      id: Date.now().toString(),
      name: newShortcut.name,
      description: newShortcut.description || '',
      link: newShortcut.link,
      external: true,
      iconType: newShortcut.iconType || 'auto',
      customIcon: newShortcut.customIcon || '',
      borderColor: newShortcut.borderColor || '#e5e7eb'
    };

    saveShortcuts([...shortcuts, shortcut]);
    setNewShortcut({ name: '', description: '', link: '', external: true, iconType: 'auto', customIcon: '', borderColor: '#e5e7eb' });
    setShowAddShortcut(false);
  };

  // Update shortcut
  const handleUpdateShortcut = () => {
    if (!editingShortcut || !editingShortcut.name || !editingShortcut.link) return;

    const updated = shortcuts.map(s => 
      s.id === editingShortcut.id ? { 
        ...editingShortcut, 
        external: true,
        description: editingShortcut.description || '',
        iconType: editingShortcut.iconType || 'auto',
        customIcon: editingShortcut.customIcon || '',
        borderColor: editingShortcut.borderColor || '#e5e7eb'
      } : s
    );
    saveShortcuts(updated);
    setEditingShortcut(null);
  };

  // Delete shortcut
  const handleDeleteShortcut = (id) => {
    if (window.confirm('Delete this shortcut?')) {
      saveShortcuts(shortcuts.filter(s => s.id !== id));
    }
  };

  // Handle shortcut click
  const handleShortcutClick = (shortcut) => {
    if (shortcut.external) {
      window.open(shortcut.link, '_blank', 'noopener,noreferrer');
    } else {
      onNavigate(shortcut.link);
    }
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome back, {currentUser?.displayName || 'Admin'}!
        </h2>
        <p className="text-gray-600 mt-1">Here&apos;s what&apos;s happening with your platform today.</p>
      </div>

      {/* Statistics Cards - Clickable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigate('users')}
          className="bg-white rounded-lg p-5 hover:shadow-lg transition-all text-left"
          style={{ border: '2px solid #3b82f6' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.loading ? '...' : stats.totalUsers}
              </p>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('finances')}
          className="bg-white rounded-lg p-5 hover:shadow-lg transition-all text-left"
          style={{ border: '2px solid #22c55e' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <ShoppingCart className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.loading ? '...' : stats.totalOrders}
              </p>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('finances')}
          className="bg-white rounded-lg p-5 hover:shadow-lg transition-all text-left"
          style={{ border: '2px solid #ef4444' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.loading ? '...' : stats.fraudAttempts}
              </p>
              <p className="text-sm font-medium text-gray-600">Fraud Attempts</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNavigate('blog')}
          className="bg-white rounded-lg p-5 hover:shadow-lg transition-all text-left"
          style={{ border: '2px solid #a855f7' }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stats.loading ? '...' : stats.blogPosts}
              </p>
              <p className="text-sm font-medium text-gray-600">Blog Posts</p>
              {stats.lastBlogPost && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Last: {stats.lastBlogPost.toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Quick Actions / Shortcuts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Bookmarks</h3>
          <button
            onClick={() => setShowAddShortcut(true)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Bookmark
          </button>
        </div>

        {shortcuts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Globe className="w-10 h-10 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No shortcuts yet. Add your favorite external links!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {shortcuts.map((shortcut) => {
              const iconType = shortcut.iconType || 'auto';
              const faviconUrl = iconType === 'auto' && shortcut.external ? getFaviconUrl(shortcut.link) : null;
              const customIcon = iconType === 'custom' ? shortcut.customIcon : null;
              const borderColor = shortcut.borderColor || '#e5e7eb';
              
              return (
                <div key={shortcut.id} className="relative group">
                  <button
                    onClick={() => handleShortcutClick(shortcut)}
                    className="w-full bg-white rounded-lg p-3 hover:shadow-md transition-all flex items-center gap-3 text-left"
                    style={{ border: `2px solid ${borderColor}` }}
                  >
                    {/* Icon based on type */}
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                      {iconType === 'custom' && customIcon ? (
                        <img 
                          src={customIcon} 
                          alt={shortcut.name}
                          className="w-8 h-8 object-contain"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : iconType === 'auto' && faviconUrl ? (
                        <img 
                          src={faviconUrl} 
                          alt={shortcut.name}
                          className="w-8 h-8"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div className={`w-8 h-8 flex items-center justify-center ${(iconType === 'auto' && faviconUrl) || (iconType === 'custom' && customIcon) ? 'hidden' : ''}`}>
                        <Link className="w-6 h-6 text-gray-400" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{shortcut.name}</p>
                      {shortcut.description && (
                        <p className="text-xs text-gray-500 truncate">{shortcut.description}</p>
                      )}
                    </div>
                  </button>
                  
                  {/* Edit/Delete buttons */}
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingShortcut({
                          ...shortcut,
                          description: shortcut.description || '',
                          iconType: shortcut.iconType || 'auto',
                          customIcon: shortcut.customIcon || '',
                          borderColor: shortcut.borderColor || '#e5e7eb'
                        });
                      }}
                      className="p-1.5 bg-white border border-gray-200 rounded-full hover:bg-gray-50 shadow-sm"
                    >
                      <Edit2 className="w-3 h-3 text-gray-600" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteShortcut(shortcut.id);
                      }}
                      className="p-1.5 bg-white border border-gray-200 rounded-full hover:bg-red-50 shadow-sm"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Shortcut Modal */}
      {showAddShortcut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Bookmark</h3>
              <button
                onClick={() => {
                  setShowAddShortcut(false);
                  setNewShortcut({ name: '', description: '', link: '', external: true, iconType: 'auto', customIcon: '', borderColor: '#e5e7eb' });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newShortcut.name}
                  onChange={(e) => setNewShortcut({ ...newShortcut, name: e.target.value })}
                  placeholder="e.g., Instagram, Firebase Console"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={newShortcut.description}
                  onChange={(e) => setNewShortcut({ ...newShortcut, description: e.target.value })}
                  placeholder="e.g., Check order status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={newShortcut.link}
                  onChange={(e) => setNewShortcut({ ...newShortcut, link: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Icon Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setNewShortcut({ ...newShortcut, iconType: 'auto' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      newShortcut.iconType === 'auto' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Auto-fetch
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewShortcut({ ...newShortcut, iconType: 'custom' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      newShortcut.iconType === 'custom' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Custom URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewShortcut({ ...newShortcut, iconType: 'default' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      newShortcut.iconType === 'default' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Default
                  </button>
                </div>
              </div>

              {/* Custom Icon URL - only show if custom is selected */}
              {newShortcut.iconType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Upload className="w-4 h-4 inline mr-1" />
                    Icon URL
                  </label>
                  <input
                    type="url"
                    value={newShortcut.customIcon}
                    onChange={(e) => setNewShortcut({ ...newShortcut, customIcon: e.target.value })}
                    placeholder="https://example.com/icon.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste a direct link to an image (PNG, JPG, SVG)
                  </p>
                </div>
              )}

              {/* Border Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Border Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {borderColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewShortcut({ ...newShortcut, borderColor: color.value })}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                        newShortcut.borderColor === color.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <div 
                  className="flex items-center gap-3 p-3 bg-white rounded-lg"
                  style={{ border: `2px solid ${newShortcut.borderColor}` }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                    {newShortcut.iconType === 'custom' && newShortcut.customIcon ? (
                      <img src={newShortcut.customIcon} alt="Preview" className="w-8 h-8 object-contain" />
                    ) : newShortcut.iconType === 'auto' && newShortcut.link && getFaviconUrl(newShortcut.link) ? (
                      <img src={getFaviconUrl(newShortcut.link)} alt="Preview" className="w-8 h-8" />
                    ) : (
                      <Link className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{newShortcut.name || 'Name'}</p>
                    {newShortcut.description && (
                      <p className="text-xs text-gray-500 truncate">{newShortcut.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddShortcut}
                  disabled={!newShortcut.name || !newShortcut.link}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                >
                  Add Bookmark
                </button>
                <button
                  onClick={() => {
                    setShowAddShortcut(false);
                    setNewShortcut({ name: '', description: '', link: '', external: true, iconType: 'auto', customIcon: '', borderColor: '#e5e7eb' });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Shortcut Modal */}
      {editingShortcut && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Edit Bookmark</h3>
              <button
                onClick={() => setEditingShortcut(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={editingShortcut.name}
                  onChange={(e) => setEditingShortcut({ ...editingShortcut, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={editingShortcut.description || ''}
                  onChange={(e) => setEditingShortcut({ ...editingShortcut, description: e.target.value })}
                  placeholder="e.g., Check order status"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
                <input
                  type="url"
                  value={editingShortcut.link}
                  onChange={(e) => setEditingShortcut({ ...editingShortcut, link: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Icon Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Icon</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingShortcut({ ...editingShortcut, iconType: 'auto' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      editingShortcut.iconType === 'auto' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Auto-fetch
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingShortcut({ ...editingShortcut, iconType: 'custom' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      editingShortcut.iconType === 'custom' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Custom URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingShortcut({ ...editingShortcut, iconType: 'default' })}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      editingShortcut.iconType === 'default' 
                        ? 'bg-gray-900 text-white border-gray-900' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Default
                  </button>
                </div>
              </div>

              {/* Custom Icon URL */}
              {editingShortcut.iconType === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Upload className="w-4 h-4 inline mr-1" />
                    Icon URL
                  </label>
                  <input
                    type="url"
                    value={editingShortcut.customIcon || ''}
                    onChange={(e) => setEditingShortcut({ ...editingShortcut, customIcon: e.target.value })}
                    placeholder="https://example.com/icon.png"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              )}

              {/* Border Color Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  Border Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {borderColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setEditingShortcut({ ...editingShortcut, borderColor: color.value })}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${
                        editingShortcut.borderColor === color.value ? 'ring-2 ring-offset-2 ring-gray-900' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-2">Preview</p>
                <div 
                  className="flex items-center gap-3 p-3 bg-white rounded-lg"
                  style={{ border: `2px solid ${editingShortcut.borderColor}` }}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                    {editingShortcut.iconType === 'custom' && editingShortcut.customIcon ? (
                      <img src={editingShortcut.customIcon} alt="Preview" className="w-8 h-8 object-contain" />
                    ) : editingShortcut.iconType === 'auto' && editingShortcut.link && getFaviconUrl(editingShortcut.link) ? (
                      <img src={getFaviconUrl(editingShortcut.link)} alt="Preview" className="w-8 h-8" />
                    ) : (
                      <Link className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{editingShortcut.name || 'Name'}</p>
                    {editingShortcut.description && (
                      <p className="text-xs text-gray-500 truncate">{editingShortcut.description}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateShortcut}
                  disabled={!editingShortcut.name || !editingShortcut.link}
                  className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-400 transition-colors"
                >
                  Update
                </button>
                <button
                  onClick={() => setEditingShortcut(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHome;

