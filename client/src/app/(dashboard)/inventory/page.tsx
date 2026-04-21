'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { useBranchStore } from '@/store/branch';
import { AlertTriangle, Package, DollarSign, TrendingDown, Plus, X, Search } from 'lucide-react';
import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

function SkeletonRows({ cols, rows = 8 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-gray-50">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3.5">
              <Skeleton className={clsx('h-4', j === 0 ? 'w-40' : j === cols - 1 ? 'w-16 mx-auto' : 'w-24')} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function InventoryPage() {
  const qc = useQueryClient();
  const { selectedBranchId, selectedBranch } = useBranchStore();
  const [showAdjust, setShowAdjust] = useState(false);
  const [search, setSearch] = useState('');
  const [adjustForm, setAdjustForm] = useState({
    productId: '', branchId: selectedBranchId ?? 'branch-main', quantity: '', notes: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['inventory', selectedBranchId],
    queryFn: () => posApi.getInventory(selectedBranchId ? { branchId: selectedBranchId } : undefined).then((r) => r.data),
  });

  const adjustMut = useMutation({
    mutationFn: (d: any) => posApi.adjustStock(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['inventory'] }); setShowAdjust(false); setAdjustForm({ productId: '', branchId: selectedBranchId ?? 'branch-main', quantity: '', notes: '' }); },
  });

  const rawItems = Array.isArray(data) ? data : (data?.items ?? []);
  const allItems = rawItems.map((i: any) => ({
    id: i.id,
    product: i.product?.name ?? i.product ?? '—',
    barcode: i.product?.barcode ?? i.barcode ?? '—',
    sku: i.product?.sku ?? '—',
    branch: i.branch?.name ?? i.branch ?? '—',
    quantity: i.quantity ?? 0,
    minStock: i.product?.minStockAlert ?? 10,
    costPrice: i.product?.costPrice ?? 0,
    stockValue: (i.quantity ?? 0) * (i.product?.costPrice ?? 0),
    isLowStock: (i.quantity ?? 0) <= (i.product?.minStockAlert ?? 10),
    category: i.product?.category?.name ?? '—',
  }));

  const filtered = allItems.filter((i: any) =>
    !search || i.product.toLowerCase().includes(search.toLowerCase()) || i.barcode.includes(search)
  );
  const lowStockItems = allItems.filter((i: any) => i.isLowStock);
  const totalValue = allItems.reduce((s: number, i: any) => s + i.stockValue, 0);

  return (
    <div className="p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <Skeleton className="h-3 w-20 mb-3" />
              <Skeleton className="h-8 w-28" />
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total SKUs" value={allItems.length} icon={Package} color="indigo" />
            <StatCard label="Stock Value" value={`AED ${totalValue.toFixed(0)}`} icon={DollarSign} color="emerald" />
            <StatCard label="Low Stock" value={lowStockItems.length} icon={TrendingDown} color={lowStockItems.length > 0 ? 'amber' : 'gray'} />
            <StatCard label="Healthy Stock" value={allItems.length - lowStockItems.length} icon={Package} color="blue" />
          </>
        )}
      </div>

      {/* Low stock alert */}
      {!isLoading && lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
            <AlertTriangle size={15} className="text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-bold text-amber-900">{lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low</p>
            <p className="text-xs text-amber-700 mt-0.5">{lowStockItems.slice(0, 4).map((i: any) => i.product).join(' · ')}{lowStockItems.length > 4 ? ` +${lowStockItems.length - 4} more` : ''}</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white" />
        </div>
        {selectedBranch && <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl">{selectedBranch.name}</span>}
        <button onClick={() => setShowAdjust(true)}
          className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />Adjust Stock
        </button>
      </div>

      {/* Adjust modal */}
      {showAdjust && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <h2 className="text-white font-bold">Stock Adjustment</h2>
              <button onClick={() => setShowAdjust(false)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'productId', label: 'Product ID', placeholder: 'e.g. clxxx...' },
                { key: 'branchId', label: 'Branch ID', placeholder: 'e.g. branch-main' },
                { key: 'quantity', label: 'Quantity Delta (negative to remove)', placeholder: 'e.g. 10 or -5', type: 'number' },
                { key: 'notes', label: 'Notes / Reason', placeholder: 'e.g. Stock count correction' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type={type ?? 'text'} value={(adjustForm as any)[key]}
                    onChange={(e) => setAdjustForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => adjustMut.mutate({ ...adjustForm, quantityDelta: parseInt(adjustForm.quantity) })}
                  disabled={adjustMut.isPending || !adjustForm.productId || !adjustForm.quantity}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {adjustMut.isPending ? 'Saving...' : 'Apply Adjustment'}
                </button>
                <button onClick={() => setShowAdjust(false)} className="px-5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Product', 'SKU / Barcode', 'Category', 'Branch', 'Qty', 'Stock Value', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <SkeletonRows cols={7} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <Package size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">No inventory records found</p>
                </td>
              </tr>
            ) : filtered.map((item: any, i: number) => (
              <tr key={i} className={clsx('hover:bg-gray-50/80 transition-colors', item.isLowStock && 'bg-amber-50/40')}>
                <td className="px-4 py-3.5 font-semibold text-gray-900">{item.product}</td>
                <td className="px-4 py-3.5 font-mono text-xs text-gray-400">{item.barcode !== '—' ? item.barcode : item.sku}</td>
                <td className="px-4 py-3.5 text-gray-500 text-xs">{item.category}</td>
                <td className="px-4 py-3.5 text-gray-500">{item.branch}</td>
                <td className="px-4 py-3.5">
                  <span className={clsx('text-base font-black', item.quantity === 0 ? 'text-red-500' : item.isLowStock ? 'text-amber-600' : 'text-gray-900')}>
                    {item.quantity}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">/ {item.minStock} min</span>
                </td>
                <td className="px-4 py-3.5 text-gray-700 font-medium">AED {item.stockValue.toFixed(2)}</td>
                <td className="px-4 py-3.5">
                  {item.quantity === 0
                    ? <span className="px-2.5 py-1 bg-red-100 text-red-600 rounded-full text-[11px] font-semibold">Out of Stock</span>
                    : item.isLowStock
                      ? <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-full text-[11px] font-semibold">Low Stock</span>
                      : <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[11px] font-semibold">In Stock</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-xs text-gray-400">{filtered.length} items · Total value: AED {totalValue.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', blue: 'bg-blue-500', gray: 'bg-gray-400',
  };
  const bgs: Record<string, string> = {
    indigo: 'from-indigo-50', emerald: 'from-emerald-50', amber: 'from-amber-50', blue: 'from-blue-50', gray: 'from-gray-50',
  };
  return (
    <div className={clsx('bg-gradient-to-br to-white border border-gray-100 rounded-2xl p-5 shadow-sm', bgs[color] ?? 'from-gray-50')}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center', colors[color] ?? 'bg-gray-400')}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}
