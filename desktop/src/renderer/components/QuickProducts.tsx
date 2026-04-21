'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { posApi } from '../lib/api';
import clsx from 'clsx';

// ─── helpers ──────────────────────────────────────────────────────────────────

const FALLBACK_COLORS = [
  '#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444',
  '#06B6D4','#EC4899','#84CC16','#F97316','#6366F1',
];

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

function stockLabel(qty: number, min: number) {
  if (qty <= 0) return { label: 'Out', cls: 'bg-red-100 text-red-600' };
  if (qty <= min) return { label: `Low (${qty})`, cls: 'bg-orange-100 text-orange-600' };
  return { label: `${qty}`, cls: 'bg-green-100 text-green-700' };
}

const FAVS_KEY = 'pos-favourite-products';
const RECENT_KEY = 'pos-recent-products';
const MAX_RECENT = 12;

function getFavs(): string[] { try { return JSON.parse(localStorage.getItem(FAVS_KEY) || '[]'); } catch { return []; } }
function saveFavs(ids: string[]) { localStorage.setItem(FAVS_KEY, JSON.stringify(ids)); }

function getRecent(): any[] { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; } }
function pushRecent(product: any) {
  const list = getRecent().filter((p) => p.id !== product.id);
  list.unshift({ id: product.id, name: product.name, sellingPrice: product.sellingPrice ?? product.selling_price, barcode: product.barcode, sku: product.sku, categoryId: product.categoryId, inventory: product.inventory, minStockAlert: product.minStockAlert, allowNegative: product.allowNegative, category: product.category });
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

type SortKey = 'default' | 'name' | 'price-asc' | 'price-desc' | 'stock';

function sortProducts(list: any[], key: SortKey): any[] {
  if (key === 'default') return list;
  return [...list].sort((a, b) => {
    if (key === 'name') return a.name.localeCompare(b.name);
    if (key === 'price-asc') return Number(a.sellingPrice ?? a.selling_price ?? 0) - Number(b.sellingPrice ?? b.selling_price ?? 0);
    if (key === 'price-desc') return Number(b.sellingPrice ?? b.selling_price ?? 0) - Number(a.sellingPrice ?? a.selling_price ?? 0);
    if (key === 'stock') {
      const qa = a.inventory?.[0]?.quantity ?? 0;
      const qb = b.inventory?.[0]?.quantity ?? 0;
      return qb - qa;
    }
    return 0;
  });
}

// ─── ProductTile ──────────────────────────────────────────────────────────────

interface TileProps {
  product: any;
  color: string;
  onAdd: (p: any) => void;
  isFav: boolean;
  onToggleFav: (id: string) => void;
  viewMode: 'grid' | 'list';
}

function ProductTile({ product: p, color, onAdd, isFav, onToggleFav, viewMode }: TileProps) {
  const [pressed, setPressed] = useState(false);
  const inv = p.inventory?.[0];
  const qty = inv ? inv.quantity - (inv.reservedQty ?? 0) : null;
  const minStock = p.minStockAlert ?? 5;
  const stock = qty !== null ? stockLabel(qty, minStock) : null;
  const price = Number(p.sellingPrice ?? p.selling_price ?? 0);
  const outOfStock = qty !== null && qty <= 0 && !p.allowNegative;

  const handleAdd = () => {
    if (outOfStock) return;
    onAdd(p);
    pushRecent(p);
  };

  if (viewMode === 'list') {
    return (
      <button
        onClick={handleAdd}
        disabled={outOfStock}
        className={clsx(
          'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 text-left transition-all',
          outOfStock ? 'opacity-50 cursor-not-allowed border-gray-100 bg-gray-50' : 'border-gray-100 bg-white hover:border-blue-200 hover:bg-blue-50 active:scale-[0.99]',
        )}
      >
        {/* Color dot */}
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center text-white text-sm font-black"
          style={{ backgroundColor: color }}>
          {p.category?.icon ?? p.name[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm truncate">{p.name}</p>
          {(p.barcode || p.sku) && <p className="text-xs text-gray-400 font-mono">{p.sku || p.barcode}</p>}
        </div>
        {stock && <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0', stock.cls)}>{outOfStock ? 'OUT' : stock.label}</span>}
        <div className="text-right flex-shrink-0">
          <p className="font-black text-gray-900 text-sm">AED {price.toFixed(2)}</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFav(p.id); }}
          className={clsx('text-base transition-colors flex-shrink-0', isFav ? 'text-yellow-400' : 'text-gray-200 hover:text-yellow-300')}
        >★</button>
      </button>
    );
  }

  return (
    <button
      onClick={handleAdd}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      disabled={outOfStock}
      className={clsx(
        'relative rounded-2xl p-3 text-left transition-all flex flex-col',
        outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg active:scale-95 cursor-pointer',
        pressed && !outOfStock ? 'scale-95' : '',
      )}
      style={{ backgroundColor: color, minHeight: '90px' }}
    >
      {/* Favourite star */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleFav(p.id); }}
        className="absolute top-2 right-2 text-sm leading-none transition-opacity z-10"
        style={{ color: isFav ? '#FCD34D' : 'rgba(255,255,255,0.4)' }}
      >★</button>

      {/* Out of stock overlay */}
      {outOfStock && (
        <div className="absolute inset-0 rounded-2xl bg-black/20 flex items-center justify-center">
          <span className="bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">OUT</span>
        </div>
      )}

      {/* Category icon or first letter */}
      <span className="text-xl leading-none mb-1">{p.category?.icon ?? '📦'}</span>

      {/* Name */}
      <p className="text-xs font-bold text-white leading-tight line-clamp-2 flex-1">{p.name}</p>

      {/* Bottom row */}
      <div className="flex items-end justify-between mt-2 gap-1">
        <p className="text-sm font-black text-white">AED {price.toFixed(0)}</p>
        {stock && !outOfStock && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white shrink-0">
            {stock.label}
          </span>
        )}
      </div>

      {/* SKU chip */}
      {p.sku && (
        <p className="text-[8px] text-white/60 font-mono mt-0.5 truncate">{p.sku}</p>
      )}
    </button>
  );
}

