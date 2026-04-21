import React, { useState } from 'react';
import { useShiftStore } from '../store/shift';

interface Props { onClose: () => void; }

const REASONS_IN = ['Opening float add', 'Safe transfer', 'Petty cash', 'Other'];
const REASONS_OUT = ['Vendor payment', 'Staff expense', 'Petty cash', 'Bank deposit', 'Other'];

export default function CashMovementModal({ onClose }: Props) {
  const { addCashMovement, getCashIn, getCashOut, openingFloat, salesTotal, getExpectedCash, cashMovements } = useShiftStore();
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [saved, setSaved] = useState(false);

  const reasons = type === 'IN' ? REASONS_IN : REASONS_OUT;

  const handleSave = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return;
    const finalReason = reason === 'Other' ? customReason || 'Other' : reason;
    if (!finalReason) return;
    addCashMovement(type, amt, finalReason);
    setSaved(true);
    setTimeout(() => { setSaved(false); setAmount(''); setReason(''); setCustomReason(''); }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">Cash Management</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="p-6 space-y-4">
          {/* Cash Status */}
          <div className="grid grid-cols-3 gap-3 mb-2">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 font-semibold uppercase">Opening</p>
              <p className="font-black text-gray-900 text-sm mt-1">AED {openingFloat.toFixed(0)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 font-semibold uppercase">Cash In</p>
              <p className="font-black text-green-800 text-sm mt-1">+AED {getCashIn().toFixed(0)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-3 text-center">
              <p className="text-xs text-red-600 font-semibold uppercase">Cash Out</p>
              <p className="font-black text-red-800 text-sm mt-1">-AED {getCashOut().toFixed(0)}</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm font-semibold text-blue-800">Expected in Drawer</span>
            <span className="font-black text-blue-900 text-base">AED {getExpectedCash().toFixed(2)}</span>
          </div>

          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setType('IN')}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${type === 'IN' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              + Pay In
            </button>
            <button onClick={() => setType('OUT')}
              className={`py-3 rounded-xl font-bold text-sm transition-all ${type === 'OUT' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              − Pay Out
            </button>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Amount (AED)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-xl font-bold focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Reason</label>
            <div className="grid grid-cols-2 gap-2">
              {reasons.map((r) => (
                <button key={r} onClick={() => setReason(r)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border-2 ${reason === r ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {r}
                </button>
              ))}
            </div>
            {reason === 'Other' && (
              <input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Enter reason..."
                className="mt-2 w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
              />
            )}
          </div>

          {saved && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 font-semibold text-sm">
              ✓ Cash movement recorded
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!amount || !reason || (reason === 'Other' && !customReason)}
            className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-colors disabled:opacity-40 ${type === 'IN' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
          >
            {type === 'IN' ? `+ Record Pay In — AED ${Number(amount || 0).toFixed(2)}` : `− Record Pay Out — AED ${Number(amount || 0).toFixed(2)}`}
          </button>

          {/* Movement log */}
          {cashMovements.length > 0 && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Today's Movements</p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {cashMovements.map((m) => (
                  <div key={m.id} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{m.reason}</span>
                    <span className={`font-bold ${m.type === 'IN' ? 'text-green-700' : 'text-red-600'}`}>
                      {m.type === 'IN' ? '+' : '-'}AED {m.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
