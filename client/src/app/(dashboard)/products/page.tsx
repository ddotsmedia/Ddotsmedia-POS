'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import clsx from 'clsx';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = 'categories' | 'subcategories' | 'products';

const PRESET_COLORS = [
  '#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444',
  '#06B6D4','#EC4899','#84CC16','#F97316','#6366F1',
  '#14B8A6','#F43F5E','#A855F7','#0EA5E9','#22C55E',
];

const PRESET_ICONS = ['📦','🥤','👕','📱','🍕','🍔','🥗','🧃','☕','🍰',
  '👟','👗','💄','🛍','🏠','🔧','💻','📚','🎮','🚗',
  '🌿','🧴','💊','🛒','🎁','🍫','🥩','🧇','🍜','🥐'];

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Badge({ active }: { active: boolean }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold', active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400')}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Color</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {PRESET_COLORS.map((c) => (
          <button key={c} type="button" onClick={() => onChange(c)}
            className={clsx('w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110', value === c ? 'border-gray-800 scale-110' : 'border-transparent')}
            style={{ backgroundColor: c }} />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
          className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (i: string) => void }) {
  const [custom, setCustom] = useState('');
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">Icon (emoji)</label>
      <div className="flex flex-wrap gap-1.5 mb-2 max-h-24 overflow-y-auto p-1">
        {PRESET_ICONS.map((ic) => (
          <button key={ic} type="button" onClick={() => onChange(ic)}
            className={clsx('w-9 h-9 text-xl rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center', value === ic ? 'bg-blue-100 ring-2 ring-blue-400' : '')}>
            {ic}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input type="text" placeholder="Or type emoji..." value={custom}
          onChange={(e) => { setCustom(e.target.value); if (e.target.value) onChange(e.target.value); }}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {value && <span className="text-2xl">{value}</span>}
      </div>
    </div>
  );
}

// ─── Category Form Modal ──────────────────────────────────────────────────────
function CategoryModal({
  initial, isSubcat, parents, onClose, onSave,
}: {
  initial?: any; isSubcat: boolean; parents: any[];
  onClose: () => void; onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    icon: initial?.icon ?? (isSubcat ? '📁' : '📦'),
    color: initial?.color ?? '#6B7280',
    description: initial?.description ?? '',
    parentId: initial?.parentId ?? (isSubcat ? (parents[0]?.id ?? '') : ''),
    sortOrder: initial?.sortOrder ?? 0,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const valid = form.name.trim().length > 0 && (!isSubcat || form.parentId);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Edit' : 'New'} {isSubcat ? 'Sub-Category' : 'Category'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-5">
          {isSubcat && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Parent Category *</label>
              <select value={form.parentId} onChange={(e) => set('parentId', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Select parent category</option>
                {parents.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)}
              placeholder={isSubcat ? 'e.g. Cold Drinks, Men\'s Shirts...' : 'e.g. Food & Beverages, Clothing...'}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              placeholder="Optional description..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <IconPicker value={form.icon} onChange={(v) => set('icon', v)} />
          <ColorPicker value={form.color} onChange={(v) => set('color', v)} />

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Sort Order</label>
            <input type="number" value={form.sortOrder} onChange={(e) => set('sortOrder', Number(e.target.value))} min={0}
              className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase">Preview</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm" style={{ backgroundColor: form.color }}>
                <span style={{ filter: 'brightness(10)' }}>{form.icon}</span>
              </div>
              <div>
                <p className="font-bold text-gray-900">{form.name || 'Category Name'}</p>
                {form.description && <p className="text-xs text-gray-500 mt-0.5">{form.description}</p>}
              </div>
              <div className="ml-auto w-20 h-6 rounded-full" style={{ backgroundColor: form.color, opacity: 0.2 }} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={() => onSave(form)} disabled={!valid}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            {initial ? 'Update' : 'Create'} {isSubcat ? 'Sub-Category' : 'Category'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Product Form Modal ───────────────────────────────────────────────────────
function ProductModal({
  initial, categories, onClose, onSave,
}: {
  initial?: any; categories: any[]; onClose: () => void; onSave: (data: any) => void;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    barcode: initial?.barcode ?? '',
    sku: initial?.sku ?? '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? '',
    costPrice: initial?.costPrice ?? '',
    sellingPrice: initial?.sellingPrice ?? '',
    minStockAlert: initial?.minStockAlert ?? 5,
    trackInventory: initial?.trackInventory ?? true,
    allowNegative: initial?.allowNegative ?? false,
    taxIncluded: initial?.taxIncluded ?? true,
    initialStock: '',
    branchId: 'branch-main',
    isActive: initial?.isActive ?? true,
  });

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const isEdit = !!initial;
  const valid = form.name.trim() && form.sellingPrice;

  const margin = form.costPrice && form.sellingPrice
    ? (((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.sellingPrice)) * 100).toFixed(1)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">{isEdit ? 'Edit' : 'New'} Menu Item / Product</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-5">
          {/* Name */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Product Name *</label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Mineral Water 500ml"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Category */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
            <select value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— No category —</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.parentId ? '  └ ' : ''}{c.icon ?? ''} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Barcode & SKU */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Barcode</label>
            <input value={form.barcode} onChange={(e) => set('barcode', e.target.value)} placeholder="e.g. 6001234567890"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">SKU</label>
            <input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. WAT-500"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Prices */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Cost Price (AED)</label>
            <input type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Selling Price (AED) *
              {margin && <span className="ml-2 text-green-600 font-semibold">{margin}% margin</span>}
            </label>
            <input type="number" step="0.01" min="0" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} placeholder="0.00"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Description */}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              placeholder="Optional product description..."
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {/* Stock settings */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Low Stock Alert (qty)</label>
            <input type="number" min="0" value={form.minStockAlert} onChange={(e) => set('minStockAlert', Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Initial Stock Qty</label>
              <input type="number" min="0" value={form.initialStock} onChange={(e) => set('initialStock', e.target.value)} placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}

          {/* Toggles */}
          <div className="col-span-2 grid grid-cols-3 gap-3">
            {[
              { key: 'trackInventory', label: '📊 Track Inventory', desc: 'Monitor stock levels' },
              { key: 'taxIncluded', label: '🧾 Tax Included', desc: 'Price includes 5% VAT' },
              { key: 'allowNegative', label: '⚠️ Allow Negative', desc: 'Sell even when out of stock' },
            ].map(({ key, label, desc }) => (
              <button key={key} type="button" onClick={() => set(key, !(form as any)[key])}
                className={clsx('p-3 rounded-xl border-2 text-left transition-all', (form as any)[key] ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white')}>
                <p className={clsx('text-sm font-semibold', (form as any)[key] ? 'text-blue-700' : 'text-gray-600')}>{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>

          {isEdit && (
            <div className="col-span-2">
              <button type="button" onClick={() => set('isActive', !form.isActive)}
                className={clsx('px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all', form.isActive ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-600')}>
                {form.isActive ? '✓ Active — click to deactivate' : '✗ Inactive — click to activate'}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 pb-6">
          <button onClick={() => onSave(form)} disabled={!valid}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
            {isEdit ? 'Update Product' : 'Create Product'}
          </button>
          <button onClick={onClose} className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Categories Tab ───────────────────────────────────────────────────────────
function CategoriesTab({ isSubcat }: { isSubcat: boolean }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data: allCats = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => posApi.getCategories().then((r) => r.data),
  });

  const topLevel = (allCats as any[]).filter((c: any) => !c.parentId);
  const subcats = (allCats as any[]).filter((c: any) => !!c.parentId);
  const displayed = isSubcat ? subcats : topLevel;

  const createMut = useMutation({
    mutationFn: (data: any) => posApi.createCategory(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => posApi.updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['categories'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => posApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });

  const handleSave = (data: any) => {
    if (editing) updateMut.mutate({ id: editing.id, data });
    else createMut.mutate({ ...data, parentId: isSubcat ? data.parentId : null });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{isSubcat ? 'Sub-Categories' : 'Categories'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isSubcat ? 'Nested groupings within a parent category' : 'Top-level groupings for your menu items'} · {displayed.length} total
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          + New {isSubcat ? 'Sub-Category' : 'Category'}
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
          <p className="text-4xl mb-3">{isSubcat ? '📁' : '🗂️'}</p>
          <p className="font-semibold text-gray-600">No {isSubcat ? 'sub-categories' : 'categories'} yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">Create one to organise your menu items</p>
          <button onClick={() => setShowForm(true)} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-semibold">
            + Create First {isSubcat ? 'Sub-Category' : 'Category'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((cat: any) => {
            const parent = topLevel.find((p: any) => p.id === cat.parentId);
            return (
              <div key={cat.id} className={clsx('bg-white rounded-2xl border-2 p-5 transition-all hover:shadow-md', cat.isActive ? 'border-gray-100' : 'border-red-100 opacity-60')}>
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm flex-shrink-0"
                      style={{ backgroundColor: cat.color }}>
                      {cat.icon}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 leading-tight">{cat.name}</p>
                      {parent && <p className="text-xs text-gray-400 mt-0.5">in {parent.icon} {parent.name}</p>}
                    </div>
                  </div>
                  <Badge active={cat.isActive} />
                </div>

                {cat.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{cat.description}</p>}

                <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
                  <span>{cat._count?.products ?? 0} products</span>
                  <span className="font-mono">{cat.color}</span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button onClick={() => setEditing(cat)}
                    className="flex-1 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold transition-colors">
                    ✏️ Edit
                  </button>
                  <button onClick={() => updateMut.mutate({ id: cat.id, data: { ...cat, isActive: !cat.isActive } })}
                    className={clsx('flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors', cat.isActive ? 'bg-orange-50 text-orange-600 hover:bg-orange-100' : 'bg-green-50 text-green-700 hover:bg-green-100')}>
                    {cat.isActive ? '⏸ Disable' : '▶ Enable'}
                  </button>
                  <button onClick={() => { if (confirm(`Delete "${cat.name}"?`)) deleteMut.mutate(cat.id); }}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-semibold transition-colors">
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showForm || editing) && (
        <CategoryModal
          initial={editing ?? undefined}
          isSubcat={isSubcat}
          parents={topLevel}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────
function ProductsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, filterCat],
    queryFn: () => posApi.getProducts({ search, categoryId: filterCat || undefined, limit: 100 }).then((r) => r.data),
  });

  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => posApi.getCategories().then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => posApi.createProduct(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setShowForm(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => posApi.updateProduct(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['products'] }); setEditing(null); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => posApi.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });

  const handleSave = (form: any) => {
    const payload = {
      ...form,
      sellingPrice: parseFloat(form.sellingPrice),
      costPrice: parseFloat(form.costPrice || '0'),
      minStockAlert: Number(form.minStockAlert),
      categoryId: form.categoryId || null,
      barcode: form.barcode || null,
      sku: form.sku || null,
      description: form.description || null,
      initialStock: form.initialStock ? Number(form.initialStock) : undefined,
    };
    if (editing) updateMut.mutate({ id: editing.id, data: payload });
    else createMut.mutate(payload);
  };

  const products: any[] = data?.data ?? data?.products ?? [];
  const allCats: any[] = Array.isArray(cats) ? cats : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Menu Items / Products</h2>
          <p className="text-sm text-gray-500 mt-0.5">{data?.total ?? products.length} items</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          + Add Menu Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <input
          placeholder="🔍 Search name, barcode, SKU..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-48 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}
          className="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All categories</option>
          {allCats.map((c: any) => <option key={c.id} value={c.id}>{c.parentId ? '  └ ' : ''}{c.icon} {c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Product', 'Category', 'SKU / Barcode', 'Cost', 'Price', 'Margin', 'Stock', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}><td colSpan={9} className="px-4 py-3"><div className="h-5 bg-gray-100 rounded animate-pulse" /></td></tr>
              ))
            ) : products.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-gray-400">
                <p className="text-3xl mb-2">📦</p>
                <p className="font-semibold">No products found</p>
              </td></tr>
            ) : products.map((p: any) => {
              const cost = Number(p.costPrice ?? 0);
              const price = Number(p.sellingPrice ?? 0);
              const margin = price > 0 ? ((price - cost) / price * 100).toFixed(0) : '—';
              const stock = p.inventory?.[0]?.quantity ?? 0;
              const catColor = allCats.find((c: any) => c.id === p.categoryId)?.color ?? '#6B7280';
              return (
                <tr key={p.id} className={clsx('border-b border-gray-50 hover:bg-gray-50/50 transition-colors', !p.isActive && 'opacity-50')}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: catColor }}>
                        {p.category?.icon ?? '📦'}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{p.name}</p>
                        {p.description && <p className="text-xs text-gray-400 truncate max-w-xs">{p.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.category?.name ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">
                    {p.sku && <div>{p.sku}</div>}
                    {p.barcode && <div className="text-gray-400">{p.barcode}</div>}
                    {!p.sku && !p.barcode && <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-sm">{cost > 0 ? `AED ${cost.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900 text-sm">AED {price.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-semibold', Number(margin) > 40 ? 'text-green-600' : Number(margin) > 20 ? 'text-yellow-600' : 'text-red-500')}>
                      {margin}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx('text-xs font-semibold', stock <= 0 ? 'text-red-500' : stock <= (p.minStockAlert ?? 5) ? 'text-orange-500' : 'text-green-600')}>
                      {stock}
                    </span>
                  </td>
                  <td className="px-4 py-3"><Badge active={p.isActive} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(p)} className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition-colors">
                        Edit
                      </button>
                      <button onClick={() => { if (confirm(`Deactivate "${p.name}"?`)) deleteMut.mutate(p.id); }}
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-500 rounded-lg text-xs font-medium transition-colors">
                        ×
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(showForm || editing) && (
        <ProductModal
          initial={editing ?? undefined}
          categories={allCats}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('products');

  const { data: cats = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => posApi.getCategories().then((r) => r.data),
  });

  const topCount = (cats as any[]).filter((c: any) => !c.parentId).length;
  const subCount = (cats as any[]).filter((c: any) => !!c.parentId).length;

  const TABS: { id: Tab; label: string; icon: string; count?: number }[] = [
    { id: 'products', label: 'Menu Items', icon: '📦' },
    { id: 'categories', label: 'Categories', icon: '🗂️', count: topCount },
    { id: 'subcategories', label: 'Sub-Categories', icon: '📁', count: subCount },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products & Menu</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage categories, sub-categories, and all menu items</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all',
              tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            )}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className={clsx('text-xs font-bold px-1.5 py-0.5 rounded-full', tab === t.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500')}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'products' && <ProductsTab />}
      {tab === 'categories' && <CategoriesTab isSubcat={false} />}
      {tab === 'subcategories' && <CategoriesTab isSubcat={true} />}
    </div>
  );
}
