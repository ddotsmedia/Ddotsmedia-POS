import React, { useState, useRef, useEffect } from 'react';
import { posApi } from '../lib/api';

interface Props { onClose: () => void; }

export default function PriceCheckModal({ onClose }: Props) {
  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim()) { setProduct(null); setError(''); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        // Try barcode first, then search
        try {
          const { data } = await posApi.getProductByBarcode(query.trim());
          setProduct(data);
        } catch {
          const { data } = await posApi.searchProducts(query.trim());
          const list = data?.data ?? data ?? [];
          if (list.length === 0) { setError('No product found'); setProduct(null); }
          else setProduct(list[0]);
        }
      } catch {
        setError('Lookup failed');
        setProduct(null);
      } finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const price = product ? Number(product.sellingPrice ?? product.selling_price ?? 0) : 0;
  const qty = product?.inventory?.[0]?.quantity ?? null;
  const cost = product ? Number(product.costPrice ?? product.cost_price ?? 0) : 0;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Price Check</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg">🔍</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Scan barcode or type product name..."
              className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6 text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-6 text-gray-400">
              <p className="text-3xl mb-2">🔎</p>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          {product && !loading && (
            <div className="bg-blue-50 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0">
                  {product.category?.icon ?? product.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 leading-tight">{product.name}</p>
                  {product.barcode && <p className="text-xs text-gray-400 font-mono mt-0.5">{product.barcode}</p>}
                  {product.category?.name && <p className="text-xs text-blue-600 font-semibold mt-0.5">{product.category.name}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Price</p>
                  <p className="text-lg font-black text-blue-700 mt-0.5">AED {price.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Stock</p>
                  <p className={`text-lg font-black mt-0.5 ${qty === null ? 'text-gray-400' : qty <= 0 ? 'text-red-600' : qty <= 5 ? 'text-orange-500' : 'text-green-600'}`}>
                    {qty === null ? '—' : qty}
                  </p>
                </div>
                <div className="bg-white rounded-xl p-3 text-center">
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Cost</p>
                  <p className="text-lg font-black text-gray-600 mt-0.5">{cost > 0 ? `AED ${cost.toFixed(2)}` : '—'}</p>
                </div>
              </div>

              {product.description && (
                <p className="text-xs text-gray-500 leading-relaxed">{product.description}</p>
              )}
            </div>
          )}

          <p className="text-center text-xs text-gray-400">Press Escape to close</p>
        </div>
      </div>
    </div>
  );
}
