'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { Search, Plus, X, Users, Star, TrendingUp, ShoppingBag } from 'lucide-react';
import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => posApi.getCustomers({ search, limit: 50 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => posApi.createCustomer(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      setShowModal(false);
      setForm({ name: '', phone: '', email: '' });
    },
  });

  const customers: any[] = data?.data ?? data?.customers ?? [];
  const totalSpent = customers.reduce((s: number, c: any) => s + Number(c.totalSpent ?? 0), 0);
  const totalPoints = customers.reduce((s: number, c: any) => s + (c.loyaltyPoints ?? 0), 0);

  return (
    <div className="p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-8 w-28" />
            </div>
          ))
        ) : (
          <>
            <StatCard icon={Users} label="Total Customers" value={customers.length} color="indigo" />
            <StatCard icon={TrendingUp} label="Total Revenue" value={`AED ${totalSpent.toFixed(0)}`} color="emerald" />
            <StatCard icon={ShoppingBag} label="Avg. Spent" value={customers.length ? `AED ${(totalSpent / customers.length).toFixed(0)}` : '—'} color="blue" />
            <StatCard icon={Star} label="Loyalty Points" value={totalPoints.toLocaleString()} color="amber" />
          </>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white" />
        </div>
        <button onClick={() => setShowModal(true)}
          className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />Add Customer
        </button>
      </div>

      {/* New customer modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2"><Users size={16} />New Customer</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20">
                <X size={14} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'name', label: 'Full Name *', placeholder: 'John Doe', type: 'text' },
                { key: 'phone', label: 'Phone Number', placeholder: '+971 50 000 0000', type: 'tel' },
                { key: 'email', label: 'Email Address', placeholder: 'john@example.com', type: 'email' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type={type} value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => createMut.mutate(form)}
                  disabled={createMut.isPending || !form.name.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {createMut.isPending ? 'Creating...' : 'Create Customer'}
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
              {['Customer', 'Phone', 'Email', 'Total Spent', 'Visits', 'Loyalty Points'].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-3"><Skeleton className="w-8 h-8 rounded-full" /><Skeleton className="h-4 w-32" /></div></td>
                  {Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-4 py-3.5"><Skeleton className="h-4 w-24" /></td>)}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-16">
                  <Users size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">No customers found</p>
                  <button onClick={() => setShowModal(true)} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">Add your first customer</button>
                </td>
              </tr>
            ) : customers.map((c: any) => {
              const initials = c.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
              return (
                <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {initials}
                      </div>
                      <span className="font-semibold text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500">{c.phone ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 text-gray-500">{c.email ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-900">AED {Number(c.totalSpent ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3.5 text-gray-600">{c.visitCount ?? 0}</td>
                  <td className="px-4 py-3.5">
                    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold', (c.loyaltyPoints ?? 0) > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400')}>
                      <Star size={10} fill={c.loyaltyPoints > 0 ? 'currentColor' : 'none'} />
                      {c.loyaltyPoints ?? 0} pts
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isLoading && customers.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-50 bg-gray-50/50">
            <p className="text-xs text-gray-400">{customers.length} customers · Total revenue: AED {totalSpent.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: any; color: string }) {
  const colors: Record<string, string> = { indigo: 'bg-indigo-500', emerald: 'bg-emerald-500', blue: 'bg-blue-500', amber: 'bg-amber-500' };
  const bgs: Record<string, string> = { indigo: 'from-indigo-50', emerald: 'from-emerald-50', blue: 'from-blue-50', amber: 'from-amber-50' };
  return (
    <div className={clsx('bg-gradient-to-br to-white border border-gray-100 rounded-2xl p-5 shadow-sm', bgs[color])}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <div className={clsx('w-8 h-8 rounded-xl flex items-center justify-center', colors[color])}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
    </div>
  );
}
