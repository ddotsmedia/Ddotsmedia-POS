import React, { useState, useEffect } from 'react';
import { posApi } from '../lib/api';

export default function InventoryScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<any>(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjNote, setAdjNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await posApi.getInventory();
      setItems(Array.isArray(data) ? data : (data?.items ?? data?.data ?? []));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((i) =>
    !search || (i.product?.name ?? '').toLowerCase().includes(search.toLowerCase()) || (i.product?.barcode ?? '').includes(search),
  );

  const lowStock = items.filter((i) => i.quantity <= (i.product?.minStockAlert ?? 10));
  const totalValue = items.reduce((s, i) => s + i.quantity * Number(i.product?.costPrice ?? 0), 0);

  const handleAdjust = async () => {
    if (!adjusting || !adjQty) return;
    setSaving(true);
    try {
      await posApi.adjustStock({ productId: adjusting.product.id, branchId: adjusting.branchId, quantity: parseInt(adjQty), notes: adjNote });
      setMessage('Stock adjusted ✓');
      setAdjusting(null);
      load();
      setTimeout(() => setMessage(''), 3000);
    } catch (e: any) {
      setMessage(`Error: ${e.response?.data?.message ?? e.message}`);
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col h-full p-5 gap-4 overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-gray-900">Inventory</h1>
        <button onClick={load} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">↻ Refresh</button>
      </div>

      {message && <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${message.startsWith('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>{message}</div>}

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total SKUs</p>
          <p className="text-3xl font-black text-gray-900 mt-1">{items.length}</p>
        </div>
        <div className={`bg-white rounded-2xl border-2 p-4 ${lowStock.length > 0 ? 'border-orange-200' : 'border-gray-100'}`}>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Low Stock Alerts</p>
          <p className={`text-3xl font-black mt-1 ${lowStock.length > 0 ? 'text-orange-500' : 'text-gray-900'}`}>{lowStock.length}</p>
        </div>
        <div className="bg-white rounded-2xl border-2 border-gray-100 p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock Cost Value</p>
          <p className="text-3xl font-black text-gray-900 mt-1">AED {totalValue.toFixed(0)}</p>
        </div>
      </div>

      {lowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <p className="text-sm font-bold text-orange-800 mb-1">⚠️ Low Stock Items</p>
          <div className="flex flex-wrap gap-2">
            {lowStock.map((i, idx) => (
              <span key={idx} className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                {i.product?.name} ({i.quantity})
              </span>
            ))}
          </div>
        </div>
      )}

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or barcode..."
        className="px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 bg-white" />

      {adjusting && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-end gap-3">
          <div className="flex-1">
            <p className="text-sm font-bold text-blue-900 mb-2">Adjust: {adjusting.product?.name}</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Quantity (negative to decrease)</label>
                <input type="number" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <input value={adjNote} onChange={(e) => setAdjNote(e.target.value)} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-500" />
              </div>
            </div>
          </div>
          <button onClick={handleAdjust} disabled={saving} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Apply'}
          </button>
          <button onClick={() => setAdjusting(null)} className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200">Cancel</button>
        </div>
      )}

      <div className="flex-1 bg-white rounded-2xl border-2 border-gray-100 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {['Product', 'Barcode', 'Branch', 'Qty', 'Cost', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading inventory...</td></tr>
            ) : filtered.map((item, i) => {
              const isLow = item.quantity <= (item.product?.minStockAlert ?? 10);
              return (
                <tr key={i} className={`border-t border-gray-50 ${isLow ? 'bg-orange-50/50' : 'hover:bg-gray-50/50'} transition-colors`}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{item.product?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{item.product?.barcode}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{item.branch?.name}</td>
                  <td className="px-4 py-3 font-black text-lg text-gray-900">{item.quantity}</td>
                  <td className="px-4 py-3 text-gray-600">AED {Number(item.product?.costPrice ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isLow ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                      {isLow ? '⚠ Low' : '✓ OK'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setAdjusting(item); setAdjQty(''); setAdjNote(''); }} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200">
                      Adjust
                    </button>
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
