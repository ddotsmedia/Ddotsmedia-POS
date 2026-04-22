'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { Wallet, Plus, X, TrendingDown, PieChart, Calendar, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const CATEGORIES = ['Rent', 'Utilities', 'Salaries', 'Supplies', 'Marketing', 'Maintenance', 'Transport', 'Food & Beverages', 'Other'];

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: any; color: string }) {
  const colors: Record<string, string> = { red: 'bg-red-500', orange: 'bg-orange-500', blue: 'bg-blue-500', purple: 'bg-purple-500' };
  const bgs: Record<string, string> = { red: 'from-red-50', orange: 'from-orange-50', blue: 'from-blue-50', purple: 'from-purple-50' };
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

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ category: 'Other', description: '', amount: '', reference: '', expenseDate: new Date().toISOString().slice(0, 10) });

  const { data, isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: () => posApi.getExpenses({ limit: 50 }).then((r) => r.data),
  });

  const { data: summary } = useQuery({
    queryKey: ['expenses-summary'],
    queryFn: () => posApi.getExpenseSummary().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => posApi.createExpense(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-summary'] });
      setShowModal(false);
      setForm({ category: 'Other', description: '', amount: '', reference: '', expenseDate: new Date().toISOString().slice(0, 10) });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => posApi.deleteExpense(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['expenses'] });
      qc.invalidateQueries({ queryKey: ['expenses-summary'] });
    },
  });

  const expenses: any[] = data?.data ?? [];
  const total = expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
  const byCategory = summary?.byCategory ?? [];

  return (
    <div className="p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5"><Skeleton className="h-3 w-20 mb-3" /><Skeleton className="h-8 w-28" /></div>)
        ) : (
          <>
            <StatCard icon={Wallet} label="Total Expenses" value={`AED ${total.toFixed(2)}`} color="red" />
            <StatCard icon={TrendingDown} label="This Month" value={`AED ${(summary?.totalThisMonth ?? 0).toFixed(2)}`} color="orange" />
            <StatCard icon={PieChart} label="Categories" value={`${byCategory.length} active`} color="blue" />
            <StatCard icon={Calendar} label="Total Records" value={`${data?.total ?? 0}`} color="purple" />
          </>
        )}
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">This Month by Category</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {byCategory.map((cat: any) => (
              <div key={cat.category} className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-500 font-medium">{cat.category}</p>
                <p className="text-base font-black text-gray-900 mt-0.5">AED {Number(cat._sum?.amount ?? 0).toFixed(0)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-gray-700">All Expenses</h2>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />Add Expense
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2"><Wallet size={16} />New Expense</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Category *</label>
                <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500">
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              {[
                { key: 'description', label: 'Description *', placeholder: 'Monthly rent payment', type: 'text' },
                { key: 'amount', label: 'Amount (AED) *', placeholder: '0.00', type: 'number' },
                { key: 'reference', label: 'Reference / Invoice #', placeholder: 'INV-001', type: 'text' },
                { key: 'expenseDate', label: 'Date *', placeholder: '', type: 'date' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => createMut.mutate({ ...form, amount: parseFloat(form.amount) })}
                  disabled={createMut.isPending || !form.description.trim() || !form.amount}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {createMut.isPending ? 'Saving...' : 'Save Expense'}
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
              {['Date', 'Category', 'Description', 'Reference', 'Amount', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3.5"><Skeleton className="h-4 w-full" /></td></tr>
              ))
            ) : expenses.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-16">
                <Wallet size={36} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">No expenses recorded</p>
                <button onClick={() => setShowModal(true)} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">Add first expense</button>
              </td></tr>
            ) : expenses.map((e: any) => (
              <tr key={e.id} className="hover:bg-gray-50/80 transition-colors">
                <td className="px-4 py-3.5 text-gray-500 text-xs">{new Date(e.expenseDate).toLocaleDateString()}</td>
                <td className="px-4 py-3.5"><span className="px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-[11px] font-semibold">{e.category}</span></td>
                <td className="px-4 py-3.5 font-medium text-gray-900">{e.description}</td>
                <td className="px-4 py-3.5 text-gray-400 text-xs">{e.reference ?? '—'}</td>
                <td className="px-4 py-3.5 font-bold text-red-600">AED {Number(e.amount).toFixed(2)}</td>
                <td className="px-4 py-3.5">
                  <button onClick={() => deleteMut.mutate(e.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