// ─── Category scroll arrow ────────────────────────────────────────────────────
function ScrollArrow({ dir, onClick, visible }: { dir: 'left' | 'right'; onClick: () => void; visible: boolean }) {
  if (!visible) return null;
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-7 h-full flex items-center justify-center bg-white hover:bg-gray-50 text-gray-400 hover:text-gray-600 border-r border-gray-100 z-10 transition-colors"
      style={dir === 'right' ? { borderRight: 'none', borderLeft: '1px solid #f3f4f6' } : {}}
    >
      {dir === 'left' ? '‹' : '›'}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type PanelSize = 'compact' | 'expanded' | 'hidden';

interface Props { onAdd: (product: any) => void; }

export default function QuickProducts({ onAdd }: Props) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [products, setProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [recentProducts, setRecentProducts] = useState<any[]>(getRecent);
  const [loading, setLoading] = useState(false);
  const [panelSize, setPanelSize] = useState<PanelSize>('compact');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortKey, setSortKey] = useState<SortKey>('default');
  const [favIds, setFavIds] = useState<string[]>(getFavs);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

  // Load categories once
  useEffect(() => {
    posApi.getCategories().then(({ data }) => {
      const cats = Array.isArray(data) ? data : (data?.data ?? []);
      setCategories(cats);
    }).catch(() => {});
  }, []);

  // Load products when category changes
  useEffect(() => {
    if (selectedCat === 'recent') return; // handled from localStorage
    setLoading(true);
    const params = selectedCat === 'all' || selectedCat === 'favs'
      ? { limit: 80 }
      : { categoryId: selectedCat, limit: 60 };

    posApi.getProducts(params)
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.data ?? []);
        if (selectedCat === 'all') setAllProducts(list);
        setProducts(list);
      })
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [selectedCat]);

  // Check scroll arrows whenever categories load or tab bar resizes
  const checkScroll = useCallback(() => {
    const el = tabBarRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [categories, checkScroll]);

  const scrollTabs = (dir: 'left' | 'right') => {
    const el = tabBarRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -140 : 140, behavior: 'smooth' });
    setTimeout(checkScroll, 200);
  };

  const toggleFav = useCallback((id: string) => {
    setFavIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveFavs(next);
      return next;
    });
  }, []);

  const handleAdd = useCallback((product: any) => {
    onAdd(product);
    pushRecent(product);
    setRecentProducts(getRecent());
  }, [onAdd]);

  // Derived: visible products
  const visible = (() => {
    let base: any[];
    if (selectedCat === 'recent') {
      base = recentProducts;
    } else if (selectedCat === 'favs') {
      base = allProducts.length
        ? allProducts.filter((p) => favIds.includes(p.id))
        : products.filter((p) => favIds.includes(p.id));
    } else {
      base = products;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      base = base.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q),
      );
    }
    return sortProducts(base, sortKey);
  })();

  const getCatColor = (cat: any, idx: number) => cat?.color ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

  const getProductColor = (p: any) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    const idx = categories.findIndex((c) => c.id === p.categoryId);
    return getCatColor(cat, idx);
  };

  const panelHeight = panelSize === 'compact' ? '320px' : panelSize === 'expanded' ? '520px' : undefined;
  const cols = viewMode === 'grid' ? (panelSize === 'expanded' ? 'grid-cols-5' : 'grid-cols-4') : '';

  if (panelSize === 'hidden') {
    return (
      <button
        onClick={() => setPanelSize('compact')}
        className="w-full bg-white border-2 border-dashed border-gray-200 rounded-xl py-2 text-xs text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
      >
        ▼ Quick Products
      </button>
    );
  }

  const SPECIAL_TABS = [
    { id: 'all', name: 'All', icon: '🏪', color: '#6B7280' },
    { id: 'recent', name: 'Recent', icon: '🕐', color: '#3B82F6' },
    { id: 'favs', name: 'Favs', icon: '⭐', color: '#F59E0B' },
  ];

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden flex flex-col" style={{ maxHeight: panelHeight }}>
      {/* ── Category Bar ── */}
      <div className="flex items-center border-b border-gray-100" style={{ minHeight: '40px' }}>
        <ScrollArrow dir="left" onClick={() => scrollTabs('left')} visible={canScrollLeft} />

        <div
          ref={tabBarRef}
          className="flex items-center flex-1 overflow-x-auto"
          style={{ scrollbarWidth: 'none' }}
          onScroll={checkScroll}
        >
          {/* Special tabs */}
          {SPECIAL_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setSelectedCat(tab.id); setSearch(''); }}
              className={clsx(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap',
                selectedCat === tab.id
                  ? 'border-b-2 text-white'
                  : 'border-transparent text-gray-500 hover:bg-gray-50',
              )}
              style={selectedCat === tab.id ? { borderBottomColor: tab.color, backgroundColor: `rgba(${hexToRgb(tab.color)},0.1)`, color: tab.color } : {}}
            >
              <span>{tab.icon}</span>
              <span>{tab.name}</span>
              {tab.id === 'favs' && favIds.length > 0 && (
                <span className="bg-yellow-400 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {favIds.length}
                </span>
              )}
              {tab.id === 'recent' && recentProducts.length > 0 && (
                <span className="bg-blue-400 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                  {recentProducts.length}
                </span>
              )}
            </button>
          ))}

          <div className="w-px h-6 bg-gray-100 flex-shrink-0" />

          {/* Real categories */}
          {categories.map((cat, i) => {
            const color = getCatColor(cat, i);
            const active = selectedCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCat(cat.id); setSearch(''); }}
                className={clsx(
                  'flex-shrink-0 flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold transition-all border-b-2 whitespace-nowrap',
                  active ? 'border-b-2' : 'border-transparent text-gray-500 hover:bg-gray-50',
                )}
                style={active ? {
                  borderBottomColor: color,
                  backgroundColor: `rgba(${hexToRgb(color)}, 0.08)`,
                  color,
                } : {}}
              >
                {cat.icon && <span className="text-sm">{cat.icon}</span>}
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        <ScrollArrow dir="right" onClick={() => scrollTabs('right')} visible={canScrollRight} />

        {/* Controls */}
        <div className="flex items-center gap-0.5 px-2 border-l border-gray-100 flex-shrink-0">
          {/* Sort */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-[10px] text-gray-500 border-0 bg-transparent focus:outline-none cursor-pointer py-1 pr-1"
            title="Sort products"
          >
            <option value="default">Sort</option>
            <option value="name">A–Z</option>
            <option value="price-asc">$ Low</option>
            <option value="price-desc">$ High</option>
            <option value="stock">Stock</option>
          </select>

          <button
            onClick={() => setViewMode((v) => v === 'grid' ? 'list' : 'grid')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title={viewMode === 'grid' ? 'List view' : 'Grid view'}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>

          <button
            onClick={() => setPanelSize((s) => s === 'compact' ? 'expanded' : 'compact')}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title={panelSize === 'compact' ? 'Expand' : 'Compact'}
          >
            {panelSize === 'compact' ? '⛶' : '⊟'}
          </button>

          <button
            onClick={() => setPanelSize('hidden')}
            className="p-1.5 text-gray-300 hover:text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
            title="Collapse"
          >
            ▲
          </button>
        </div>
      </div>

      {/* ── Search + sort bar ── */}
      <div className="px-3 pt-2 pb-1 border-b border-gray-50">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter items by name, barcode or SKU..."
            className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 bg-gray-50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">×</button>
          )}
        </div>
      </div>

      {/* ── Product area ── */}
      <div className="flex-1 overflow-y-auto p-2.5">
        {loading ? (
          <div className={clsx(viewMode === 'grid' ? `grid ${cols} gap-2` : 'space-y-1.5')}>
            {Array.from({ length: viewMode === 'grid' ? (panelSize === 'expanded' ? 10 : 8) : 5 }).map((_, i) => (
              <div key={i} className={clsx('bg-gray-100 rounded-xl animate-pulse', viewMode === 'grid' ? 'h-[90px]' : 'h-11')} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-gray-400">
            <span className="text-3xl mb-2">
              {selectedCat === 'favs' ? '⭐' : selectedCat === 'recent' ? '🕐' : '📦'}
            </span>
            <p className="text-xs font-semibold text-center">
              {selectedCat === 'favs'
                ? 'No favourites yet — click ★ on any product to pin it'
                : selectedCat === 'recent'
                ? 'No recent products — they appear here after you add them to cart'
                : search
                ? `No products matching "${search}"`
                : 'No products in this category'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`grid ${cols} gap-2`}>
            {visible.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                color={getProductColor(p)}
                onAdd={handleAdd}
                isFav={favIds.includes(p.id)}
                onToggleFav={toggleFav}
                viewMode="grid"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {visible.map((p) => (
              <ProductTile
                key={p.id}
                product={p}
                color={getProductColor(p)}
                onAdd={handleAdd}
                isFav={favIds.includes(p.id)}
                onToggleFav={toggleFav}
                viewMode="list"
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Footer count ── */}
      <div className="px-3 py-1.5 border-t border-gray-50 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          {visible.length} item{visible.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
        </span>
        <div className="flex items-center gap-3">
          {favIds.length > 0 && (
            <span className="text-[10px] text-yellow-600 font-semibold">⭐ {favIds.length} saved</span>
          )}
          {recentProducts.length > 0 && (
            <span className="text-[10px] text-blue-500 font-semibold">🕐 {recentProducts.length} recent</span>
          )}
        </div>
      </div>
    </div>
  );
}
