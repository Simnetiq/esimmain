'use client';

import React, { useState, useEffect, useCallback } from 'react';
import supabase from '../lib/supabase';
import { formatPrice } from '@esim/shared/utils/priceUtils';
import {
  DollarSign, ShoppingCart, TrendingUp, CheckCircle, Clock,
  XCircle, RefreshCw, ExternalLink, MapPin, Search, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

function statusBadge(order) {
  const s = order.status;
  const ps = order.payment_status;
  if (s === 'completed')                          return { label: 'Completed',  cls: 'bg-green-100 text-green-700' };
  if (s === 'processing')                         return { label: 'Processing', cls: 'bg-blue-100 text-blue-700' };
  if (s === 'blocked' || s === 'fraud_blocked')   return { label: 'Blocked',    cls: 'bg-red-100 text-red-700' };
  if (s === 'disputed')                           return { label: 'Disputed',   cls: 'bg-orange-100 text-orange-700' };
  if (s === 'refunded')                           return { label: 'Refunded',   cls: 'bg-yellow-100 text-yellow-700' };
  if (s === 'failed' || ps === 'failed')          return { label: 'Failed',     cls: 'bg-red-100 text-red-500' };
  if (s === 'esim_creation_failed')               return { label: 'eSIM Error', cls: 'bg-orange-100 text-orange-600' };
  if (s === 'payment_mismatch')                   return { label: 'Mismatch',   cls: 'bg-red-100 text-red-600' };
  return                                                 { label: s || 'Pending', cls: 'bg-gray-100 text-gray-600' };
}

const PAGE_SIZE = 50;

// ─── Component ────────────────────────────────────────────────────────────────

const FinancesManagement = () => {
  const [orders, setOrders]             = useState([]);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(0);
  const [hasMore, setHasMore]           = useState(true);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedOrder, setExpandedOrder] = useState(null);

  const [stats, setStats] = useState({
    totalOrders: 0,
    completedOrders: 0,
    totalRevenue: 0,
    promoRevenue: 0,      // revenue from promo-discounted orders
    byCountry: [],
  });

  // ── Load orders ─────────────────────────────────────────────────────────────

  const loadOrders = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const startPage = reset ? 0 : page;
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .range(startPage * PAGE_SIZE, startPage * PAGE_SIZE + PAGE_SIZE - 1);

      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      if (search.trim()) {
        query = query.or(
          `customer_email.ilike.%${search}%,plan_name.ilike.%${search}%,country_code.ilike.%${search}%,id.ilike.%${search}%`
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const rows = data || [];
      setOrders(reset ? rows : prev => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
      if (reset) setPage(0);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  // ── Load stats (separate query — all time, no pagination) ─────────────────

  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('status, payment_status, amount, price, country_code, country, price_validation')
        .in('status', ['completed', 'processing']);

      if (error) throw error;

      let revenue = 0, promoRevenue = 0, byCountry = {};

      (data || []).forEach(o => {
        const isPaid = o.status === 'completed' || o.payment_status === 'completed';
        const amt = parseFloat(o.amount ?? o.price) || 0;
        if (isPaid) {
          revenue += amt;
          const pv = o.price_validation;
          if (pv?.promoCode) promoRevenue += amt;
          const cc = o.country_code || o.country || 'Unknown';
          byCountry[cc] = byCountry[cc] || { count: 0, revenue: 0 };
          byCountry[cc].count++;
          byCountry[cc].revenue += amt;
        }
      });

      setStats({
        totalOrders:     data?.length || 0,
        completedOrders: (data || []).filter(o => o.status === 'completed').length,
        totalRevenue:    revenue,
        promoRevenue,
        byCountry: Object.entries(byCountry)
          .map(([c, v]) => ({ country: c, ...v }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
      });
    } catch (err) {
      console.error('Stats load error:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadOrders(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, search]);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Finances</h2>
          <p className="text-gray-500 mt-1 text-sm">Revenue overview and transaction history</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded-lg text-sm font-medium"
          >
            Stripe <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <a href="https://app.partners.airalo.com/home" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-sm font-medium"
          >
            Airalo <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => { loadStats(); loadOrders(true); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders',   value: stats.totalOrders,                    icon: ShoppingCart, color: 'text-blue-600',   bg: 'bg-blue-50'   },
          { label: 'Completed',      value: stats.completedOrders,                icon: CheckCircle,  color: 'text-green-600',  bg: 'bg-green-50'  },
          { label: 'Total Revenue',  value: formatPrice(stats.totalRevenue),      icon: DollarSign,   color: 'text-teal-600',   bg: 'bg-teal-50'   },
          { label: 'Promo Revenue',  value: formatPrice(stats.promoRevenue),      icon: TrendingUp,   color: 'text-purple-600', bg: 'bg-purple-50' },
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

      {/* Revenue by Country */}
      {stats.byCountry.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-700">Revenue by Country (Top 10)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead>
                <tr>
                  {['Country', 'Orders', 'Revenue'].map(h => (
                    <th key={h} className="pb-2 text-left text-xs font-medium text-gray-500 pr-8">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.byCountry.map(row => (
                  <tr key={row.country}>
                    <td className="py-2 pr-8 text-sm font-medium text-gray-900">{row.country}</td>
                    <td className="py-2 pr-8 text-sm text-gray-600">{row.count}</td>
                    <td className="py-2 text-sm font-semibold text-green-600">{formatPrice(row.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <h3 className="text-sm font-semibold text-gray-700 flex-shrink-0">Transactions</h3>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Email, plan, country or order ID…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          >
            {['all', 'completed', 'processing', 'failed', 'blocked', 'refunded', 'disputed', 'esim_creation_failed'].map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>
            ))}
          </select>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    {['Order', 'Customer', 'Plan', 'Amount', 'Promo', 'Country', 'Status', 'Date', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.map(order => {
                    const badge = statusBadge(order);
                    const amount = parseFloat(order.amount ?? order.price) || 0;
                    const pv = order.price_validation || {};
                    const promoCode = pv.promoCode;
                    const promoPct  = pv.promoDiscountPct;
                    const isExpanded = expandedOrder === order.id;

                    return (
                      <React.Fragment key={order.id}>
                        <tr
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        >
                          {/* Order ID */}
                          <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px]">
                            <span title={order.id}>{order.id?.substring(0, 16)}…</span>
                          </td>

                          {/* Customer */}
                          <td className="px-4 py-3 text-sm text-gray-900 max-w-[180px]">
                            <span className="truncate block" title={order.customer_email}>
                              {order.customer_email || order.user_email || '—'}
                            </span>
                          </td>

                          {/* Plan */}
                          <td className="px-4 py-3 text-sm text-gray-700 max-w-[160px]">
                            <span className="truncate block">{order.plan_name || order.customer_name || '—'}</span>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {amount > 0 ? formatPrice(amount) : '—'}
                            <span className="text-xs font-normal text-gray-400 ml-1">
                              {(order.currency || 'USD').toUpperCase()}
                            </span>
                          </td>

                          {/* Promo */}
                          <td className="px-4 py-3">
                            {promoCode ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-mono font-semibold">
                                🏷 {promoCode}
                                {promoPct ? <span className="text-purple-500">-{promoPct}%</span> : null}
                              </span>
                            ) : (
                              <span className="text-gray-300 text-xs">—</span>
                            )}
                          </td>

                          {/* Country */}
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {order.country_code || order.country || '—'}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${badge.cls}`}>
                              {badge.label}
                            </span>
                            {order.esim_created && (
                              <p className="text-xs text-green-500 mt-0.5 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> eSIM sent
                              </p>
                            )}
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {fmtDate(order.created_at)}
                          </td>

                          {/* Expand indicator */}
                          <td className="px-4 py-3">
                            <ChevronDown className={`w-4 h-4 text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </td>
                        </tr>

                        {/* Expanded row — order details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="px-8 py-4 bg-gray-50 border-t border-gray-100">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-2 text-xs">
                                {[
                                  ['Full Order ID',     order.id],
                                  ['Unique Order ID',   order.unique_order_id],
                                  ['Payment Status',    order.payment_status],
                                  ['Platform',          order.platform || order.source],
                                  ['DB Price',          pv.databasePrice ? formatPrice(pv.databasePrice) : '—'],
                                  ['Base Price',        pv.basePrice ? formatPrice(pv.basePrice) : '—'],
                                  ['Referral Discount', pv.hasReferralDiscount ? `${pv.referralDiscountPct}%` : 'No'],
                                  ['Promo Code',        pv.promoCode || 'None'],
                                  ['Promo Discount',    pv.promoDiscountPct ? `${pv.promoDiscountPct}%` : '—'],
                                  ['Stripe Session',    order.stripe_session_id],
                                  ['Stripe PI',         order.stripe_payment_intent_id],
                                  ['ICCID',             order.iccid],
                                  ['Payment Method',    order.payment_method_brand ? `${order.payment_method_brand} ****${order.payment_method_last4}` : '—'],
                                  ['Completed At',      fmtDate(order.payment_completed_at || order.completed_at)],
                                  ['Airalo Order',      order.airalo_order_id],
                                  ['Error',             order.esim_error || order.failure_reason || order.error_message || '—'],
                                ].map(([label, val]) => (
                                  <div key={label}>
                                    <span className="text-gray-400">{label}: </span>
                                    <span className="text-gray-700 font-mono break-all">{val || '—'}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="px-4 py-3 border-t border-gray-100 text-center">
                <button
                  onClick={() => { setPage(p => p + 1); loadOrders(false); }}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading…' : `Load more (showing ${orders.length})`}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FinancesManagement;
