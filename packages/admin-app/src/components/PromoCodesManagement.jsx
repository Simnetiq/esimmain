'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@esim/shared/contexts/AuthContext';
import supabase from '../lib/supabase';
import {
  getAllPromoCodes,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  togglePromoCode,
} from '@esim/shared/services/promoCodeService';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import {
  Tag, Plus, Edit2, Trash2, X, Calendar, Percent,
  ToggleLeft, ToggleRight, RefreshCw, ChevronDown, ChevronRight,
  Users, CheckCircle, Clock, XCircle, DollarSign, TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const fmtDatetime = (d) => d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function statusBadge(promo) {
  if (!promo.enabled) return { label: 'Disabled', cls: 'bg-gray-100 text-gray-600' };
  const now = new Date();
  if (promo.validFrom && new Date(promo.validFrom) > now) return { label: 'Scheduled', cls: 'bg-yellow-100 text-yellow-700' };
  if (promo.validUntil && new Date(promo.validUntil) < now) return { label: 'Expired', cls: 'bg-red-100 text-red-600' };
  if (promo.maxGlobalUses && promo.usageCount >= promo.maxGlobalUses) return { label: 'Exhausted', cls: 'bg-orange-100 text-orange-600' };
  return { label: 'Active', cls: 'bg-green-100 text-green-700' };
}

function redemptionStatusIcon(status) {
  switch (status) {
    case 'confirmed': return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'reserved':  return <Clock className="w-4 h-4 text-yellow-500" />;
    case 'failed':    return <XCircle className="w-4 h-4 text-red-500" />;
    case 'expired':   return <XCircle className="w-4 h-4 text-gray-400" />;
    default:          return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

const EMPTY_FORM = {
  code: '', name: '', discountPercentage: '', countries: [],
  validFrom: '', validUntil: '', enabled: true,
  maxGlobalUses: '', maxUsesPerUser: '1', minOrderAmount: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PromoCodesManagement = () => {
  const { currentUser } = useAuth();

  // Sub-tab: 'codes' | 'redemptions'
  const [subTab, setSubTab] = useState('codes');

  // Promo codes
  const [promoCodes, setPromoCodes] = useState([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [expandedCode, setExpandedCode] = useState(null);

  // Redemptions
  const [redemptions, setRedemptions] = useState([]);
  const [redemptionsLoading, setRedemptionsLoading] = useState(false);
  const [redemptionFilter, setRedemptionFilter] = useState('all'); // 'all' | 'confirmed' | 'reserved' | 'failed'
  const [redemptionSearch, setRedemptionSearch] = useState('');

  // Modal / form
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [promoForm, setPromoForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Country selector
  const [countries, setCountries] = useState([]);
  const [selectedCountries, setSelectedCountries] = useState([]);
  const [countrySearch, setCountrySearch] = useState('');

  // Stats
  const [stats, setStats] = useState({ total: 0, active: 0, redemptions: 0, saved: 0 });

  // ── Load data ───────────────────────────────────────────────────────────────

  const loadPromoCodes = useCallback(async () => {
    setPromoLoading(true);
    try {
      const codes = await getAllPromoCodes();
      setPromoCodes(codes);
      // Compute stats from codes + redemptions loaded separately
    } catch (err) {
      toast.error('Failed to load promo codes');
    } finally {
      setPromoLoading(false);
    }
  }, []);

  const loadRedemptions = useCallback(async () => {
    setRedemptionsLoading(true);
    try {
      const { data, error } = await supabase
        .from('promo_redemptions')
        .select('*')
        .order('redeemed_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setRedemptions(data || []);

      // Compute summary stats
      const confirmed = (data || []).filter(r => r.status === 'confirmed');
      const totalSaved = confirmed.reduce((s, r) => s + parseFloat(r.discount_amount || 0), 0);
      setStats(prev => ({ ...prev, redemptions: confirmed.length, saved: totalSaved }));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load redemptions');
    } finally {
      setRedemptionsLoading(false);
    }
  }, []);

  const loadCountries = useCallback(async () => {
    const { data } = await supabase
      .from('countries')
      .select('id, iso_code, name')
      .eq('is_active', true)
      .order('name');
    setCountries((data || []).map(r => ({ id: r.id, code: r.iso_code || r.id, name: r.name })));
  }, []);

  useEffect(() => {
    loadPromoCodes();
    loadRedemptions();
    loadCountries();
  }, [loadPromoCodes, loadRedemptions, loadCountries]);

  // Update stats when promo codes load
  useEffect(() => {
    const now = new Date();
    const active = promoCodes.filter(p => {
      if (!p.enabled) return false;
      if (p.validFrom && new Date(p.validFrom) > now) return false;
      if (p.validUntil && new Date(p.validUntil) < now) return false;
      if (p.maxGlobalUses && p.usageCount >= p.maxGlobalUses) return false;
      return true;
    }).length;
    setStats(prev => ({ ...prev, total: promoCodes.length, active }));
  }, [promoCodes]);

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingPromo(null);
    setPromoForm(EMPTY_FORM);
    setSelectedCountries([]);
    setShowModal(true);
  };

  const openEdit = (promo) => {
    setEditingPromo(promo);
    setPromoForm({
      code:               promo.code,
      name:               promo.name || '',
      discountPercentage: promo.discountPercentage?.toString() || '',
      countries:          promo.countries || [],
      validFrom:          promo.validFrom  ? promo.validFrom.toISOString().split('T')[0]  : '',
      validUntil:         promo.validUntil ? promo.validUntil.toISOString().split('T')[0] : '',
      enabled:            promo.enabled,
      maxGlobalUses:      promo.maxGlobalUses  != null ? promo.maxGlobalUses.toString()  : '',
      maxUsesPerUser:     promo.maxUsesPerUser != null ? promo.maxUsesPerUser.toString() : '1',
      minOrderAmount:     promo.minOrderAmount != null ? promo.minOrderAmount.toString() : '',
    });
    setSelectedCountries(countries.filter(c => promo.countries?.includes(c.code)));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPromo(null);
    setPromoForm(EMPTY_FORM);
    setSelectedCountries([]);
    setCountrySearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!promoForm.code.trim()) return toast.error('Promo code is required');
    if (!promoForm.discountPercentage || parseFloat(promoForm.discountPercentage) <= 0)
      return toast.error('Enter a valid discount percentage');

    setSaving(true);
    try {
      const data = {
        ...promoForm,
        countries:      selectedCountries.map(c => c.code),
        discountType:   'percentage',
        maxGlobalUses:  promoForm.maxGlobalUses  ? parseInt(promoForm.maxGlobalUses)   : null,
        maxUsesPerUser: promoForm.maxUsesPerUser ? parseInt(promoForm.maxUsesPerUser)  : 1,
        minOrderAmount: promoForm.minOrderAmount ? parseFloat(promoForm.minOrderAmount): null,
        createdBy:      currentUser?.id,
      };
      const fn = editingPromo ? updatePromoCode(editingPromo.id, data) : createPromoCode(data);
      const result = await fn;
      if (!result.success) throw new Error(result.error);
      toast.success(editingPromo ? 'Promo updated' : 'Promo created');
      closeModal();
      loadPromoCodes();
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (promo) => {
    if (!window.confirm(`Delete "${promo.code}"? This cannot be undone.`)) return;
    const result = await deletePromoCode(promo.id);
    if (result.success) { toast.success('Deleted'); loadPromoCodes(); }
    else toast.error('Failed to delete');
  };

  const handleToggle = async (promo) => {
    const result = await togglePromoCode(promo.id, !promo.enabled);
    if (result.success) { toast.success(promo.enabled ? 'Disabled' : 'Enabled'); loadPromoCodes(); }
    else toast.error('Failed to toggle');
  };

  // ── Country selector helpers ─────────────────────────────────────────────────

  const filteredCountries = countries.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase()) &&
    !selectedCountries.find(s => s.code === c.code)
  );

  // ── Redemptions helpers ──────────────────────────────────────────────────────

  const filteredRedemptions = redemptions.filter(r => {
    if (redemptionFilter !== 'all' && r.status !== redemptionFilter) return false;
    if (redemptionSearch) {
      const q = redemptionSearch.toLowerCase();
      return (
        r.promo_code?.toLowerCase().includes(q) ||
        r.user_email?.toLowerCase().includes(q) ||
        r.order_id?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Redemptions grouped per promo code (for expand view)
  const redemptionsByCode = (codeId) =>
    redemptions.filter(r => r.promo_code_id === codeId);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Codes</h2>
          <p className="text-gray-500 mt-1 text-sm">Manage discounts and track redemptions</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadPromoCodes(); loadRedemptions(); }}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Code
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Codes',    value: stats.total,       icon: Tag,        color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Active Now',     value: stats.active,      icon: TrendingUp, color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Confirmed Uses', value: stats.redemptions, icon: Users,      color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Total Saved',    value: formatPrice(stats.saved), icon: DollarSign, color: 'text-teal-600', bg: 'bg-teal-50' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-3">
            <div className={`w-10 h-10 ${s.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Sub-tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          {[
            { id: 'codes',       label: `Codes (${promoCodes.length})` },
            { id: 'redemptions', label: `Redemptions (${redemptions.filter(r => r.status === 'confirmed').length})` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                subTab === t.id
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── CODES TAB ── */}
      {subTab === 'codes' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {promoLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : promoCodes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">No promo codes yet</p>
              <p className="text-sm mt-1">Create your first code to start offering discounts</p>
              <button onClick={openCreate} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm hover:bg-gray-800">
                Create Code
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Code', 'Discount', 'Countries', 'Valid Period', 'Limits', 'Status', 'Uses', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {promoCodes.map(promo => {
                    const badge = statusBadge(promo);
                    const codeRedemptions = redemptionsByCode(promo.id);
                    const confirmed = codeRedemptions.filter(r => r.status === 'confirmed').length;
                    const isExpanded = expandedCode === promo.id;

                    return (
                      <React.Fragment key={promo.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedCode(isExpanded ? null : promo.id)}
                        >
                          {/* Code + Name */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {isExpanded
                                ? <ChevronDown className="w-3 h-3 text-gray-400" />
                                : <ChevronRight className="w-3 h-3 text-gray-400" />
                              }
                              <div>
                                <span className="font-mono font-bold text-gray-900 text-sm">{promo.code}</span>
                                {promo.name && promo.name !== promo.code && (
                                  <p className="text-xs text-gray-400">{promo.name}</p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Discount */}
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                              <Percent className="w-3 h-3" />
                              {promo.discountPercentage}%
                            </span>
                          </td>

                          {/* Countries */}
                          <td className="px-4 py-3 max-w-[160px]">
                            {promo.countries?.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {promo.countries.slice(0, 3).map(c => (
                                  <span key={c} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{c}</span>
                                ))}
                                {promo.countries.length > 3 && (
                                  <span className="text-xs text-gray-400">+{promo.countries.length - 3}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">All countries</span>
                            )}
                          </td>

                          {/* Valid Period */}
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {promo.validFrom || promo.validUntil ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-gray-400" />
                                <span className="text-xs">
                                  {promo.validFrom ? fmtDate(promo.validFrom) : '∞'} →{' '}
                                  {promo.validUntil ? fmtDate(promo.validUntil) : '∞'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No limit</span>
                            )}
                          </td>

                          {/* Limits */}
                          <td className="px-4 py-3 text-xs text-gray-500">
                            <div>
                              {promo.maxGlobalUses != null
                                ? <span>Max {promo.maxGlobalUses} total</span>
                                : <span className="text-gray-300">Unlimited total</span>
                              }
                            </div>
                            <div>
                              {promo.maxUsesPerUser != null
                                ? <span>{promo.maxUsesPerUser}×/user</span>
                                : <span className="text-gray-300">Unlimited/user</span>
                              }
                            </div>
                            {promo.minOrderAmount != null && (
                              <div className="text-blue-600">Min ${promo.minOrderAmount}</div>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                          </td>

                          {/* Uses */}
                          <td className="px-4 py-3 text-sm">
                            <span className={
                              promo.maxGlobalUses && promo.usageCount >= promo.maxGlobalUses
                                ? 'text-red-600 font-semibold' : 'text-gray-900'
                            }>
                              {promo.usageCount || 0}
                              {promo.maxGlobalUses ? `/${promo.maxGlobalUses}` : ''}
                            </span>
                            {confirmed > 0 && (
                              <p className="text-xs text-green-600">{confirmed} confirmed</p>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleToggle(promo)}
                                className="p-1.5 text-gray-400 hover:text-gray-700 rounded"
                                title={promo.enabled ? 'Disable' : 'Enable'}
                              >
                                {promo.enabled
                                  ? <ToggleRight className="w-5 h-5 text-green-600" />
                                  : <ToggleLeft className="w-5 h-5" />
                                }
                              </button>
                              <button
                                onClick={() => openEdit(promo)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 rounded"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(promo)}
                                className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded — inline redemption history */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={8} className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                                Redemption History — {promo.code}
                              </p>
                              {codeRedemptions.length === 0 ? (
                                <p className="text-sm text-gray-400">No redemptions yet</p>
                              ) : (
                                <table className="min-w-full text-xs">
                                  <thead>
                                    <tr className="text-gray-400 text-left">
                                      <th className="pb-2 pr-4">Status</th>
                                      <th className="pb-2 pr-4">Email</th>
                                      <th className="pb-2 pr-4">Order ID</th>
                                      <th className="pb-2 pr-4">Original</th>
                                      <th className="pb-2 pr-4">Discount</th>
                                      <th className="pb-2 pr-4">Paid</th>
                                      <th className="pb-2">Date</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {codeRedemptions.map(r => (
                                      <tr key={r.id}>
                                        <td className="py-1.5 pr-4">
                                          <div className="flex items-center gap-1">
                                            {redemptionStatusIcon(r.status)}
                                            <span className="capitalize">{r.status}</span>
                                          </div>
                                        </td>
                                        <td className="py-1.5 pr-4 text-gray-700">{r.user_email}</td>
                                        <td className="py-1.5 pr-4 font-mono text-gray-500 max-w-[140px] truncate">{r.order_id}</td>
                                        <td className="py-1.5 pr-4">{formatPrice(r.original_price)}</td>
                                        <td className="py-1.5 pr-4 text-green-700 font-medium">-{formatPrice(r.discount_amount)}</td>
                                        <td className="py-1.5 pr-4 font-semibold">{formatPrice(r.discounted_price)}</td>
                                        <td className="py-1.5 text-gray-400">{fmtDatetime(r.redeemed_at)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── REDEMPTIONS TAB ── */}
      {subTab === 'redemptions' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Filters */}
          <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap gap-3 items-center">
            <input
              type="text"
              placeholder="Search by code, email or order ID..."
              value={redemptionSearch}
              onChange={e => setRedemptionSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <div className="flex gap-1">
              {['all', 'confirmed', 'reserved', 'failed', 'expired'].map(f => (
                <button
                  key={f}
                  onClick={() => setRedemptionFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize ${
                    redemptionFilter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {redemptionsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : filteredRedemptions.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p>No redemptions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Status', 'Code', 'Email', 'Order ID', 'Original', 'Discount', 'Paid', 'Reserved At', 'Confirmed At'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRedemptions.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {redemptionStatusIcon(r.status)}
                          <span className="text-xs capitalize text-gray-700">{r.status}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-gray-900">{r.promo_code}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{r.user_email}</td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px]">
                        <span className="truncate block" title={r.order_id}>{r.order_id?.substring(0, 20)}…</span>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatPrice(r.original_price)}</td>
                      <td className="px-4 py-3 text-sm text-green-700 font-medium">-{formatPrice(r.discount_amount)} ({r.discount_percent}%)</td>
                      <td className="px-4 py-3 text-sm font-semibold">{formatPrice(r.discounted_price)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDatetime(r.redeemed_at)}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {r.confirmed_at
                          ? <span className="text-green-600">{fmtDatetime(r.confirmed_at)}</span>
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                Showing {filteredRedemptions.length} of {redemptions.length} redemptions
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPromo ? 'Edit Promo Code' : 'Create Promo Code'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                <input
                  type="text"
                  value={promoForm.code}
                  onChange={e => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                  placeholder="SUMMER25"
                  maxLength={50}
                  required
                  disabled={!!editingPromo}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg font-mono uppercase focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                />
                {editingPromo && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation</p>}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  value={promoForm.name}
                  onChange={e => setPromoForm({ ...promoForm, name: e.target.value })}
                  placeholder="Summer Sale 25%"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              {/* Discount % */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Percentage *</label>
                <div className="relative">
                  <input
                    type="number" min="1" max="99" step="0.5"
                    value={promoForm.discountPercentage}
                    onChange={e => setPromoForm({ ...promoForm, discountPercentage: e.target.value })}
                    placeholder="25"
                    required
                    className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">%</span>
                </div>
              </div>

              {/* Valid Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                  <input type="date" value={promoForm.validFrom}
                    onChange={e => setPromoForm({ ...promoForm, validFrom: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                  <input type="date" value={promoForm.validUntil}
                    onChange={e => setPromoForm({ ...promoForm, validUntil: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Usage Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Global Limit</label>
                  <input type="number" min="1" value={promoForm.maxGlobalUses}
                    onChange={e => setPromoForm({ ...promoForm, maxGlobalUses: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Total uses allowed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Per-User Limit</label>
                  <input type="number" min="1" value={promoForm.maxUsesPerUser}
                    onChange={e => setPromoForm({ ...promoForm, maxUsesPerUser: e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-xs text-gray-400 mt-0.5">Uses per email</p>
                </div>
              </div>

              {/* Min Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Order (USD)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input type="number" min="0" step="0.01" value={promoForm.minOrderAmount}
                    onChange={e => setPromoForm({ ...promoForm, minOrderAmount: e.target.value })}
                    placeholder="No minimum"
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                </div>
              </div>

              {/* Countries */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Countries <span className="text-gray-400 font-normal">(leave empty = all)</span>
                </label>
                {selectedCountries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedCountries.map(c => (
                      <span key={c.code} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                        {c.name} ({c.code})
                        <button type="button" onClick={() => setSelectedCountries(prev => prev.filter(s => s.code !== c.code))}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    placeholder="Search countries..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  {countrySearch && filteredCountries.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                      {filteredCountries.slice(0, 10).map(c => (
                        <button
                          key={c.code} type="button"
                          onClick={() => { setSelectedCountries(prev => [...prev, c]); setCountrySearch(''); }}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                        >
                          {c.name} ({c.code})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="enabled" checked={promoForm.enabled}
                  onChange={e => setPromoForm({ ...promoForm, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="enabled" className="text-sm text-gray-700">Active immediately</label>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : editingPromo ? 'Update' : 'Create'}
                </button>
                <button type="button" onClick={closeModal}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromoCodesManagement;
