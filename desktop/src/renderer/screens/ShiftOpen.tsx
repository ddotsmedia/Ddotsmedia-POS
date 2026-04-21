import React, { useState } from 'react';
import { useShiftStore } from '../store/shift';
import { useAuthStore } from '../store/auth';

export default function ShiftOpen() {
  const [float, setFloat] = useState('');
  const [counted, setCounted] = useState<Record<string, string>>({});
  const { openShift } = useShiftStore();
  const { user, logout } = useAuthStore();

  const denominations = [500, 200, 100, 50, 20, 10, 5, 1, 0.5, 0.25];
  const countedTotal = denominations.reduce((sum, d) => sum + Number(counted[String(d)] || 0) * d, 0);

  const handleOpen = () => {
    const amount = Object.keys(counted).length > 0 ? countedTotal : Number(float);
    if (amount < 0) return;
    openShift(amount);
  };

  const [mode, setMode] = useState<'simple' | 'count'>('simple');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-2xl p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <span className="text-3xl">💼</span>
          </div>
          <h1 className="text-2xl font-black">Open Shift</h1>
          <p className="text-blue-200 text-sm mt-1">
            {new Date().toLocaleDateString('en-AE', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div className="p-6 space-y-5">
          {user && (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
                {user.name[0].toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500">{user.role} · {user.email}</p>
              </div>
            </div>
          )}

          {/* Mode selector */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setMode('simple')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'simple' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              Enter Total
            </button>
            <button onClick={() => setMode('count')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'count' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
              Count Bills
            </button>
          </div>

          {mode === 'simple' ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Opening Float (AED)</label>
              <input
                type="number"
                value={float}
                onChange={(e) => setFloat(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-2xl font-bold text-center focus:outline-none focus:border-blue-500"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm font-semibold text-gray-700">Count Cash Denominations</p>
                <p className="text-lg font-black text-blue-600">AED {countedTotal.toFixed(2)}</p>
              </div>
              {denominations.map((d) => (
                <div key={d} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-semibold text-gray-600 text-right">
                    {d >= 1 ? `AED ${d}` : `${d * 100} fils`}
                  </span>
                  <span className="text-gray-400">×</span>
                  <input
                    type="number"
                    min="0"
                    value={counted[String(d)] || ''}
                    onChange={(e) => setCounted((c) => ({ ...c, [String(d)]: e.target.value }))}
                    placeholder="0"
                    className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-blue-500 text-center"
                  />
                  <span className="w-20 text-sm text-gray-500 text-right">
                    = AED {(Number(counted[String(d)] || 0) * d).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleOpen}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-lg transition-colors"
          >
            Open Shift — AED {mode === 'count' ? countedTotal.toFixed(2) : (Number(float) || 0).toFixed(2)}
          </button>

          <button
            onClick={logout}
            className="w-full text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
          >
            ← Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
