'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { useBranchStore } from '@/store/branch';
import { ArrowRightLeft, Plus, X, Package, CheckCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

export default function TransfersPage() {
  const qc = useQueryClient();
  const { selectedBranchId } = useBranchStore();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ fromBranchId: '', toBranchId: '', productId: '', quantity: '' });
  const [result, setResult] = useState<{ success?: boolean; message?: string } | null>(null);

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => posApi.getBranches().then((r) => r.data),
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['products-transfer'],
    queryFn: () => posApi.getProducts({ limit: 200 }).then((r) => r.data),
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['inventory', selectedBranchId],
    queryFn: () => posApi.getInventory(selectedBranchId ? { branchId: selectedBranchId } : undefined).then((r) => r.data),
  });

  const transferMut = useMutation({
    mutationFn: (d: any) => posApi.transferStock(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory'] });
      setResult({ success: true, message: 'Stock transferred successfully' });
      setForm({ fromBranchId: '', toBranchId: '', productId: '', quantity: '' });
      setTimeout(() => { setShowModal(false); setResult(null); }, 1500);
    },
    onError: (e: any) => setResult({ success: false, message: e.response?.data?.message || 'Transfer failed' }),
  });

  const branches: any[] = Array.isArray(branchesData) ? branchesData : (branchesData?.data ?? []);
  const rawItems = Array.isArray(inventory) ? inventory : (inventory?.items ?? []);

  const items = rawItems.map((i: any) => ({
    product: i.product?.name ?? '—',
    branch: i.branch?.name ?? '—',
    quantity: i.quantity ?? 0,
    isLowStock: (i.quantity ?? 0) <= (i.product?.minStockAlert ?? 10),
  }));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ArrowRightLeft size={16} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Stock Transfers</h1>
            <p className="text-xs text-gray-400">Move inventory between branches</p>
          </div>
        </div>
        <button onClick={() => { setResult(null); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />New Transfer
        </button>
      </div>

      {/* Transfer modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-indigo-400" />
                <h2 className="text-white font-bold">New Stock Transfer</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'fromBranchId', label: 'From Branch', options: branches },
                { key: 'toBranchId', label: 'To Branch', options: branches },
              ].map(({ key, label, options }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <select value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors bg-white">
                    <option value="">Select branch...</option>
                    {options.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              ))}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Product</label>
                <select value={form.productId} onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors bg-white">
                  <option value="">Select product...</option>
                  {(Array.isArray(products) ? products : (products?.data ?? [])).map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Quantity</label>
                <input type="number" min="1" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  placeholder="e.g. 10"
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>

              {result && (
                <div className={clsx('flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium', result.success ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200')}>
                  {result.success ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {result.message}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => transferMut.mutate({ ...form, quantity: parseInt(form.quantity) })}
                  disabled={transferMut.isPending || !form.fromBranchId || !form.toBranchId || !form.productId || !form.quantity || form.fromBranchId === form.toBranchId}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {transferMut.isPending ? 'Transferring...' : 'Transfer Stock'}
                </button>
                <button onClick={() => setShowModal(false)} className="px-5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Inventory table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Current Stock Levels</h2>
          <span className="text-xs text-gray-400">{items.length} items</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Product', 'Branch', 'Quantity', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-3.5"><Skeleton className="h-4 w-24" /></td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-16">
                  <Package size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">No inventory records</p>
                </td>
              </tr>
            ) : items.map((item: any, i: number) => (
              <tr key={i} className={clsx('hover:bg-gray-50/80 transition-colors', item.isLowStock && 'bg-amber-50/40')}>
                <td className="px-4 py-3.5 font-semibold text-gray-900">{item.product}</td>
                <td className="px-4 py-3.5 text-gray-500">{item.branch}</td>
                <td className="px-4 py-3.5">
                  <span className={clsx('text-base font-black', item.quantity === 0 ? 'text-red-500' : item.isLowStock ? 'text-amber-600' : 'text-gray-900')}>
                    {item.quantity}
                  </span>
                </td>
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
      </div>
    </div>
  );
}
