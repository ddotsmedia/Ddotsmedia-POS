'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { posApi } from '@/lib/api';
import { format, subDays } from 'date-fns';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid,
} from 'recharts';
import { io } from 'socket.io-client';
import {
  TrendingUp, TrendingDown, ShoppingCart, AlertTriangle,
  Users, ArrowUpRight, ArrowDownRight, Package, Zap,
  DollarSign, Activity, RefreshCw,
} from 'lucide-react';
import clsx from 'clsx';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100';

export default function DashboardPage() {
  const today = new Date();
  const from = format(subDays(today, 29), 'yyyy-MM-dd');
  const to = format(today, 'yyyy-MM-dd');
  const qc = useQueryClient();
  const [liveSales, setLiveSales] = useState<any[]>([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const { data: stats, isLoading } = useQuery({
    queryKey: ['daily-insights'],
    queryFn: () => posApi.getDailyInsights().then((r) => r.data),
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });

  const { data: adminStats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => posApi.getAdminStats().then((r) => r.data),
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });

  const { data: salesReport } = useQuery({
    queryKey: ['sales-report-dashboard', from, to],
    queryFn: () => posApi.getSalesReport({ from, to }).then((r) => r.data),
    staleTime: 10 * 60_000,
  });

  const { data: anomalies } = useQuery({
    queryKey: ['anomalies-dashboard'],
    queryFn: () => posApi.getAnomalies().then((r) => r.data),
    refetchInterval: 15 * 60_000,
    staleTime: 10 * 60_000,
  });

  const chartData = ((salesReport as any)?.byDay ?? []).map((d: any) => ({
    date: format(new Date(d.date), 'MMM d'),
    revenue: Number(d.revenue ?? 0),
    count: Number(d.count ?? 0),
  }));

  const anomalyList: any[] = Array.isArray(anomalies) ? anomalies : [];
  const changePercent = Number((stats as any)?.changePercent ?? 0);
  const topMax = Math.max(...((stats?.topProducts ?? []) as any[]).map((p: any) => Number(p._sum?.total ?? 0)), 1);

  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    if (!accessToken) return;
    const socket = io(`${API_URL}/events`, { auth: { token: accessToken } });
    socket.onAny((event: string, data: any) => {
      if (data?.type === 'SALE_CREATED') {
        setLiveSales((prev) => [data.sale, ...prev].slice(0, 6));
        setLastRefresh(new Date());
        qc.invalidateQueries({ queryKey: ['daily-insights'] });
      }
    });
    return () => { socket.disconnect(); };
  }, []);

  if (isLoading) {
    return (
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm animate-pulse">
              <div className="flex justify-between mb-4"><div className="h-3 w-24 bg-gray-100 rounded" /><div className="w-9 h-9 bg-gray-100 rounded-xl" /></div>
              <div className="h-8 w-32 bg-gray-100 rounded mb-2" />
              <div className="h-3 w-20 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-gray-100 rounded-2xl h-36 animate-pulse" />
          <div className="bg-white rounded-2xl border border-gray-100 h-36 animate-pulse" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Today's Revenue"
          value={`AED ${Number(stats?.todayRevenue ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          trend={changePercent}
          trendLabel="vs yesterday"
          icon={DollarSign}
          iconBg="bg-blue-500"
          gradient="from-blue-50 to-blue-50/30"
        />
        <KpiCard
          label="Transactions"
          value={String(stats?.todayTransactions ?? 0)}
          trend={null}
          trendLabel="completed today"
          icon={ShoppingCart}
          iconBg="bg-emerald-500"
          gradient="from-emerald-50 to-emerald-50/30"
        />
        <KpiCard
          label="Low Stock Alerts"
          value={String(adminStats?.lowStockAlerts ?? 0)}
          trend={null}
          trendLabel="products need restocking"
          icon={AlertTriangle}
          iconBg={(adminStats?.lowStockAlerts ?? 0) > 0 ? 'bg-amber-500' : 'bg-gray-400'}
          gradient={(adminStats?.lowStockAlerts ?? 0) > 0 ? 'from-amber-50 to-amber-50/30' : 'from-gray-50 to-gray-50/30'}
          warn={(adminStats?.lowStockAlerts ?? 0) > 0}
        />
        <KpiCard
          label="Active Staff"
          value={String(adminStats?.totalUsers ?? 0)}
          trend={null}
          trendLabel="registered users"
          icon={Users}
          iconBg="bg-violet-500"
          gradient="from-violet-50 to-violet-50/30"
        />
      </div>

      {/* AI Summary + Live Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Summary */}
        {stats?.aiSummary && (
          <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-5 shadow-lg shadow-indigo-200">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-10 -translate-x-6" />
            <div className="relative flex items-start gap-4">
              <div className="w-10 h-10 bg-white/15 backdrop-blur rounded-xl flex items-center justify-center shrink-0">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1.5">AI Daily Summary</p>
                <p className="text-white text-sm leading-relaxed">{stats.aiSummary}</p>
              </div>
            </div>
          </div>
        )}

        {/* Live Sales Feed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <h3 className="text-sm font-semibold text-gray-800">Live Sales</h3>
            </div>
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <RefreshCw size={10} />
              {format(lastRefresh, 'HH:mm:ss')}
            </span>
          </div>
          {liveSales.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 text-center">
              <Activity size={24} className="text-gray-200 mb-2" />
              <p className="text-xs text-gray-400">Waiting for live transactions...</p>
            </div>
          ) : (
            <div className="space-y-2">
              {liveSales.map((s: any, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                  <div>
                    <p className="text-xs font-semibold text-gray-800">{s.cashierName ?? 'Staff'}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{s.receiptNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-emerald-700">AED {Number(s.total).toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400">{format(new Date(s.createdAt), 'HH:mm')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Anomaly Alerts */}
      {anomalyList.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-amber-600" />
            <h3 className="text-sm font-bold text-amber-800">Anomaly Alerts Detected</h3>
            <span className="ml-auto px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-800 rounded-full">{anomalyList.length}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {anomalyList.map((a: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-amber-100 shadow-sm">
                <span className="w-1.5 h-1.5 mt-1.5 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-gray-800">{a.title ?? a.type ?? 'Anomaly detected'}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{a.description ?? a.message ?? ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts row */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Revenue trend - wider */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Revenue Trend</h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">AED</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={32} />
                <Tooltip
                  contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: 10, padding: '8px 12px' }}
                  labelStyle={{ color: '#a5b4fc', fontSize: 11 }}
                  itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 600 }}
                  formatter={(v: any) => [`AED ${Number(v).toFixed(2)}`, 'Revenue']}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Transaction volume */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <div className="mb-5">
              <h3 className="text-sm font-bold text-gray-900">Transactions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} width={24} />
                <Tooltip
                  contentStyle={{ background: '#1e1b4b', border: 'none', borderRadius: 10, padding: '8px 12px' }}
                  labelStyle={{ color: '#a5b4fc', fontSize: 11 }}
                  itemStyle={{ color: '#fff', fontSize: 12, fontWeight: 600 }}
                  formatter={(v: any) => [v, 'Transactions']}
                />
                <Bar dataKey="count" fill="#818cf8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-900">Top Products Today</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">by revenue</span>
          </div>
          {(stats?.topProducts as any[])?.length ? (
            <div className="space-y-3.5">
              {(stats!.topProducts as any[]).slice(0, 5).map((p: any, i: number) => {
                const revenue = Number(p._sum?.total ?? 0);
                const pct = Math.round((revenue / topMax) * 100);
                const colors = ['bg-indigo-500', 'bg-blue-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500'];
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className={clsx('w-5 h-5 text-white rounded-md text-[10px] flex items-center justify-center font-bold shrink-0', colors[i] ?? 'bg-gray-400')}>
                          {i + 1}
                        </span>
                        <span className="text-sm text-gray-700 font-medium">{p.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900">AED {revenue.toFixed(0)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div
                        className={clsx('h-1.5 rounded-full transition-all duration-700', colors[i] ?? 'bg-gray-400')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Package size={28} className="text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">No sales recorded today</p>
            </div>
          )}
        </div>

        {/* System Overview */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-gray-900 mb-5">System Overview</h3>
          <div className="grid grid-cols-2 gap-3">
            <MiniStat label="Products" value={adminStats?.totalProducts} icon="📦" color="blue" />
            <MiniStat label="Customers" value={adminStats?.totalCustomers} icon="👥" color="green" />
            <MiniStat label="Staff Users" value={adminStats?.totalUsers} icon="👤" color="purple" />
            <MiniStat
              label="Low Stock"
              value={adminStats?.lowStockAlerts}
              icon="⚠️"
              color={(adminStats?.lowStockAlerts ?? 0) > 0 ? 'amber' : 'gray'}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">30-Day Revenue</span>
              <span className="text-xs font-bold text-gray-900">
                AED {Number((salesReport as any)?.totals?.revenue ?? 0).toLocaleString('en-AE', { minimumFractionDigits: 0 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">30-Day Transactions</span>
              <span className="text-xs font-bold text-gray-900">{(salesReport as any)?.totals?.count ?? '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Avg. Transaction</span>
              <span className="text-xs font-bold text-gray-900">
                AED {(salesReport as any)?.totals?.count
                  ? (Number((salesReport as any)?.totals?.revenue ?? 0) / Number((salesReport as any)?.totals?.count)).toFixed(2)
                  : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({
  label, value, trend, trendLabel, icon: Icon, iconBg, gradient, warn,
}: {
  label: string; value: string; trend: number | null; trendLabel: string;
  icon: any; iconBg: string; gradient: string; warn?: boolean;
}) {
  const isPositive = (trend ?? 0) >= 0;
  return (
    <div className={clsx('bg-gradient-to-br rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow', gradient)}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center shadow-sm', iconBg)}>
          <Icon size={16} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
      <p className={clsx('text-2xl font-black leading-none', warn ? 'text-amber-700' : 'text-gray-900')}>{value}</p>
      <div className="flex items-center gap-1.5 mt-2">
        {trend !== null && (
          <span className={clsx('flex items-center gap-0.5 text-xs font-semibold', isPositive ? 'text-emerald-600' : 'text-red-500')}>
            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
        <span className="text-xs text-gray-400">{trendLabel}</span>
      </div>
    </div>
  );
}

// ─── Mini Stat ────────────────────────────────────────────────────────────────
const MINI_COLORS: Record<string, string> = {
  blue: 'bg-blue-50 border-blue-100',
  green: 'bg-emerald-50 border-emerald-100',
  purple: 'bg-violet-50 border-violet-100',
  amber: 'bg-amber-50 border-amber-100',
  gray: 'bg-gray-50 border-gray-100',
};

function MiniStat({ label, value, icon, color }: { label: string; value?: number; icon: string; color: string }) {
  return (
    <div className={clsx('rounded-xl border p-3 flex items-center gap-3', MINI_COLORS[color] ?? MINI_COLORS.gray)}>
      <span className="text-xl">{icon}</span>
      <div>
        <p className="text-lg font-black text-gray-900 leading-none">{value ?? '—'}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}
