import React, { useState, useEffect } from 'react';
import { posApi } from '../lib/api';

const today = () => new Date().toISOString().slice(0, 10);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

export default function ReportsScreen() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [tab, setTab] = useState<'sales' | 'profit' | 'cashiers'>('sales');
  const [salesData, setSalesData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);
  const [cashierData, setCashierData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, c] = await Promise.all([
        posApi.getSalesReport({ from, to }),
        posApi.getProfitReport({ from, to }),
        posApi.getCashierReport({ from, to }),
      ]);
      setSalesData(s.data);
      setProfitData(p.data);
      setCashierData(Array.isArray(c.data) ? c.data : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to]);

  const summary = salesData?.summary;

  return (
    <div className="flex flex-col h-full p-5 gap-4 overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-black text-gray-900">Reports</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          <span className="text-gray-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
          {[7, 30, 90].map((n) => (
            <button key={n} onClick={() => { setFrom(daysAgo(n)); setTo(today()); }} className="px-3 py-1.5 bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700 rounded-xl text-xs font-semibold transition-colors">
              {n}d
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <KpiCard label="Revenue" value={`AED ${Number(summary?.totalRevenue ?? 0).toFixed(0)}`} color="blue" />
        <KpiCard label="Transactions" value={String(summary?.totalTransactions ?? 0)} color="green" />
        <KpiCard label="Avg. Sale" value={`AED ${Number(summary?.avgTransactionValue ?? 0).toFixed(0)}`} color="purple" />
        <KpiCard label="Margin" value={`${profitData?.grossMargin ?? 0}%`} color="orange" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['sales', 'profit', 'cashiers'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'sales' ? 'Sales' : t === 'profit' ? 'P&L' : 'Cashiers'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">Loading report...</div>
      ) : (
        <div className="flex-1 overflow-auto">
          {tab === 'sales' && salesData && (
            <div className="space-y-4">
              <DataTable
                title="Top Products"
                headers={['Product', 'Qty Sold', 'Revenue']}
                rows={(salesData.topProducts ?? []).map((p: any) => [p.name, String(p.quantity ?? 0), `AED ${Number(p.revenue ?? 0).toFixed(2)}`])}
              />
              <DataTable
                title="Daily Breakdown"
                headers={['Date', 'Transactions', 'Revenue']}
                rows={(salesData.byDay ?? []).map((d: any) => [d.date, String(d.count), `AED ${Number(d.revenue ?? 0).toFixed(2)}`])}
              />
            </div>
          )}
          {tab === 'profit' && profitData && (
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4">
                <KpiCard label="Revenue" value={`AED ${Number(profitData.revenue ?? 0).toFixed(0)}`} color="blue" />
                <KpiCard label="COGS" value={`AED ${Number(profitData.cogs ?? 0).toFixed(0)}`} color="red" />
                <KpiCard label="Gross Profit" value={`AED ${Number(profitData.grossProfit ?? 0).toFixed(0)}`} color="green" />
                <KpiCard label="Margin %" value={`${profitData.grossMargin ?? 0}%`} color="orange" />
              </div>
              <DataTable
                title="Product Profitability"
                headers={['Product', 'Qty', 'Revenue', 'COGS', 'Profit', 'Margin']}
                rows={(profitData.byProduct ?? []).map((p: any) => {
                  const margin = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0.0';
                  return [p.name, String(p.qty), `AED ${Number(p.revenue).toFixed(0)}`, `AED ${Number(p.cogs).toFixed(0)}`, `AED ${Number(p.profit).toFixed(0)}`, `${margin}%`];
                })}
              />
            </div>
          )}
          {tab === 'cashiers' && (
            <DataTable
              title="Cashier Performance"
              headers={['Cashier', 'Transactions', 'Revenue', 'Avg. Sale', 'Discounts']}
              rows={cashierData.map((c: any) => [
                c.cashier, String(c.transactions),
                `AED ${Number(c.totalRevenue).toFixed(2)}`,
                `AED ${(Number(c.totalRevenue) / Math.max(c.transactions, 1)).toFixed(2)}`,
                `AED ${Number(c.totalDiscount ?? 0).toFixed(2)}`,
              ])}
            />
          )}
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colors: any = { blue: 'from-blue-500 to-blue-600', green: 'from-green-500 to-green-600', purple: 'from-purple-500 to-purple-600', orange: 'from-orange-500 to-orange-600', red: 'from-red-500 to-red-600' };
  return (
    <div className={`bg-gradient-to-br ${colors[color] ?? colors.blue} rounded-2xl p-4 text-white`}>
      <p className="text-xs font-semibold opacity-80 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-black mt-1">{value}</p>
    </div>
  );
}

function DataTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-800">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{headers.map((h) => <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="text-center py-8 text-gray-400">No data for this period</td></tr>
          ) : rows.map((row, i) => (
            <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
              {row.map((cell, j) => <td key={j} className="px-5 py-3 text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
