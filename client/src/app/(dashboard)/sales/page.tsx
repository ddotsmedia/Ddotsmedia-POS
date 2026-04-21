'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { useBranchStore } from '@/store/branch';
import { format } from 'date-fns';
import { Receipt, ChevronLeft, ChevronRight, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: any }> = {
  COMPLETED: { label: 'Completed', cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  VOIDED: { label: 'Voided', cls: 'bg-red-100 text-red-600', icon: X },
  PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', icon: Clock },
};

const METHOD_LABELS: Record<string, string> = { CASH: 'Cash', CARD: 'Card', WALLET: 'Wallet', SPLIT: 'Split' };

export default function SalesPage() {
  const qc = useQueryClient();
  const { selectedBranchId } = useBranchStore();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page, selectedBranchId],
    queryFn: () => posApi.getSales({ page, limit: 20, ...(selectedBranchId && { branchId: selectedBranchId }) }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const voidMut = useMutation({
    mutationFn: (id: string) => posApi.voidSale(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sales'] }); setSelected(null); },
  });

  const sales: any[] = data?.data ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / 20);

  return (
    <div className="p-6 space-y-5">
      {/* Header stats */}
      <div className="flex items-center gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3.5 flex items-center gap-3 shadow-sm">
          <Receipt size={16} className="text-indigo-500" />
          <div>
            <p className="text-xs text-gray-500">Total Transactions</p>
            <p className="text-xl font-black text-gray-900">{isLoading ? '—' : total.toLocaleString()}</p>
          </div>
        </div>
        {!isLoading && sales.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 px-5 py-3.5 flex items-center gap-3 shadow-sm">
            <CheckCircle size={16} className="text-emerald-500" />
            <div>
              <p className="text-xs text-gray-500">Page Revenue</p>
              <p className="text-xl font-black text-gray-900">
                AED {sales.reduce((s, sale) => s + Number(sale.total ?? 0), 0).toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sale detail modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 px-6 py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-slate-400 text-xs mb-1 font-mono">{selected.receiptNumber}</p>
                  <p className="text-white font-bold text-lg">{format(new Date(selected.createdAt), 'MMM d, yyyy')}</p>
                  <p className="text-slate-400 text-sm">{format(new Date(selected.createdAt), 'HH:mm:ss')}</p>
                </div>
                <div className="flex items-center gap-3">
                  {(() => { const cfg = STATUS_CONFIG[selected.status]; return cfg ? <span className={clsx('px-2.5 py-1 rounded-full text-xs font-semibold', cfg.cls)}>{cfg.label}</span> : null; })()}
                  <button onClick={() => setSelected(null)} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20">
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Items */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5">
                {selected.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="text-gray-400 ml-2">× {item.quantity}</span>
                    </div>
                    <span className="font-semibold text-gray-900">AED {Number(item.total).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>AED {Number(selected.subtotal).toFixed(2)}</span></div>
                {Number(selected.discountAmount) > 0 && (
                  <div className="flex justify-between text-red-500"><span>Discount</span><span>−AED {Number(selected.discountAmount).toFixed(2)}</span></div>
                )}
                <div className="flex justify-between text-gray-600"><span>VAT (5%)</span><span>AED {Number(selected.taxAmount).toFixed(2)}</span></div>
                <div className="flex justify-between font-black text-gray-900 text-lg border-t border-gray-100 pt-2 mt-1">
                  <span>Total</span>
                  <span>AED {Number(selected.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="space-y-1">
                  <p className="text-xs text-gray-400">Cashier: <span className="font-semibold text-gray-700">{selected.cashier?.name ?? '—'}</span></p>
                  <div className="flex gap-1.5 flex-wrap">
                    {selected.payments?.map((p: any) => (
                      <span key={p.method} className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold">
                        {METHOD_LABELS[p.method] ?? p.method}
                      </span>
                    ))}
                  </div>
                </div>
                {selected.status === 'COMPLETED' && (
                  <button
                    onClick={() => { if (confirm('Void this sale? Inventory will be restored.')) voidMut.mutate(selected.id); }}
                    disabled={voidMut.isPending}
                    className="flex items-center gap-1.5 px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors">
                    <AlertTriangle size={13} />{voidMut.isPending ? 'Voiding...' : 'Void Sale'}
                  </button>
                )}
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
              {['Receipt #', 'Date & Time', 'Cashier', 'Items', 'Total', 'Payment', 'Status'].map((h) => (
                <th key={h} className="text-left px-4 py-3.5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-4"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-5 w-14 rounded-full" /></td>
                  <td className="px-4 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
                </tr>
              ))
            ) : sales.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <Receipt size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 font-medium">No transactions found</p>
                </td>
              </tr>
            ) : sales.map((s: any) => {
              const cfg = STATUS_CONFIG[s.status] ?? { label: s.status, cls: 'bg-gray-100 text-gray-500', icon: Clock };
              const StatusIcon = cfg.icon;
              return (
                <tr key={s.id} onClick={() => setSelected(s)}
                  className="hover:bg-indigo-50/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs font-bold text-indigo-600">{s.receiptNumber}</td>
                  <td className="px-4 py-3.5">
                    <p className="text-gray-800 text-xs font-medium">{format(new Date(s.createdAt), 'MMM d, yyyy')}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">{format(new Date(s.createdAt), 'HH:mm')}</p>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 font-medium">{s.cashier?.name ?? '—'}</td>
                  <td className="px-4 py-3.5 text-gray-500">{s.items?.length ?? 0}</td>
                  <td className="px-4 py-3.5 font-bold text-gray-900">AED {Number(s.total).toFixed(2)}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {s.payments?.map((p: any) => (
                        <span key={p.method} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-semibold">
                          {METHOD_LABELS[p.method] ?? p.method}
                        </span>
                      ))}
                    </div>
                  </td>
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

        {/* Pagination */}
        {!isLoading && pages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <p className="text-xs text-gray-500">{total.toLocaleString()} transactions · Page {page} of {pages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                const p = Math.max(1, Math.min(pages - 4, page - 2)) + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={clsx('w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors', p === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100')}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
