import React, { useState } from 'react';
import { ShiftSummary } from '../store/shift';
import { format } from 'date-fns';

interface Props {
  summary: ShiftSummary;
  onClose: () => void;
}

export default function ZReport({ summary, onClose }: Props) {
  const [actualCash, setActualCash] = useState('');
  const duration = Math.round((new Date(summary.endTime).getTime() - new Date(summary.startTime).getTime()) / 60000);
  const hours = Math.floor(duration / 60);
  const mins = duration % 60;
  const variance = actualCash ? Number(actualCash) - summary.expectedCash : null;

  const printReport = () => {
    const lines = [
      '==============================',
      '        Z-REPORT / EOD        ',
      '==============================',
      `Shift ID: ${summary.shiftId.slice(0, 8)}`,
      `Date:     ${format(new Date(summary.startTime), 'dd/MM/yyyy')}`,
      `Open:     ${format(new Date(summary.startTime), 'HH:mm:ss')}`,
      `Close:    ${format(new Date(summary.endTime), 'HH:mm:ss')}`,
      `Duration: ${hours}h ${mins}m`,
      '------------------------------',
      `Opening Float:  AED ${summary.openingFloat.toFixed(2)}`,
      `Sales Total:    AED ${summary.salesTotal.toFixed(2)}`,
      `Transactions:   ${summary.salesCount}`,
      `Cash In:        AED ${summary.cashIn.toFixed(2)}`,
      `Cash Out:       AED ${summary.cashOut.toFixed(2)}`,
      '------------------------------',
      `Expected Cash:  AED ${summary.expectedCash.toFixed(2)}`,
      actualCash ? `Actual Cash:    AED ${Number(actualCash).toFixed(2)}` : '',
      variance !== null ? `Variance:       AED ${variance.toFixed(2)} ${variance >= 0 ? 'OVER' : 'SHORT'}` : '',
      '------------------------------',
      ...(summary.movements.length > 0 ? [
        'Cash Movements:',
        ...summary.movements.map((m) => `  ${m.type === 'IN' ? '+' : '-'} AED ${m.amount.toFixed(2)} — ${m.reason}`),
      ] : []),
      '==============================',
    ].filter(Boolean).join('\n');

    (window as any).posAPI?.printReceipt(lines);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-2xl p-6 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📊</span>
            <div>
              <h2 className="text-xl font-black">Z-Report / End of Shift</h2>
              <p className="text-gray-400 text-sm">{format(new Date(summary.startTime), 'dd MMM yyyy')} · {hours}h {mins}m shift</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Shift KPIs */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Sales Total</p>
              <p className="text-xl font-black text-blue-800 mt-1">AED {summary.salesTotal.toFixed(0)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Transactions</p>
              <p className="text-xl font-black text-green-800 mt-1">{summary.salesCount}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Avg Sale</p>
              <p className="text-xl font-black text-purple-800 mt-1">
                AED {summary.salesCount > 0 ? (summary.salesTotal / summary.salesCount).toFixed(0) : '0'}
              </p>
            </div>
          </div>

          {/* Cash Reconciliation */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5">
            <h3 className="font-bold text-gray-800 mb-3">Cash Reconciliation</h3>
            {[
              { label: 'Opening Float', value: summary.openingFloat, color: '' },
              { label: 'Cash Sales', value: summary.salesTotal, color: 'text-green-700' },
              { label: 'Cash In', value: summary.cashIn, color: 'text-green-600' },
              { label: 'Cash Out', value: -summary.cashOut, color: 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-sm">
                <span className="text-gray-600">{label}</span>
                <span className={`font-semibold ${color || 'text-gray-900'}`}>
                  {value < 0 ? '-' : ''}AED {Math.abs(value).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-200 pt-2 flex justify-between">
              <span className="font-bold text-gray-800">Expected in Drawer</span>
              <span className="font-black text-gray-900 text-base">AED {summary.expectedCash.toFixed(2)}</span>
            </div>
          </div>

          {/* Actual Cash Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Actual Cash in Drawer (AED)</label>
            <input
              type="number"
              value={actualCash}
              onChange={(e) => setActualCash(e.target.value)}
              placeholder="Enter counted amount..."
              min="0"
              step="0.01"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-blue-500"
            />
            {variance !== null && (
              <div className={`mt-2 p-3 rounded-xl flex justify-between items-center ${Math.abs(variance) < 0.01 ? 'bg-green-50 border border-green-200' : variance > 0 ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
                <span className="text-sm font-semibold">{Math.abs(variance) < 0.01 ? '✓ Balanced' : variance > 0 ? 'Cash Over' : 'Cash Short'}</span>
                <span className={`font-black ${Math.abs(variance) < 0.01 ? 'text-green-700' : variance > 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {variance > 0 ? '+' : ''}AED {variance.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Cash Movements */}
          {summary.movements.length > 0 && (
            <div className="bg-white border-2 border-gray-100 rounded-xl overflow-hidden">
              <p className="px-4 py-3 text-sm font-bold text-gray-700 border-b border-gray-100">Cash Movements During Shift</p>
              {summary.movements.map((m) => (
                <div key={m.id} className="flex justify-between items-center px-4 py-2.5 border-b border-gray-50 last:border-0 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${m.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {m.type === 'IN' ? '+' : '−'}
                    </span>
                    <span className="text-gray-700">{m.reason}</span>
                  </div>
                  <span className={`font-bold ${m.type === 'IN' ? 'text-green-700' : 'text-red-600'}`}>
                    {m.type === 'IN' ? '+' : '-'}AED {m.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={printReport}
              className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
            >
              🖨 Print Report
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Done — Close Shift
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
