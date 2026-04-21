import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePOSStore } from '../store/pos';
import { useAuthStore } from '../store/auth';
import { useShiftStore } from '../store/shift';
import { posApi } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';
import QuickProducts from '../components/QuickProducts';
import ReturnsModal from '../components/ReturnsModal';
import CashMovementModal from '../components/CashMovementModal';
import TimeClock from '../components/TimeClock';
import NumPadModal from '../components/NumPadModal';
import PriceCheckModal from '../components/PriceCheckModal';
import {
  Search, Wifi, WifiOff, User, Tag, DollarSign, RotateCcw,
  Clock, PauseCircle, CheckCircle2, Trash2, FileText, ChevronRight,
  Plus, Minus, X, Keyboard, Star, ShoppingCart, Target, Zap,
  CreditCard, Banknote, Wallet, SplitSquareHorizontal,
} from 'lucide-react';

const localDb = {
  searchProducts: (q: string): Promise<any[]> => (window as any).posAPI?.db?.searchProducts(q) ?? Promise.resolve([]),
  findByBarcode: (barcode: string): Promise<any> => (window as any).posAPI?.db?.findByBarcode(barcode) ?? Promise.resolve(null),
  saveOfflineSale: (sale: any): Promise<void> => (window as any).posAPI?.db?.saveOfflineSale(sale) ?? Promise.resolve(),
};

const DAILY_TARGET_KEY = 'pos-daily-sales-target';

