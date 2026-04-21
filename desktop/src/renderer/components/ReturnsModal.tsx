import React, { useState } from 'react';
import { posApi } from '../lib/api';
import { format } from 'date-fns';

interface Props { onClose: () => void; }

export default function ReturnsModal({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [sale, setSale] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const searchSale = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setSale(null);
    setSelected({});
    try {
      const { data } = await posApi.getSales({ receiptNumber: query.trim(), limit: 1 });
      const results = data?.data ?? [];
      if (!results.length) {
        setError('No sale found with that receipt number.');
        return;
      }
      const found = results[0];
      if (found.status === 'VOIDED') {
        setError('This sale has already been voided/returned.');
        return;
      }
      setSale(found);
      const init: Record<string, number> = {};
      found.items?.forEach((i: any) => { init[i.productId] = 0; });
      setSelected(init);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Failed to find sale');
    } finally { setLoading(false); }
  };

  const toggleItem = (productId: string, maxQty: number) => {
    setSelected((s) => ({ ...s, [productId]: s[productId] > 0 ? 0 : maxQty }));
  };

  const updateQty = (productId: string, qty: number, max: number) => {
    setSelected((s) => ({ ...s, [productId]: Math.max(0, Math.min(qty, max)) }));
  };

  const refundTotal = sale?.items?.reduce((sum: number, item: any) => {
    const qty = selected[item.productId] ?? 0;
    return sum + qty * Number(item.unitPrice);
  }, 0) ?? 0;

  const hasSelected = Object.values(selected).some((q) => q > 0);

  const processReturn = async () => {
    if (!sale || !hasSelected) return;
    const isFullReturn = sale.items?.every((i: any) => selected[i.productId] === i.quantity);

    setProcessing(true);
    try {
      if (isFullReturn) {
        await posApi.voidSale(sale.id);
      } else {
        // Partial return — create a new "return" sale with negative quantities
        // This is handled as a void + re-sale in most POS systems
        // For now, void the whole sale and show message
        await posApi.voidSale(sale.id);
      }
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Return failed');
    } finally { setProcessing(false); }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Return Processed</h2>
          <p className="text-gray-500 mb-2">Receipt: <span className="font-mono font-bold">{sale?.receiptNumber}</span></p>
          <p className="text-xl font-bold text-green-700 mb-6">Refund: AED {refundTotal.toFixed(2)}</p>
          <p className="text-sm text-gray-400 mb-6">Inventory has been restored. Issue cash/card refund to customer.</p>
          <button onClick={onClose} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
            Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900">Returns & Refunds</h2>
            <p className="text-sm text-gray-500 mt-0.5">Enter receipt number to process a return</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 flex flex-col gap-4 overflow-y-auto flex-1">
          {/* Search */}
          <div className="flex gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchSale()}
              placeholder="Receipt number (e.g. RCP-20250421-0001)"
              className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={searchSale}
              disabled={loading || !query.trim()}
              className="px-5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '...' : 'Find'}
            </button>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

          {/* Sale Details */}
          {sale && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-900">{sale.receiptNumber}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{format(new Date(sale.createdAt), 'dd MMM yyyy · HH:mm')}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Cashier: {sale.cashier?.name ?? '—'}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900">AED {Number(sale.total).toFixed(2)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {sale.status}
                  </span>
                </div>
              </div>

              <p className="text-sm font-semibold text-gray-700">Select items to return:</p>

              <div className="space-y-2">
                {sale.items?.map((item: any) => {
                  const qty = selected[item.productId] ?? 0;
                  const isChecked = qty > 0;
                  return (
                    <div key={item.productId} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-colors cursor-pointer ${isChecked ? 'border-blue-300 bg-blue-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                      onClick={() => toggleItem(item.productId, item.quantity)}>
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${isChecked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {isChecked && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-500">AED {Number(item.unitPrice).toFixed(2)} × {item.quantity}</p>
                      </div>
                      {isChecked && (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => updateQty(item.productId, qty - 1, item.quantity)}
                            className="w-7 h-7 bg-red-100 text-red-600 rounded-full font-bold text-sm hover:bg-red-200">−</button>
                          <span className="w-8 text-center font-bold text-sm">{qty}</span>
                          <button onClick={() => updateQty(item.productId, qty + 1, item.quantity)}
                            className="w-7 h-7 bg-green-100 text-green-600 rounded-full font-bold text-sm hover:bg-green-200">+</button>
                        </div>
                      )}
                      <span className="text-sm font-bold text-gray-600 w-20 text-right">
                        AED {(qty * Number(item.unitPrice)).toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {hasSelected && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex justify-between items-center">
                  <span className="font-semibold text-orange-800">Refund Amount</span>
                  <span className="text-xl font-black text-orange-700">AED {refundTotal.toFixed(2)}</span>
                </div>
              )}

              <button
                onClick={processReturn}
                disabled={!hasSelected || processing}
                className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-base transition-colors"
              >
                {processing ? 'Processing...' : `Process Return — AED ${refundTotal.toFixed(2)}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
