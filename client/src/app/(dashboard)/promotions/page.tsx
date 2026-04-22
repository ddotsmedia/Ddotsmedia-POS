'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { Tag, Plus, X, Power, Trash2, Percent, DollarSign, ShoppingBag } from 'lucide-react';
import clsx from 'clsx';

const PROMO_TYPES = [
  { value: 'PERCENTAGE', label: 'Percentage Off', icon: Percent },
  { value: 'FIXED', label: 'Fixed Amount Off', icon: DollarSign },
  { value: 'BUY_X_GET_Y', label: 'Buy X Get Y', icon: ShoppingBag },
  { value: 'FREE_ITEM', label: 'Free Item', icon: Tag },
];

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', rose: 'bg-rose-500' };
  const bgs: Record<string, string> = { indigo: 'from-indigo-50', emerald: 'from-emerald-50', amber: 'from-amber-50', rose: 'from-rose-50' };
  return (
    <div className={clsx('bg-gradient-to-br to-white border border-gray-100 rounded-2xl p-5 shadow-sm', bgs[color])}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center', colors[color])}><Icon size={15} className="text-white" /></div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}

const emptyForm = { name: '', code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '', maxUses: '', startsAt: new Date().toISOString().slice(0, 10), expiresAt: '' };

export default function PromotionsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: () => posApi.getPromotions({ limit: 50 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => posApi.createPromotion(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['promotions'] }); setShowModal(false); setForm({ ...emptyForm }); },
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => posApi.togglePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => posApi.deletePromotion(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  });

  const promotions: any[] = data?.data ?? [];
  const active = promotions.filter((p: any) => p.isActive).length;
  const totalUses = promotions.reduce((s: number, p: any) => s + (p.usedCount ?? 0), 0);

  const typeLabel = (type: string) => PROMO_TYPES.find((t) => t.value === type)?.label ?? type;

  const formatValue = (p: any) => {
    if (p.type === 'PERCENTAGE') return `${p.value}% off`;
    if (p.type === 'FIXED') return `AED ${p.value} off`;
    return `${p.value}`;
  };

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5"><Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-8 w-28" /></div>)
        ) : (
          <>
            <StatCard icon={Tag} label="Total Promotions" value={String(promotions.length)} color="indigo" />
            <StatCard icon={Power} label="Active" value={String(active)} color="emerald" />
            <StatCard icon={ShoppingBag} label="Total Uses" value={String(totalUses)} color="amber" />
            <StatCard icon={Tag} label="Inactive" value={String(promotions.length - active)} color="rose" />
          </>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">All Promotions</h2>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />New Promotion
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2"><Tag size={16} />New Promotion</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Promotion Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROMO_TYPES.map(({ value, label, icon: Icon }) => (
                    <button key={value} onClick={() => setForm((f) => ({ ...f, type: value }))}
                      className={clsx('flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-xs font-semibold transition-all',
                        form.type === value ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                      <Icon size={13} />{label}
                    </button>
                  ))}
                </div>
              </div>
              {[
                { key: 'name', label: 'Name *', placeholder: 'Summer Sale 2026', type: 'text' },
                { key: 'code', label: 'Promo Code (optional)', placeholder: 'SUMMER20', type: 'text' },
                { key: 'value', label: form.type === 'PERCENTAGE' ? 'Discount % *' : 'Discount Amount (AED) *', placeholder: '10', type: 'number' },
                { key: 'minOrderAmount', label: 'Min. Order Amount (AED)', placeholder: '0', type: 'number' },
                { key: 'maxUses', label: 'Max Uses (leave blank = unlimited)', placeholder: '100', type: 'number' },
                { key: 'startsAt', label: 'Start Date', placeholder: '', type: 'date' },
                { key: 'expiresAt', label: 'Expiry Date', placeholder: '', type: 'date' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => createMut.mutate({ ...form, value: parseFloat(form.value), minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null, maxUses: form.maxUses ? parseInt(form.maxUses) : null })}
                  disabled={createMut.isPending || !form.name.trim() || !form.value}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {createMut.isPending ? 'Creating...' : 'Create Promotion'}
                </button>
                <button onClick={() => setShowModal(false)} className="px-5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
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
              {['Name', 'Code', 'Type', 'Discount', 'Uses', 'Expires', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-3.5"><Skeleton className="h-4 w-full" /></td></tr>)
            ) : promotions.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-16">
                <Tag size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">No promotions yet</p>
                <button onClick={() => setShowModal(true)} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">Create first promotion</button>
              </td></tr>
            ) : promotions.map((p: any) => (
              <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-3.5 font-semibold text-gray-900">{p.name}</td>
                <td className="px-4 py-3.5">
                  {p.code ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-lg font-bold tracking-wider">{p.code}</span> : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3.5 text-gray-500 text-xs">{typeLabel(p.type)}</td>
                <td className="px-4 py-3.5 font-bold text-indigo-600">{formatValue(p)}</td>
                <td className="px-4 py-3.5 text-gray-500 text-xs">{p.usedCount}{p.maxUses ? ` / ${p.maxUses}` : ''}</td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '—'}</td>
                <td className="px-4 py-3.5">
                  <span className={clsx('px-2.5 py-1 rounded-full text-[11px] font-bold', p.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                    {p.isActive ? 'Active' : 'Paused'}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleMut.mutate(p.id)} className={clsx('p-1.5 rounded-lg transition-colors', p.isActive ? 'hover:bg-amber-50 text-amber-500' : 'hover:bg-emerald-50 text-emerald-500')} title={p.isActive ? 'Pause' : 'Activate'}>
                      <Power size={13} />
                    </button>
                    <button onClick={() => deleteMut.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