function Kbd({ label }: { label: string }) {
  return (
    <span className="inline-block px-1.5 py-0.5 bg-white/10 text-white/60 rounded text-[9px] font-mono font-bold border border-white/10 leading-none">
      {label}
    </span>
  );
}

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ total, onClose, onComplete }: {
  total: number;
  onClose: () => void;
  onComplete: (payments: any[], pointsUsed: number, tip: number) => void;
}) {
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'WALLET' | 'SPLIT'>('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [cardRef, setCardRef] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [pointsToUse, setPointsToUse] = useState(0);
  const [tipPct, setTipPct] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const { loyaltyPoints } = usePOSStore();

  const tipAmount = customTip ? Number(customTip) : total * (tipPct / 100);
  const pointsDiscount = Math.min(pointsToUse * 0.01, total * 0.1);
  const finalTotal = total - pointsDiscount + tipAmount;
  const change = method === 'CASH' ? Math.max(0, Number(cashGiven) - finalTotal) : 0;
  const canComplete = method !== 'CASH' || Number(cashGiven) >= finalTotal;

  const handleComplete = () => {
    let payments: any[] = [];
    if (method === 'CASH') payments = [{ method: 'CASH', amount: finalTotal - tipAmount, cashGiven: Number(cashGiven), changeDue: change, pointsUsed: pointsToUse }];
    else if (method === 'CARD') payments = [{ method: 'CARD', amount: finalTotal - tipAmount, reference: cardRef }];
    else if (method === 'WALLET') payments = [{ method: 'WALLET', amount: finalTotal - tipAmount }];
    else if (method === 'SPLIT') {
      const cash = Number(splitCash);
      payments = [{ method: 'CASH', amount: cash }, { method: 'CARD', amount: (finalTotal - tipAmount) - cash }];
    }
    onComplete(payments, pointsToUse, tipAmount);
  };

  const quickCash = [Math.ceil(finalTotal / 10) * 10, Math.ceil(finalTotal / 50) * 50, Math.ceil(finalTotal / 100) * 100]
    .filter((v, i, a) => a.indexOf(v) === i && v > finalTotal);

  const METHODS = [
    { id: 'CASH', label: 'Cash', icon: Banknote },
    { id: 'CARD', label: 'Card', icon: CreditCard },
    { id: 'WALLET', label: 'Wallet', icon: Wallet },
    { id: 'SPLIT', label: 'Split', icon: SplitSquareHorizontal },
  ] as const;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold">Payment</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="bg-white/5 rounded-2xl p-4">
            <p className="text-slate-400 text-xs mb-1">Total Due</p>
            <p className="text-white text-4xl font-black">AED {finalTotal.toFixed(2)}</p>
            {pointsDiscount > 0 && <p className="text-emerald-400 text-xs mt-1">Points discount: −AED {pointsDiscount.toFixed(2)}</p>}
            {tipAmount > 0 && <p className="text-indigo-400 text-xs mt-0.5">Tip included: +AED {tipAmount.toFixed(2)}</p>}
          </div>
        </div>

        <div className="p-6 max-h-[65vh] overflow-y-auto space-y-4">
          {/* Payment methods */}
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setMethod(id as any)}
                className={clsx(
                  'flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all text-xs font-semibold',
                  method === id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200' : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50',
                )}>
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {/* Tip */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Tip</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[0, 10, 15, 20].map((pct) => (
                <button key={pct} onClick={() => { setTipPct(pct); setCustomTip(''); }}
                  className={clsx('py-2.5 rounded-xl text-xs font-bold border-2 transition-all', tipPct === pct && !customTip ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 text-gray-600 hover:border-emerald-300')}>
                  {pct === 0 ? 'None' : `${pct}%`}
                </button>
              ))}
              <input type="number" placeholder="AED" value={customTip}
                onChange={(e) => { setCustomTip(e.target.value); setTipPct(0); }}
                className={clsx('py-2.5 px-1.5 rounded-xl text-xs font-bold border-2 text-center focus:outline-none transition-all', customTip ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 placeholder-gray-300 hover:border-gray-300')}
              />
            </div>
          </div>

          {/* Loyalty points */}
          {loyaltyPoints > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
                <Star size={13} fill="currentColor" /> {loyaltyPoints} loyalty points available
              </p>
              <input type="range" min={0} max={Math.min(loyaltyPoints, Math.floor(total * 10))} value={pointsToUse}
                onChange={(e) => setPointsToUse(Number(e.target.value))}
                className="w-full accent-amber-500" />
              <p className="text-xs text-amber-700 mt-1">{pointsToUse} pts = −AED {(pointsToUse * 0.01).toFixed(2)}</p>
            </div>
          )}

          {/* CASH inputs */}
          {method === 'CASH' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Cash Received</label>
                <input type="number" value={cashGiven} onChange={(e) => setCashGiven(e.target.value)}
                  placeholder={`${finalTotal.toFixed(2)}`}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-2xl font-black text-center focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              {quickCash.length > 0 && (
                <div className="flex gap-2">
                  {quickCash.map((v) => (
                    <button key={v} onClick={() => setCashGiven(String(v))}
                      className="flex-1 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 text-gray-700 py-2 rounded-xl text-sm font-semibold transition-colors">
                      {v}
                    </button>
                  ))}
                </div>
              )}
              {Number(cashGiven) >= finalTotal && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 flex justify-between items-center">
                  <span className="text-emerald-700 font-semibold text-sm">Change Due</span>
                  <span className="text-3xl font-black text-emerald-700">AED {change.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {method === 'CARD' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Reference (optional)</label>
              <input value={cardRef} onChange={(e) => setCardRef(e.target.value)} placeholder="Authorization code..."
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          )}

          {method === 'SPLIT' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Cash Portion</label>
              <input type="number" value={splitCash} onChange={(e) => setSplitCash(e.target.value)} placeholder="0.00"
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
              {Number(splitCash) > 0 && (
                <p className="text-xs text-gray-500 mt-1.5 pl-1">Card: AED {((finalTotal - tipAmount) - Number(splitCash)).toFixed(2)}</p>
              )}
            </div>
          )}
        </div>

        {/* Confirm */}
        <div className="px-6 pb-6">
          <button onClick={handleComplete} disabled={!canComplete}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-black py-4 rounded-2xl text-lg transition-all shadow-lg shadow-emerald-100 flex items-center justify-center gap-2">
            <CheckCircle2 size={20} />
            Charge AED {finalTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Customer Modal ────────────────────────────────────────────────────────────
function CustomerModal({ onClose, onSelect }: { onClose: () => void; onSelect: (c: any) => void }) {
  const [tab, setTab] = useState<'search' | 'new'>('search');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const { data } = await posApi.getCustomers({ search: q, limit: 10 });
      setResults(data?.data ?? data ?? []);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => doSearch(search), 300); return () => clearTimeout(t); }, [search, doSearch]);

  const createCustomer = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await posApi.createCustomer({ name: newName.trim(), phone: newPhone || undefined, email: newEmail || undefined });
      onSelect(data);
    } catch { alert('Failed to create customer'); }
    finally { setCreating(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-xl font-bold flex items-center gap-2"><User size={18} />Customer</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20"><X size={16} /></button>
          </div>
          <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-0">
            {(['search', 'new'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={clsx('flex-1 py-2 rounded-lg text-xs font-bold transition-all', tab === t ? 'bg-white text-slate-900' : 'text-white/60 hover:text-white')}>
                {t === 'search' ? 'Find Customer' : 'New Customer'}
              </button>
            ))}
          </div>
        </div>
        <div className="p-6">
          {tab === 'search' ? (
            <>
              <div className="relative mb-3">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or phone..."
                  className="w-full border-2 border-gray-200 rounded-2xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              {loading && <p className="text-center text-gray-400 text-sm py-4">Searching...</p>}
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {results.map((c) => (
                  <button key={c.id} onClick={() => onSelect(c)}
                    className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 border-2 border-transparent rounded-2xl flex justify-between items-center transition-all">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.phone ?? c.email ?? 'No contact'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-amber-600 font-bold flex items-center gap-1"><Star size={10} fill="currentColor" />{c.loyaltyPoints ?? 0} pts</p>
                      <p className="text-xs text-gray-400">AED {Number(c.totalSpent ?? 0).toFixed(0)}</p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => onSelect(null)} className="w-full mt-3 py-2 text-gray-400 hover:text-gray-600 text-sm transition-colors">
                Continue without customer →
              </button>
            </>
          ) : (
            <div className="space-y-3">
              {[
                { val: newName, set: setNewName, placeholder: 'Full name *', type: 'text' },
                { val: newPhone, set: setNewPhone, placeholder: 'Phone number', type: 'tel' },
                { val: newEmail, set: setNewEmail, placeholder: 'Email address', type: 'email' },
              ].map(({ val, set, placeholder, type }) => (
                <input key={placeholder} type={type} value={val} onChange={(e) => set(e.target.value)} placeholder={placeholder}
                  className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500" />
              ))}
              <button onClick={createCustomer} disabled={!newName.trim() || creating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-2xl text-sm transition-colors flex items-center justify-center gap-2">
                <Plus size={16} />{creating ? 'Creating...' : 'Create & Select Customer'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AI Suggestions ────────────────────────────────────────────────────────────
function AISuggestions({ productId, onAdd }: { productId: string; onAdd: (p: any) => void }) {
  const [recs, setRecs] = useState<any[]>([]);
  useEffect(() => {
    if (!productId) return;
    posApi.getRecommendations?.(productId).then(({ data }) => setRecs(data?.recommendations?.slice(0, 3) ?? [])).catch(() => {});
  }, [productId]);
  if (!recs.length) return null;
  return (
    <div className="bg-indigo-950/5 border border-indigo-200/60 rounded-2xl p-3 flex items-center gap-3">
      <div className="w-7 h-7 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
        <Zap size={14} className="text-indigo-600" />
      </div>
      <p className="text-xs font-semibold text-indigo-700 shrink-0">Often bought with:</p>
      <div className="flex gap-2 flex-wrap">
        {recs.map((r) => (
          <button key={r.productId}
            onClick={() => posApi.getProducts?.({ search: r.name }).then(({ data }) => { const p = (data?.data ?? [])[0]; if (p) onAdd(p); })}
            className="px-3 py-1.5 bg-white border border-indigo-200 rounded-xl text-xs font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
            + {r.name}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Held Sales ────────────────────────────────────────────────────────────────
function HeldSalesPanel({ onClose }: { onClose: () => void }) {
  const { heldSales, resumeSale, deleteHeld } = usePOSStore();
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <h2 className="text-white font-bold text-lg flex items-center gap-2"><PauseCircle size={18} />Held Sales</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20"><X size={16} /></button>
        </div>
        <div className="p-5">
          {heldSales.length === 0 ? (
            <div className="text-center py-10 text-gray-300">
              <PauseCircle size={40} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No held sales</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {heldSales.map((h) => (
                <div key={h.id} className="flex items-center justify-between bg-gray-50 rounded-2xl p-4 border border-gray-100">
                  <div>
                    <p className="font-bold text-sm text-gray-900">{h.customerName ?? 'Walk-in customer'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{h.items.length} items · AED {h.items.reduce((s: number, i: any) => s + i.total, 0).toFixed(2)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { resumeSale(h.id); onClose(); }} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold">Resume</button>
                    <button onClick={() => deleteHeld(h.id)} className="px-3 py-1.5 bg-red-100 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-200">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Shortcuts Help ────────────────────────────────────────────────────────────
function ShortcutsHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ['F2', 'Customer lookup'], ['F3', 'Hold sale'], ['F4', 'Returns'],
    ['F5', 'Cash movement'], ['F6', 'Price check'], ['F7', 'Time clock'],
    ['F8', 'Held sales'], ['F9', 'Charge / Pay'], ['Shift+Del', 'Clear cart'],
  ];
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
          <h2 className="text-white font-bold flex items-center gap-2"><Keyboard size={16} />Shortcuts</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-2">
          {shortcuts.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-gray-600">{desc}</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-mono font-bold border border-slate-200">{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Daily Target ──────────────────────────────────────────────────────────────
function DailyTargetWidget({ salesTotal }: { salesTotal: number }) {
  const [target, setTarget] = useState(() => Number(localStorage.getItem(DAILY_TARGET_KEY) || 0));
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const saveTarget = () => {
    const v = Number(draft);
    if (v > 0) { localStorage.setItem(DAILY_TARGET_KEY, String(v)); setTarget(v); }
    setEditing(false);
  };

  const pct = target > 0 ? Math.min(100, (salesTotal / target) * 100) : 0;
  const reached = pct >= 100;

  if (!target && !editing) {
    return (
      <button onClick={() => { setEditing(true); setDraft(''); }}
        className="w-full text-left text-[11px] text-white/40 hover:text-white/70 flex items-center gap-1.5 py-1 transition-colors">
        <Target size={11} />Set daily sales target
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex gap-2 items-center">
        <input autoFocus type="number" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveTarget(); if (e.key === 'Escape') setEditing(false); }}
          placeholder="Target AED..." className="flex-1 bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none placeholder-white/30" />
        <button onClick={saveTarget} className="px-2 py-1.5 bg-indigo-500 text-white rounded-lg text-xs font-bold">Set</button>
        <button onClick={() => setEditing(false)} className="text-white/40 text-xs"><X size={12} /></button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1"><Target size={10} />Daily Target</span>
        <button onClick={() => { setEditing(true); setDraft(String(target)); }} className="text-[10px] text-white/40 hover:text-white/70">edit</button>
      </div>
      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-700', reached ? 'bg-emerald-400' : pct > 70 ? 'bg-amber-400' : 'bg-indigo-400')} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[10px]">
        <span className={reached ? 'text-emerald-400 font-bold' : 'text-white/50'}>
          {reached ? '🎯 Target reached!' : `AED ${salesTotal.toFixed(0)} / ${target.toLocaleString()}`}
        </span>
        <span className="text-white/40">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

// ─── Main POS Screen ───────────────────────────────────────────────────────────
export default function POSScreen() {
  const store = usePOSStore();
  const { user } = useAuthStore();
  const { recordSale, salesTotal } = useShiftStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showPayment, setShowPayment] = useState(false);
  const [showCustomer, setShowCustomer] = useState(false);
  const [showHeld, setShowHeld] = useState(false);
  const [showReturns, setShowReturns] = useState(false);
  const [showCash, setShowCash] = useState(false);
  const [showTimeClock, setShowTimeClock] = useState(false);
  const [showPriceCheck, setShowPriceCheck] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [numPadTarget, setNumPadTarget] = useState<{ productId: string; current: number } | null>(null);
  const [editingNoteFor, setEditingNoteFor] = useState<string | null>(null);
  const [receiptText, setReceiptText] = useState<string | null>(null);
  const [lastProductId, setLastProductId] = useState('');
  const [saleSuccess, setSaleSuccess] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    const cleanup = (window as any).posAPI?.onBarcodeScanned((barcode: string) => handleBarcode(barcode));
    return cleanup;
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') (e.target as HTMLInputElement).blur();
        return;
      }
      switch (e.key) {
        case 'F2': e.preventDefault(); setShowCustomer(true); break;
        case 'F3': e.preventDefault(); store.holdSale(); break;
        case 'F4': e.preventDefault(); setShowReturns(true); break;
        case 'F5': e.preventDefault(); setShowCash(true); break;
        case 'F6': e.preventDefault(); setShowPriceCheck(true); break;
        case 'F7': e.preventDefault(); setShowTimeClock(true); break;
        case 'F8': e.preventDefault(); if (store.heldSales.length > 0) setShowHeld(true); break;
        case 'F9': e.preventDefault(); if (store.cart.length > 0) setShowPayment(true); break;
        case 'Delete': if (e.shiftKey) { e.preventDefault(); store.clearCart(); } break;
        case 'Escape':
          setShowPayment(false); setShowCustomer(false); setShowHeld(false);
          setShowReturns(false); setShowCash(false); setShowTimeClock(false);
          setShowPriceCheck(false); setShowShortcuts(false);
          break;
        case '?': setShowShortcuts(true); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [store]);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const { data } = isOnline ? await posApi.searchProducts(q) : { data: { data: await localDb.searchProducts(q) } };
      setSearchResults(data?.data ?? []);
    } catch {
      setSearchResults(await localDb.searchProducts(q));
    } finally { setSearching(false); }
  }, [isOnline]);

  useEffect(() => {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => doSearch(searchQuery), 250);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery, doSearch]);

  const handleBarcode = async (barcode: string) => {
    try {
      const { data } = await posApi.getProductByBarcode(barcode);
      store.addToCart(data); setLastProductId(data.id);
    } catch {
      const cached = await localDb.findByBarcode(barcode);
      if (cached) { store.addToCart(cached); setLastProductId(cached.id); }
    }
  };

  const addToCart = (product: any) => {
    store.addToCart(product);
    setLastProductId(product.id);
    setSearchQuery('');
    setSearchResults([]);
    searchRef.current?.focus();
  };

  const generateReceiptText = (sale: any) =>
    ['      DDOTSMEDIA POS SYSTEM      ',
      `Date: ${new Date().toLocaleString()}`,
      `Receipt: ${sale.receiptNumber}`,
      `Cashier: ${user?.name ?? 'Staff'}`,
      '─'.repeat(34),
      ...sale.items.map((i: any) => `${i.name.substring(0, 22).padEnd(22)} ${i.quantity}x ${Number(i.unitPrice).toFixed(2)}${i.note ? `\n  ** ${i.note}` : ''}`),
      '─'.repeat(34),
      `Subtotal: AED ${Number(sale.subtotal).toFixed(2)}`,
      `Discount: AED ${Number(sale.discountAmount).toFixed(2)}`,
      `VAT (5%): AED ${Number(sale.taxAmount).toFixed(2)}`,
      sale.tip > 0 ? `Tip:      AED ${Number(sale.tip).toFixed(2)}` : null,
      `TOTAL:    AED ${Number(sale.total).toFixed(2)}`,
      '─'.repeat(34),
      '      Thank you for shopping!      ',
    ].filter(Boolean).join('\n');

  const handleCompleteSale = async (payments: any[], pointsUsed: number, tip: number) => {
    store.setTip(tip);
    const { cart, customerId, notes, subtotal, taxAmount, discountAmount, total } = store;
    const branchId = localStorage.getItem('branchId') || 'branch-main';
    const sale = {
      branchId, customerId: customerId ?? undefined, notes: notes || undefined,
      discountAmount: discountAmount(), tip,
      items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: i.discount, note: i.note })),
      payments,
    };
    try {
      let completedSale: any;
      if (isOnline) {
        const { data } = await posApi.createSale(sale);
        completedSale = data;
      } else {
        const offlineSale = { id: uuidv4(), receiptNumber: `RCP-OFFLINE-${Date.now()}`, ...sale, subtotal: subtotal(), taxAmount: taxAmount(), total: total(), isOffline: true };
        await localDb.saveOfflineSale(offlineSale);
        completedSale = offlineSale;
      }
      setReceiptText(generateReceiptText({ ...completedSale, items: cart, subtotal: subtotal(), discountAmount: discountAmount(), taxAmount: taxAmount(), total: total(), tip }));
      setSaleSuccess(true);
      (window as any).posAPI?.printReceipt(receiptText);
      (window as any).posAPI?.openCashDrawer();
      recordSale(store.total());
      setTimeout(() => { setSaleSuccess(false); store.clearCart(); setShowPayment(false); searchRef.current?.focus(); }, 2500);
    } catch (e: any) { alert(`Sale failed: ${e.response?.data?.message ?? e.message}`); }
  };

  const { cart, customerId, customerName, notes, heldSales, globalDiscount, tip } = store;
  const itemCount = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex h-full bg-slate-100 overflow-hidden">
      {/* Sale success overlay */}
      {saleSuccess && (
        <div className="fixed inset-0 bg-emerald-600 flex items-center justify-center z-[100]">
          <div className="text-center text-white">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={52} strokeWidth={1.5} />
            </div>
            <p className="text-5xl font-black mb-2">Sale Complete!</p>
            <p className="text-2xl opacity-80">AED {store.total().toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* ── Left column ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top toolbar */}
        <div className="bg-slate-900 px-4 py-2.5 flex items-center gap-2 shrink-0">
          {/* Brand */}
          <div className="flex items-center gap-2 mr-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">P</span>
            </div>
            <span className="text-white font-bold text-sm hidden lg:block">Ddotsmedia POS</span>
          </div>

          {/* Status */}
          <div className={clsx('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0', isOnline ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400')}>
            {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>

          {/* Customer badge */}
          {customerId && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/40 text-amber-300 rounded-full text-[11px] font-semibold">
              <Star size={10} fill="currentColor" />
              <span>{customerName}</span>
              <button onClick={() => store.setCustomer(null, null, 0)} className="text-amber-500 hover:text-amber-200 ml-0.5"><X size={10} /></button>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-1 ml-auto">
            {[
              { icon: User, label: 'Customer', key: 'F2', onClick: () => setShowCustomer(true), color: 'hover:bg-slate-700' },
              { icon: Tag, label: 'Price', key: 'F6', onClick: () => setShowPriceCheck(true), color: 'hover:bg-indigo-900/50' },
              { icon: DollarSign, label: 'Cash', key: 'F5', onClick: () => setShowCash(true), color: 'hover:bg-emerald-900/50' },
              { icon: RotateCcw, label: 'Return', key: 'F4', onClick: () => setShowReturns(true), color: 'hover:bg-red-900/50' },
              { icon: Clock, label: 'Clock', key: 'F7', onClick: () => setShowTimeClock(true), color: 'hover:bg-purple-900/50' },
            ].map(({ icon: Icon, label, key, onClick, color }) => (
              <button key={label} onClick={onClick}
                className={clsx('flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-slate-400 hover:text-white transition-all text-[11px] font-medium', color)}>
                <Icon size={13} />
                <span className="hidden xl:block">{label}</span>
                <Kbd label={key} />
              </button>
            ))}
            {heldSales.length > 0 && (
              <button onClick={() => setShowHeld(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-900/40 text-amber-400 hover:bg-amber-900/60 transition-all text-[11px] font-semibold">
                <PauseCircle size={13} />{heldSales.length} held <Kbd label="F8" />
              </button>
            )}
            <button onClick={() => setShowShortcuts(true)} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-colors">
              <Keyboard size={13} />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            )}
            <input
              ref={searchRef}
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product name, barcode, or SKU..."
              className="w-full pl-11 pr-12 py-3 rounded-2xl border-2 border-white text-[15px] focus:outline-none focus:border-indigo-400 bg-white shadow-sm font-medium placeholder-slate-400 text-slate-800"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-2xl z-20 max-h-64 overflow-y-auto">
                {searchResults.map((p) => (
                  <button key={p.id} onClick={() => addToCart(p)}
                    className="w-full text-left px-5 py-3 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex items-center justify-between transition-colors">
                    <div>
                      <span className="font-semibold text-slate-900 text-sm">{p.name}</span>
                      {p.barcode && <span className="ml-2 text-xs text-slate-400 font-mono">{p.barcode}</span>}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-indigo-600 font-bold text-sm">AED {Number(p.sellingPrice ?? p.selling_price).toFixed(2)}</p>
                      {p.inventory?.[0] && <p className="text-xs text-slate-400">Stock: {p.inventory[0].quantity}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Products */}
        <div className="px-4 shrink-0">
          <QuickProducts onAdd={addToCart} />
        </div>

        {/* AI Suggestions */}
        {lastProductId && (
          <div className="px-4 shrink-0">
            <AISuggestions productId={lastProductId} onAdd={addToCart} />
          </div>
        )}

        {/* Cart */}
        <div className="flex-1 mx-4 mb-3 mt-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-200 gap-3">
              <ShoppingCart size={52} strokeWidth={1} />
              <p className="text-base font-semibold text-slate-400">Cart is empty</p>
              <p className="text-xs text-slate-300">Search for a product or scan a barcode</p>
            </div>
          ) : (
            <div className="h-full overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Product</th>
                    <th className="text-center px-2 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-28">Qty</th>
                    <th className="text-right px-2 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Price</th>
                    <th className="text-center px-2 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide w-20">Disc%</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">Total</th>
                    <th className="w-14" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {cart.map((item) => (
                    <React.Fragment key={item.productId}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          {item.barcode && <p className="text-xs text-slate-400 font-mono mt-0.5">{item.barcode}</p>}
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => store.updateQty(item.productId, item.quantity - 1)}
                              className="w-6 h-6 bg-red-100 text-red-500 rounded-lg font-bold text-xs hover:bg-red-200 transition-colors flex items-center justify-center">
                              <Minus size={10} />
                            </button>
                            <button onClick={() => setNumPadTarget({ productId: item.productId, current: item.quantity })}
                              className="w-8 text-center font-bold text-slate-900 hover:bg-indigo-50 rounded-lg py-0.5 transition-colors text-sm">
                              {item.quantity}
                            </button>
                            <button onClick={() => store.updateQty(item.productId, item.quantity + 1)}
                              className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg font-bold text-xs hover:bg-emerald-200 transition-colors flex items-center justify-center">
                              <Plus size={10} />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-3 text-right text-slate-600">{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-2 py-3 text-center">
                          <input type="number" min={0} max={100} value={item.discount}
                            onChange={(e) => store.updateItemDiscount(item.productId, Number(e.target.value))}
                            className="w-12 text-center border border-slate-200 rounded-lg px-1 py-0.5 text-xs focus:outline-none focus:border-indigo-400 bg-slate-50" />
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">AED {item.total.toFixed(2)}</td>
                        <td className="pr-3 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setEditingNoteFor(editingNoteFor === item.productId ? null : item.productId)}
                              className={clsx('w-6 h-6 rounded-lg flex items-center justify-center transition-colors', item.note ? 'bg-indigo-100 text-indigo-500' : 'text-slate-200 hover:text-slate-400 hover:bg-slate-100')}>
                              <FileText size={12} />
                            </button>
                            <button onClick={() => store.removeFromCart(item.productId)}
                              className="w-6 h-6 rounded-lg flex items-center justify-center text-red-300 hover:bg-red-100 hover:text-red-500 transition-colors">
                              <X size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {editingNoteFor === item.productId && (
                        <tr className="bg-indigo-50/50">
                          <td colSpan={6} className="px-4 py-2">
                            <div className="flex items-center gap-2">
                              <input autoFocus value={item.note || ''} onChange={(e) => store.updateItemNote(item.productId, e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setEditingNoteFor(null); }}
                                placeholder="Add note (e.g. no ice, extra sauce)..."
                                className="flex-1 text-xs border border-indigo-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-indigo-400 bg-white" />
                              <button onClick={() => setEditingNoteFor(null)} className="text-xs text-indigo-500 font-semibold px-2 hover:text-indigo-700">Done</button>
                            </div>
                          </td>
                        </tr>
                      )}
                      {item.note && editingNoteFor !== item.productId && (
                        <tr className="bg-indigo-50/30">
                          <td colSpan={6} className="px-4 pb-2">
                            <p className="text-xs text-indigo-500 italic flex items-center gap-1.5"><FileText size={10} />{item.note}</p>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div className="px-4 pb-3 shrink-0">
            <input value={notes} onChange={(e) => store.setNotes(e.target.value)}
              placeholder="Order notes..."
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-400 bg-white placeholder-slate-400" />
          </div>
        )}
      </div>

      {/* ── Right panel (Order Summary) ── */}
      <div className="w-72 bg-slate-900 flex flex-col shrink-0">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-bold text-base">Order Summary</h2>
            <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', itemCount > 0 ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white/40')}>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </span>
          </div>
          {user && <p className="text-slate-500 text-xs mt-0.5">Cashier: {user.name}</p>}
        </div>

        {/* Totals */}
        <div className="flex-1 px-5 py-4 space-y-2.5 overflow-y-auto">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Subtotal</span>
            <span className="text-white font-medium">AED {store.subtotal().toFixed(2)}</span>
          </div>

          {/* Discount */}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 flex items-center gap-1.5">
              Discount
              <input type="number" min={0} max={100} value={globalDiscount}
                onChange={(e) => store.setGlobalDiscount(Number(e.target.value))}
                className="w-10 bg-white/10 border border-white/10 text-white text-center rounded-lg px-1 py-0.5 text-xs focus:outline-none focus:border-indigo-400" />%
            </span>
            <span className="text-red-400 font-medium">−AED {store.discountAmount().toFixed(2)}</span>
          </div>

          {/* Quick discount presets */}
          <div className="flex gap-1.5">
            {[5, 10, 15, 20].map((pct) => (
              <button key={pct} onClick={() => store.setGlobalDiscount(globalDiscount === pct ? 0 : pct)}
                className={clsx('flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all', globalDiscount === pct ? 'bg-red-600 border-red-600 text-white' : 'border-white/10 text-slate-500 hover:border-red-400 hover:text-red-400')}>
                -{pct}%
              </button>
            ))}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-slate-400">VAT (5%)</span>
            <span className="text-white font-medium">AED {store.taxAmount().toFixed(2)}</span>
          </div>

          {tip > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Tip</span>
              <span className="text-emerald-400 font-medium">+AED {tip.toFixed(2)}</span>
            </div>
          )}

          {/* Total */}
          <div className="border-t border-white/10 pt-3 mt-1">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-base">Total</span>
              <span className="text-white font-black text-2xl">AED {store.total().toFixed(2)}</span>
            </div>
          </div>

          {/* Daily target */}
          <div className="border-t border-white/5 pt-3">
            <DailyTargetWidget salesTotal={salesTotal} />
          </div>

          {/* Receipt */}
          {receiptText && (
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-slate-500 mb-1.5 flex items-center gap-1"><FileText size={10} />Last Receipt</p>
              <pre className="text-[9px] text-slate-400 whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">{receiptText}</pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 space-y-2.5 shrink-0">
          {/* Charge button */}
          <button
            onClick={() => { if (cart.length > 0) setShowPayment(true); }}
            disabled={cart.length === 0}
            className={clsx(
              'w-full py-4 rounded-2xl font-black text-base transition-all flex items-center justify-center gap-2',
              cart.length > 0
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 active:scale-[0.98]'
                : 'bg-white/5 text-white/20 cursor-not-allowed',
            )}
          >
            {cart.length === 0 ? (
              <><ShoppingCart size={18} />Add Items</>
            ) : (
              <><CheckCircle2 size={18} />Charge AED {store.total().toFixed(2)} <Kbd label="F9" /></>
            )}
          </button>

          {/* Secondary actions */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => store.holdSale()} disabled={cart.length === 0}
              className="py-2.5 bg-white/5 hover:bg-amber-900/40 text-slate-400 hover:text-amber-400 rounded-xl text-xs font-semibold disabled:opacity-30 transition-all flex items-center justify-center gap-1.5">
              <PauseCircle size={13} />Hold <Kbd label="F3" />
            </button>
            <button onClick={() => store.clearCart()} disabled={cart.length === 0}
              className="py-2.5 bg-white/5 hover:bg-red-950/50 text-slate-400 hover:text-red-400 rounded-xl text-xs font-semibold disabled:opacity-30 transition-all flex items-center justify-center gap-1.5">
              <Trash2 size={13} />Clear <Kbd label="⇧Del" />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showPayment && (
        <PaymentModal
          total={store.subtotal() * (1 - globalDiscount / 100) + store.taxAmount()}
          onClose={() => setShowPayment(false)}
          onComplete={handleCompleteSale}
        />
      )}
      {showCustomer && (
        <CustomerModal
          onClose={() => setShowCustomer(false)}
          onSelect={(c) => { if (c) store.setCustomer(c.id, c.name, c.loyaltyPoints ?? 0); else store.setCustomer(null, null, 0); setShowCustomer(false); }}
        />
      )}
      {showHeld && <HeldSalesPanel onClose={() => setShowHeld(false)} />}
      {showReturns && <ReturnsModal onClose={() => setShowReturns(false)} />}
      {showCash && <CashMovementModal onClose={() => setShowCash(false)} />}
      {showTimeClock && <TimeClock onClose={() => setShowTimeClock(false)} />}
      {showPriceCheck && <PriceCheckModal onClose={() => setShowPriceCheck(false)} />}
      {showShortcuts && <ShortcutsHelp onClose={() => setShowShortcuts(false)} />}
      {numPadTarget && (
        <NumPadModal
          title="Enter Quantity"
          subtitle={cart.find((i) => i.productId === numPadTarget.productId)?.name}
          initial={numPadTarget.current}
          onConfirm={(v) => store.updateQty(numPadTarget.productId, v)}
          onClose={() => setNumPadTarget(null)}
          maxValue={999}
        />
      )}
    </div>
  );
}
