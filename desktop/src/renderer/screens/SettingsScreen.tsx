import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { useShiftStore, ShiftSummary } from '../store/shift';
import ZReport from '../components/ZReport';
import { format } from 'date-fns';

interface Props {
  onSwitchScreen?: (screen: any) => void;
}

export default function SettingsScreen({ onSwitchScreen }: Props) {
  const { user, logout } = useAuthStore();
  const shift = useShiftStore();
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [cacheLoading, setCacheLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [printerTest, setPrinterTest] = useState('');
  const [zReport, setZReport] = useState<ShiftSummary | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    (window as any).posAPI?.getSyncStatus().then(setSyncStatus).catch(() => {});
  }, []);

  const flashMsg = (msg: string) => { setMessage(msg); setTimeout(() => setMessage(''), 4000); };

  const handleSync = async () => {
    setSyncLoading(true);
    try {
      const result = await (window as any).posAPI?.syncOfflineData();
      setSyncStatus(result);
      flashMsg(`Sync complete: ${result?.synced ?? 0} synced, ${result?.failed ?? 0} failed`);
    } catch (e: any) { flashMsg(`Sync error: ${e.message}`); }
    finally { setSyncLoading(false); }
  };

  const refreshCache = async () => {
    setCacheLoading(true);
    try {
      const result = await (window as any).posAPI?.pullCatalog();
      flashMsg(`Product cache updated: ${result?.count ?? 0} products`);
    } catch (e: any) { flashMsg(`Cache error: ${e.message}`); }
    finally { setCacheLoading(false); }
  };

  const testPrinter = async () => {
    const testReceipt = `TEST RECEIPT\n${new Date().toLocaleString()}\n${'─'.repeat(30)}\nTest Item            1x AED 9.99\n${'─'.repeat(30)}\nTOTAL:    AED 9.99\nPrinter test OK`;
    const result = await (window as any).posAPI?.printReceipt(testReceipt);
    setPrinterTest(result?.success ? '✓ Printer OK' : `✗ ${result?.error ?? 'No printer found'}`);
    setTimeout(() => setPrinterTest(''), 5000);
  };

  const testDrawer = async () => {
    await (window as any).posAPI?.openCashDrawer();
    setPrinterTest('Cash drawer signal sent');
    setTimeout(() => setPrinterTest(''), 3000);
  };

  const handleCloseShift = () => {
    const summary = shift.closeShift();
    if (summary) setZReport(summary);
    setShowCloseConfirm(false);
  };

  const shiftDuration = shift.startTime
    ? Math.round((Date.now() - new Date(shift.startTime).getTime()) / 60000)
    : 0;
  const shiftHours = Math.floor(shiftDuration / 60);
  const shiftMins = shiftDuration % 60;

  return (
    <div className="flex flex-col h-full p-5 gap-5 overflow-y-auto">
      <h1 className="text-2xl font-black text-gray-900">Settings</h1>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${message.includes('error') || message.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {message}
        </div>
      )}

      {/* User Profile */}
      <Section title="Profile">
        {user && (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-xl font-black">
              {user.name[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
              <span className="inline-block mt-1 px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">{user.role}</span>
            </div>
            <button onClick={logout} className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 transition-colors">
              Sign Out
            </button>
          </div>
        )}
      </Section>

      {/* Shift Management */}
      <Section title="Shift Management">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-semibold uppercase">Duration</p>
              <p className="font-black text-blue-900 mt-1">{shiftHours}h {shiftMins}m</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 font-semibold uppercase">Sales</p>
              <p className="font-black text-green-900 mt-1">{shift.salesCount} txn</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-purple-600 font-semibold uppercase">Total</p>
              <p className="font-black text-purple-900 mt-1">AED {shift.salesTotal.toFixed(0)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <div>
              <p className="text-sm font-semibold text-gray-800">Opening Float</p>
              <p className="text-xs text-gray-500">Started {shift.startTime ? format(new Date(shift.startTime), 'HH:mm') : '—'}</p>
            </div>
            <p className="font-black text-gray-900">AED {shift.openingFloat.toFixed(2)}</p>
          </div>

          {showCloseConfirm ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-red-800">Close this shift? You'll see the Z-report with cash reconciliation.</p>
              <div className="flex gap-2">
                <button onClick={handleCloseShift} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-colors">
                  Yes, Close Shift
                </button>
                <button onClick={() => setShowCloseConfirm(false)} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCloseConfirm(true)}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
            >
              🔒 Close Shift & Print Z-Report
            </button>
          )}
        </div>
      </Section>

      {/* Sync */}
      <Section title="Offline Sync">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Pending offline sales: <span className="font-bold text-orange-600">{syncStatus?.pendingCount ?? 0}</span></p>
            <p className="text-xs text-gray-400 mt-0.5">Sales created offline will sync when connected</p>
          </div>
          <button onClick={handleSync} disabled={syncLoading} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {syncLoading ? 'Syncing...' : '↑ Sync Now'}
          </button>
        </div>
      </Section>

      {/* Product Cache */}
      <Section title="Product Cache">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700">Local SQLite cache for offline product search</p>
            <p className="text-xs text-gray-400 mt-0.5">Products are cached from the server for offline use</p>
          </div>
          <button onClick={refreshCache} disabled={cacheLoading} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors">
            {cacheLoading ? 'Refreshing...' : '↻ Refresh Cache'}
          </button>
        </div>
      </Section>

      {/* Cash Movements */}
      {shift.cashMovements.length > 0 && (
        <Section title="Cash Movements This Shift">
          <div className="space-y-2">
            {shift.cashMovements.map((m) => (
              <div key={m.id} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${m.type === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                    {m.type === 'IN' ? '+' : '−'}
                  </span>
                  <span className="text-gray-700">{m.reason}</span>
                  <span className="text-xs text-gray-400">{format(new Date(m.time), 'HH:mm')}</span>
                </div>
                <span className={`font-bold ${m.type === 'IN' ? 'text-green-700' : 'text-red-600'}`}>
                  {m.type === 'IN' ? '+' : '-'}AED {m.amount.toFixed(2)}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-2 flex justify-between text-sm">
              <span className="font-semibold text-gray-700">Expected in Drawer</span>
              <span className="font-black text-gray-900">AED {shift.getExpectedCash().toFixed(2)}</span>
            </div>
          </div>
        </Section>
      )}

      {/* Printer & Hardware */}
      <Section title="Hardware">
        <div className="space-y-3">
          {printerTest && (
            <div className={`px-3 py-2 rounded-xl text-sm font-medium ${printerTest.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
              {printerTest}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={testPrinter} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
              🖨 Test Printer
            </button>
            <button onClick={testDrawer} className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-semibold transition-colors">
              💰 Test Cash Drawer
            </button>
          </div>
          <p className="text-xs text-gray-400">Printer uses ESC/POS via serial port. Configure COM port in system settings.</p>
        </div>
      </Section>

      {/* Quick Links */}
      <Section title="Quick Links">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => (window as any).posAPI?.openAdminPanel?.()}
            className="flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-colors text-left"
          >
            <span className="text-2xl">🌐</span>
            <div>
              <p className="font-bold text-blue-800 text-sm">Admin Panel</p>
              <p className="text-xs text-blue-500">localhost:3001</p>
            </div>
          </button>
          <button
            onClick={() => (window as any).posAPI?.openExternal?.('http://localhost:5100/health')}
            className="flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl transition-colors text-left"
          >
            <span className="text-2xl">📡</span>
            <div>
              <p className="font-bold text-green-800 text-sm">API Status</p>
              <p className="text-xs text-green-500">localhost:5100</p>
            </div>
          </button>
        </div>
      </Section>

      {/* System Info */}
      <Section title="System Information">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['Version', '1.0.0'],
            ['API Server', 'localhost:5100'],
            ['Database', 'PostgreSQL (Docker)'],
            ['Local DB', 'SQLite (sql.js)'],
            ['AI Engine', 'GPT-4o (OpenAI)'],
            ['Framework', 'Electron 30 + React 18'],
          ].map(([k, v]) => (
            <div key={k} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{k}</p>
              <p className="font-semibold text-gray-800 mt-1">{v}</p>
            </div>
          ))}
        </div>
      </Section>

      {zReport && <ZReport summary={zReport} onClose={() => setZReport(null)} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
      <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-4">{title}</h3>
      {children}
    </div>
  );
}
