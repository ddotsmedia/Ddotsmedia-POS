'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { useBranchStore } from '@/store/branch';
import { format, subDays } from 'date-fns';

function downloadCsv(type: string, from: string, to: string, branchId?: string | null) {
  posApi.exportReport(type, { from, to, ...(branchId && { branchId }) }).then((res) => {
    const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = `${type}-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  });
}

export default function ReportsPage() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [from, setFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [to, setTo] = useState(today);
  const [tab, setTab] = useState<'sales' | 'profit'>('sales');
  const { selectedBranchId, selectedBranch } = useBranchStore();
  const branchParams = selectedBranchId ? { branchId: selectedBranchId } : {};

  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['reports-sales', from, to, selectedBranchId],
    queryFn: () => posApi.getSalesReport({ from, to, ...branchParams }).then((r) => r.data),
  });

  const { data: profitData, isLoading: profitLoading } = useQuery({
    queryKey: ['reports-profit', from, to, selectedBranchId],
    queryFn: () => posApi.getProfitReport({ from, to, ...branchParams }).then((r) => r.data),
    enabled: tab === 'profit',
  });

  const isLoading = tab === 'sales' ? salesLoading : profitLoading;
  const summary = salesData?.summary;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">
          Reports{selectedBranch ? <span className="text-base font-normal text-gray-400 ml-2">— {selectedBranch.name}</span> : ''}
        </h1>
        <div className="flex items-center gap-2">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <span className="text-gray-400">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={() => downloadCsv(tab, from, to, selectedBranchId)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
            ⬇ Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['sales', 'profit'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'sales' ? 'Sales Summary' : 'Profit & Loss'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading report...</div>
      ) : tab === 'sales' && salesData ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Revenue" value={`AED ${Number(summary?.totalRevenue ?? 0).toFixed(2)}`} />
            <KpiCard label="Transactions" value={String(summary?.totalTransactions ?? 0)} />
            <KpiCard label="Avg. Sale" value={`AED ${Number(summary?.avgTransactionValue ?? 0).toFixed(2)}`} />
            <KpiCard label="Total Tax" value={`AED ${Number(summary?.totalTax ?? 0).toFixed(2)}`} />
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Top Products</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Product', 'Qty Sold', 'Revenue'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesData.topProducts?.map((p: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-700">{p.quantity}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">AED {Number(p.revenue ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Top Cashiers</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Cashier', 'Sales', 'Revenue'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {salesData.topCashiers?.map((c: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{c.cashier}</td>
                    <td className="px-4 py-3 text-gray-700">{c.sales}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">AED {Number(c.revenue ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : tab === 'profit' && profitData ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Revenue" value={`AED ${Number(profitData.revenue ?? 0).toFixed(2)}`} />
            <KpiCard label="COGS" value={`AED ${Number(profitData.cogs ?? 0).toFixed(2)}`} />
            <KpiCard label="Gross Profit" value={`AED ${Number(profitData.grossProfit ?? 0).toFixed(2)}`} positive />
            <KpiCard label="Margin" value={`${profitData.grossMargin ?? 0}%`} positive />
          </div>

          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-800">Product Profitability</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Product', 'Qty', 'Revenue', 'COGS', 'Profit'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profitData.byProduct?.map((p: any, i: number) => (
                  <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-700">{p.qty}</td>
                    <td className="px-4 py-3 text-gray-700">AED {Number(p.revenue ?? 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-700">AED {Number(p.cogs ?? 0).toFixed(2)}</td>
                    <td className={`px-4 py-3 font-semibold ${p.profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>AED {Number(p.profit ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}

function KpiCard({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${positive ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}
