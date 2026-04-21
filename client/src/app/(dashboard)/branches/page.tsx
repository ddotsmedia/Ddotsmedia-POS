'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';

const EMPTY_FORM = { name: '', code: '', address: '', phone: '', email: '' };

export default function BranchesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: branches, isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => posApi.getBranches().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => posApi.createBranch(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setShowForm(false); setForm(EMPTY_FORM); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => posApi.updateBranch(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); setEditing(null); setForm(EMPTY_FORM); },
  });

  const openEdit = (b: any) => {
    setEditing(b);
    setForm({ name: b.name ?? '', code: b.code ?? '', address: b.address ?? '', phone: b.phone ?? '', email: b.email ?? '' });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const branchList: any[] = Array.isArray(branches) ? branches : [];
  const isPending = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Branches</h1>
          <p className="text-sm text-gray-500 mt-0.5">{branchList.length} branch{branchList.length !== 1 ? 'es' : ''}</p>
        </div>
        <button
          onClick={() => { setEditing(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Add Branch
        </button>
      </div>

      {/* Form Panel */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-gray-800">{editing ? 'Edit Branch' : 'New Branch'}</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'name', label: 'Branch Name', placeholder: 'Main Branch' },
              { key: 'code', label: 'Branch Code', placeholder: 'MAIN' },
              { key: 'address', label: 'Address', placeholder: '123 Main St, Dubai' },
              { key: 'phone', label: 'Phone', placeholder: '+971 4 000 0000' },
              { key: 'email', label: 'Email', placeholder: 'branch@store.com' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="text"
                  placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              disabled={isPending || !form.name}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Saving...' : editing ? 'Update Branch' : 'Create Branch'}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditing(null); setForm(EMPTY_FORM); }}
              className="border border-gray-300 px-5 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Branch Cards */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">Loading branches...</div>
      ) : branchList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏢</p>
          <p className="font-medium">No branches yet</p>
          <p className="text-sm mt-1">Create your first branch to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {branchList.map((b: any) => (
            <div key={b.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 font-bold text-sm">
                    {b.code ? b.code.slice(0, 2).toUpperCase() : b.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{b.name}</p>
                    {b.code && <p className="text-xs text-gray-400 font-mono">{b.code}</p>}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {b.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-gray-500 mb-4">
                {b.address && (
                  <p className="flex items-center gap-2">
                    <span>📍</span> {b.address}
                  </p>
                )}
                {b.phone && (
                  <p className="flex items-center gap-2">
                    <span>📞</span> {b.phone}
                  </p>
                )}
                {b.email && (
                  <p className="flex items-center gap-2">
                    <span>✉️</span> {b.email}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(b)}
                  className="flex-1 text-center px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => updateMut.mutate({ id: b.id, data: { isActive: !b.isActive } })}
                  className={`flex-1 text-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${b.isActive ? 'border border-red-200 text-red-600 hover:bg-red-50' : 'border border-green-200 text-green-600 hover:bg-green-50'}`}
                >
                  {b.isActive ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
