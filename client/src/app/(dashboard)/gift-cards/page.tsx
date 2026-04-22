'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { Gift, Plus, X, CreditCard, Search, ArrowUpCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', amber: 'bg-amber-500', blue: 'bg-blue-500' };
  const bgs: Record<string, string> = { indigo: 'from-indigo-50', emerald: 'from-emerald-50', amber: 'from-amber-50', blue: 'from-blue-50' };
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

export default function GiftCardsPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showTopUp, setShowTopUp] = useState<string | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');
  const [form, setForm] = useState({ initialValue: '', issuedTo: '', expiresAt: '' });
  const [lookup, setLookup] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['gift-cards'],
    queryFn: () => posApi.getGiftCards({ limit: 50 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => posApi.createGiftCard(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gift-cards'] }); setShowCreate(false); setForm({ initialValue: '', issuedTo: '', expiresAt: '' }); },
  });

  const topUpMut = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => posApi.topUpGiftCard(id, amount),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gift-cards'] }); setShowTopUp(null); setTopUpAmount(''); },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => posApi.deactivateGiftCard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gift-cards'] }),
  });

  const cards: any[] = data?.data ?? [];
  const totalBalance = cards.reduce((s: number, c: any) => s + Number(c.balance ?? 0), 0);
  const active = cards.filter((c: any) => c.isActive).length;

  return (
    <div className="p-6 space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5"><Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-8 w-28" /></div>)
        ) : (
          <>
            <StatCard icon={Gift} label="Total Cards" value={String(cards.length)} color="indigo" />
            <StatCard icon={CreditCard} label="Active Cards" value={String(active)} color="emerald" />
            <StatCard icon={CreditCard} label="Total Balance" value={`AED ${totalBalance.toFixed(2)}`} color="amber" />
            <StatCard icon={CreditCard} label="Avg. Balance" value={active ? `AED ${(totalBalance / active).toFixed(0)}` : '—'} color="blue" />
          </>
        )}
      </div>

      {/* Lookup bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={lookup} onChange={(e) => setLookup(e.target.value)} placeholder="Lookup card by code..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white" />
        </div>
        <button onClick={() => setShowCreate(true)}
          className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />Issue Gift Card
        </button>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2"><Gift size={16} />Issue Gift Card</h2>
              <button onClick={() => setShowCreate(false)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'initialValue', label: 'Value (AED) *', placeholder: '50.00', type: 'number' },
                { key: 'issuedTo', label: 'Issue to (customer name/phone)', placeholder: 'Optional', type: 'text' },
                { key: 'expiresAt', label: 'Expiry Date', placeholder: '', type: 'date' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
              <p className="text-xs text-gray-400">A unique code will be auto-generated if not specified.</p>
              <div className="flex gap-3 pt-1">
                <button onClick={() => createMut.mutate({ ...form, initialValue: parseFloat(form.initialValue) })}
                  disabled={createMut.isPending || !form.initialValue}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {createMut.isPending ? 'Creating...' : 'Issue Card'}
                </button>
                <button onClick={() => setShowCreate(false)} className="px-5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Top-up modal */}
      {showTopUp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2"><ArrowUpCircle size={16} />Top Up Card</h2>
              <button onClick={() => setShowTopUp(null)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Top-up Amount (AED)</label>
                <input type="number" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} placeholder="0.00"
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => topUpMut.mutate({ id: showTopUp, amount: parseFloat(topUpAmount) })}
                  disabled={topUpMut.isPending || !topUpAmount}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {topUpMut.isPending ? 'Processing...' : 'Top Up'}
                </button>
                <button onClick={() => setShowTopUp(null)} className="px-5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5"><Skeleton className="h-4 w-full mb-3" /><Skeleton className="h-8 w-28" /></div>)
        ) : cards
          .filter((c: any) => !lookup || c.code.toLowerCase().includes(lookup.toLowerCase()))
          .map((card: any) => (
            <div key={card.id} className={clsx('bg-white rounded-2xl border shadow-sm p-5', card.isActive ? 'border-gray-100' : 'border-gray-200 opacity-60')}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-mono text-sm font-bold text-gray-800 tracking-wider">{card.code}</p>
                  {card.issuedTo && <p className="text-xs text-gray-400 mt-0.5">{card.issuedTo}</p>}
                </div>
                <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', card.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
                  {card.isActive ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-semibold">Balance</p>
                  <p className="text-xl font-black text-gray-900">AED {Number(card.balance).toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">of AED {Number(card.initialValue).toFixed(2)}</p>
                </div>
                {card.isActive && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setShowTopUp(card.id)} className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-colors" title="Top Up">
                      <ArrowUpCircle size={15} />
                    </button>
                    <button onClick={() => deactivateMut.mutate(card.id)} className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-xl transition-colors" title="Deactivate">
                      <XCircle size={15} />
                    </button>
                  </div>
                )}
              </div>
              {card.expiresAt && (
                <p className="mt-2 text-[10px] text-amber-600 font-medium">Expires {new Date(card.expiresAt).toLocaleDateString()}</p>
              )}
            </div>
          ))}
        {!isLoading && cards.length === 0 && (
          <div className="col-span-3 py-16 text-center">
            <Gift size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No gift cards yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">Issue first gift card</button>
          </div>
        )}
      </div>
    </div>
  );
}
