import React, { useState, useEffect } from 'react';

interface Props {
  title: string;
  subtitle?: string;
  initial?: number;
  onConfirm: (value: number) => void;
  onClose: () => void;
  allowDecimal?: boolean;
  maxValue?: number;
}

export default function NumPadModal({ title, subtitle, initial = 0, onConfirm, onClose, allowDecimal = false, maxValue }: Props) {
  const [input, setInput] = useState(initial > 0 ? String(initial) : '');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') press(e.key);
      else if (e.key === '.' && allowDecimal) press('.');
      else if (e.key === 'Backspace') del();
      else if (e.key === 'Enter') confirm();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [input]);

  const press = (v: string) => {
    if (v === '.' && (input.includes('.') || !allowDecimal)) return;
    const next = input + v;
    if (maxValue !== undefined && Number(next) > maxValue) return;
    setInput(next);
  };

  const del = () => setInput((s) => s.slice(0, -1));
  const clear = () => setInput('');
  const confirm = () => {
    const v = Number(input);
    if (v > 0) { onConfirm(v); onClose(); }
  };

  const BUTTONS = [
    ['7','8','9'],
    ['4','5','6'],
    ['1','2','3'],
    [allowDecimal ? '.' : '00','0','⌫'],
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-72" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-gray-900">{title}</h3>
              {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-2xl leading-none">×</button>
          </div>
          {/* Display */}
          <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-right">
            <span className="text-3xl font-black text-gray-900">{input || '0'}</span>
          </div>
        </div>

        {/* Pad */}
        <div className="p-3 space-y-1.5">
          {BUTTONS.map((row, ri) => (
            <div key={ri} className="grid grid-cols-3 gap-1.5">
              {row.map((btn) => (
                <button
                  key={btn}
                  onClick={() => btn === '⌫' ? del() : press(btn)}
                  className={`h-14 rounded-xl text-xl font-bold transition-all active:scale-95 ${
                    btn === '⌫'
                      ? 'bg-red-50 text-red-500 hover:bg-red-100'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          ))}

          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <button onClick={clear} className="h-12 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-all">
              Clear
            </button>
            <button
              onClick={confirm}
              disabled={!input || Number(input) <= 0}
              className="h-12 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-40 transition-all"
            >
              ✓ Set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
