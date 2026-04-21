'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { useBranchStore } from '@/store/branch';
import { ShoppingCart, Plus, X, ChevronDown, CheckCircle, Clock, Truck, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  DRAFT:     { label: 'Draft',     cls: 'bg-gray-100 text-gray-500',    icon: Clock },
  ORDERED:   { label: 'Ordered',   cls: 'bg-blue-100 text-blue-600',    icon: Truck },
  RECEIVED:  { label: 'Received',  cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', cls: 'bg-red-100 text-red-600',      icon: X },
};

export default function PurchaseOrdersPage() {
  const qc = useQueryClient();
  const { selectedBranchId } = useBranchStore();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({
    supplierName: '', branchId: selectedBranchId ?? '', notes: '',
    items: [{ productId: '', productName: '', quantity: '', unitCost: '' }],
  });

  const { data, isLoading } = useQuery({
    queryKey: ['purchase-orders', selectedBranchId],
    queryFn: () => posApi.getPurchaseOrders(selectedBranchId ? { branchId: selectedBranchId } : {}).then((r) => r.data),
  });

  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => posApi.getBranches().then((r) => r.data),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products-po'],
    queryFn: () => posApi.getProducts({ limit: 200 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => posApi.createPurchaseOrder(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); setShowCreate(false); resetForm(); },
  });

  const receiveMut = useMutation({
    mutationFn: (id: string) => posApi.receivePurchaseOrder(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['purchase-orders'] }); setSelected(null); },
  });

  const resetForm = () => setForm({ supplierName: '', branchId: selectedBranchId ?? '', notes: '', items: [{ productId: '', productName: '', quantity: '', unitCost: '' }] });

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { productId: '', productName: '', quantity: '', unitCost: '' }] }));
  const removeItem = (i: number) => setForm((f) => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: string, value: string) =>
    setForm((f) => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  const orders: any[] = Array.isArray(data) ? data : (data?.data ?? []);
  const branches: any[] = Array.isArray(branchesData) ? branchesData : (branchesData?.data ?? []);
  const allProducts: any[] = Array.isArray(productsData) ? productsData : (productsData?.data ?? []);

  const orderTotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity || '0') * parseFloat(i.unitCost || '0')), 0);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center">
            <ShoppingCart size={16} className="text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Purchase Orders</h1>
            <p className="text-xs text-gray-400">Manage supplier orders and stock receiving</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />New Order
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-indigo-400" />
                <h2 className="text-white font-bold">New Purchase Order</h2>
              </div>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20">
                <X size={14} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Supplier Name *</label>
                  <input value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
                    placeholder="e.g. ABC Trading"
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Branch *</label>
                  <select value={form.branchId} onChange={(e) => setForm((f) => ({ ...f, branchId: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors bg-white">
                    <option value="">Select branch...</option>
                    {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Order Items</label>
                  <button onClick={addItem} className="text-xs text-indigo-600 font-semibold hover:text-indigo-700 flex items-center gap-1">
                    <Plus size={12} />Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_90px_32px] gap-2 items-start">
                      <select value={item.productId}
                        onChange={(e) => {
                          const p = allProducts.find((p: any) => p.id === e.target.value);
                          updateItem(i, 'productId', e.target.value);
                          if (p) { updateItem(i, 'productName', p.name); updateItem(i, 'unitCost', String(p.costPrice ?? '')); }
                        }}
                        className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 bg-white">
                        <option value="">Product...</option>
                        {allProducts.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" min="1" placeholder="Qty" value={item.quantity}
                        onChange={(e) => updateItem(i, 'quantity', e.target.value)}
                        className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                      <input type="number" min="0" step="0.01" placeholder="Cost" value={item.unitCost}
                        onChange={(e) => updateItem(i, 'unitCost', e.target.value)}
                        className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
                      <button onClick={() => removeItem(i)} disabled={form.items.length === 1}
                        className="w-8 h-9 flex items-center justify-center text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                {orderTotal > 0 && (
                  <div className="mt-3 flex justify-end">
                    <span className="text-sm font-bold text-gray-900">Total: AED {orderTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={2} placeholder="Optional notes..."
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none" />
              </div>
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button
                onClick={() => createMut.mutate({ ...form, items: form.items.map((i) => ({ ...i, quantity: parseInt(i.quantity), unitCost: parseFloat(i.unitCost) })) })}
                disabled={createMut.isPending || !form.supplierName || !form.branchId || form.items.some((i) => !i.productId || !i.quantity)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {createMut.isPending ? 'Creating...' : 'Create Purchase Order'}
              </button>
              <button onClick={() => { setShowCreate(false); resetForm(); }} className="px-5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-xs font-mono">{selected.orderNumber ?? selected.id?.slice(-8).toUpperCase()}</p>
                <p className="text-white font-bold text-lg mt-0.5">{selected.supplierName}</p>
                <p className="text-slate-400 text-sm">{selected.branch?.name ?? '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                {(() => { const cfg = STATUS_CONFIG[selected.status]; return cfg ? (
                  <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold', cfg.cls)}>{cfg.label}</span>
                ) : null; })()}
                <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20">
                  <X size={15} />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                {selected.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{item.productName ?? item.product?.name}</span>
                      <span className="text-gray-400 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-900">AED {Number(item.unitCost * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-black text-gray-900 text-lg">
                <span>Total</span>
                <span>AED {Number(selected.totalCost ?? 0).toFixed(2)}</span>
              </div>
              {selected.notes && <p className="text-sm text-gray-500 border-t pt-3">{selected.notes}</p>}
              {selected.status === 'ORDERED' && (
                <button onClick={() => { if (confirm('Mark this order as received? Inventory will be updated.')) receiveMut.mutate(selected.id); }}
                  disabled={receiveMut.isPending}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 disabled:opacity-50 transition-colors">
                  <Truck size={14} />{receiveMut.isPending ? 'Processing...' : 'Mark as Received'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50">
              {['Order #', 'Supplier', 'Branch', 'Items', 'Total', 'Date', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                  ))}
                </tr>
              ))
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <ShoppingCart size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">No purchase orders yet</p>
                </td>
              </tr>
            ) : orders.map((o: any) => {
              const cfg = STATUS_CONFIG[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-500', icon: Clock };
              const StatusIcon = cfg.icon;
              return (
                <tr key={o.id} onClick={() => setSelected(o)} className="hover:bg-indigo-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-indigo-600">{o.orderNumber ?? o.id?.slice(-8).toUpperCase()}</td>
                  <td className="px-4 py-3.5 font-semibold text-gray-900">{o.supplierName}</td>
                  <td className="px-4 py-3.5 text-gray-500">{o.branch?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500">{o.items?.length ?? 0}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-900">AED {Number(o.totalCost ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{o.createdAt ? format(new Date(o.createdAt), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-4 py-3.5">
                    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold', cfg.cls)}>
                      <StatusIcon size={10} />{cfg.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
