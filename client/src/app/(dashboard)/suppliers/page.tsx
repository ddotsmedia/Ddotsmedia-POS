'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { Truck, Plus, X, Search, Mail, Phone, MapPin } from 'lucide-react';
import clsx from 'clsx';

function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-gray-100 rounded-lg', className)} />;
}

const emptyForm = { name: '', email: '', phone: '', address: '' };

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editSupplier, setEditSupplier] = useState<any>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => posApi.getSuppliers({ search, limit: 50 }).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => editSupplier ? posApi.updateSupplier(editSupplier.id, d) : posApi.createSupplier(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setShowModal(false); setEditSupplier(null); setForm({ ...emptyForm }); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => posApi.deleteSupplier(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suppliers'] }),
  });

  const openEdit = (supplier: any) => {
    setEditSupplier(supplier);
    setForm({ name: supplier.name, email: supplier.email ?? '', phone: supplier.phone ?? '', address: supplier.address ?? '' });
    setShowModal(true);
  };

  const suppliers: any[] = data?.data ?? [];

  return (
    <div className="p-6 space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Total Suppliers</p>
          <p className="text-3xl font-black text-gray-900">{isLoading ? '—' : suppliers.length}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Active</p>
          <p className="text-3xl font-black text-gray-900">{isLoading ? '—' : suppliers.length}</p>
        </div>
        <div className="bg-gradient-to-br from-indigo-50 to-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">With Orders</p>
          <p className="text-3xl font-black text-gray-900">{isLoading ? '—' : suppliers.filter((s: any) => (s._count?.purchaseOrders ?? 0) > 0).length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search suppliers..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white" />
        </div>
        <button onClick={() => { setEditSupplier(null); setForm({ ...emptyForm }); setShowModal(true); }}
          className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-100">
          <Plus size={15} />Add Supplier
        </button>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
              <h2 className="text-white font-bold flex items-center gap-2"><Truck size={16} />{editSupplier ? 'Edit Supplier' : 'New Supplier'}</h2>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 bg-white/10 rounded-full flex items-center justify-center text-white/70 hover:bg-white/20"><X size={14} /></button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'name', label: 'Company Name *', placeholder: 'Al Noor Trading LLC', type: 'text' },
                { key: 'email', label: 'Email', placeholder: 'contact@supplier.com', type: 'email' },
                { key: 'phone', label: 'Phone', placeholder: '+971 4 000 0000', type: 'tel' },
                { key: 'address', label: 'Address', placeholder: 'Dubai, UAE', type: 'text' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                  <input type={type} value={(form as any)[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border-2 border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              ))}
              <div className="flex gap-3 pt-1">
                <button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.name.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {createMut.isPending ? 'Saving...' : editSupplier ? 'Save Changes' : 'Add Supplier'}
                </button>
                <button onClick={() => setShowModal(false)} className="px-5 border-2 border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5"><Skeleton className="h-5 w-40 mb-3" /><Skeleton className="h-4 w-32 mb-2" /><Skeleton className="h-4 w-24" /></div>)
        ) : suppliers.length === 0 ? (
          <div className="col-span-3 py-16 text-center">
            <Truck size={36} className="mx-auto text-gray-200 mb-3" />
            <p className="text-gray-400 font-medium">No suppliers yet</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-indigo-600 text-sm font-semibold hover:underline">Add first supplier</button>
          </div>
        ) : suppliers.map((s: any) => (
          <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm shrink-0">
                {s.name[0].toUpperCase()}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                {s._count?.purchaseOrders ?? 0} orders
              </span>
            </div>
            <p className="font-bold text-gray-900 mb-2">{s.name}</p>
            {s.email && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Mail size={11} />{s.email}</p>
            )}
            {s.phone && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400 mb-1"><Phone size={11} />{s.phone}</p>
            )}
            {s.address && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400"><MapPin size={11} />{s.address}</p>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={() => openEdit(s)} className="flex-1 text-xs font-semibold py-2 rounded-xl border-2 border-gray-200 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                Edit
              </button>
              <button onClick={() => deleteMut.mutate(s.id)} className="px-3 text-xs font-semibold py-2 rounded-xl border-2 border-gray-200 hover:border-red-300 hover:text-red-500 transition-colors">
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
