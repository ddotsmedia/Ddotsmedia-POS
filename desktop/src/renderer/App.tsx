import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/auth';
import { useShiftStore } from './store/shift';
import LoginScreen from './screens/Login';
import ShiftOpen from './screens/ShiftOpen';
import POSScreen from './screens/POS';
import InventoryScreen from './screens/InventoryScreen';
import ReportsScreen from './screens/ReportsScreen';
import AIScreen from './screens/AIScreen';
import SettingsScreen from './screens/SettingsScreen';
import clsx from 'clsx';

type Screen = 'pos' | 'inventory' | 'reports' | 'ai' | 'settings';

const NAV: { id: Screen; label: string; icon: string }[] = [
  { id: 'pos', label: 'POS', icon: '🛒' },
  { id: 'inventory', label: 'Stock', icon: '📦' },
  { id: 'reports', label: 'Reports', icon: '📊' },
  { id: 'ai', label: 'AI', icon: '🤖' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
];

export default function App() {
  const { isAuthenticated, user, refreshUser } = useAuthStore();
  const { isOpen: shiftOpen, salesTotal, salesCount } = useShiftStore();
  const [screen, setScreen] = useState<Screen>('pos');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (isAuthenticated && !user) refreshUser();
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, [isAuthenticated]);

  if (!isAuthenticated) return <LoginScreen />;
  if (!shiftOpen) return <ShiftOpen />;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden select-none">
      {/* Sidebar */}
      <div className="w-[72px] bg-gray-900 flex flex-col items-center py-4 gap-1">
        <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center mb-2">
          <span className="text-white text-xs font-black leading-none">POS</span>
        </div>

        {NAV.map((item) => (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            title={item.label}
            className={clsx(
              'w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all',
              screen === item.id ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white',
            )}
          >
            <span className="text-lg leading-none">{item.icon}</span>
            <span className="text-[9px] font-semibold">{item.label}</span>
          </button>
        ))}

        {/* Shift summary pill */}
        <div className="mt-auto mb-1 flex flex-col items-center gap-1 px-1">
          <div className="text-center">
            <p className="text-[8px] text-gray-500 leading-none">SHIFT</p>
            <p className="text-[9px] text-green-400 font-bold">{salesCount} sales</p>
            <p className="text-[8px] text-gray-400">AED {salesTotal.toFixed(0)}</p>
          </div>
          <div
            className={clsx('w-2.5 h-2.5 rounded-full mt-1', isOnline ? 'bg-green-400' : 'bg-orange-400')}
            title={isOnline ? 'Online' : 'Offline'}
          />
          <span className="text-[8px] text-gray-500">{isOnline ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {screen === 'pos' && <POSScreen />}
        {screen === 'inventory' && <InventoryScreen />}
        {screen === 'reports' && <ReportsScreen />}
        {screen === 'ai' && <AIScreen />}
        {screen === 'settings' && <SettingsScreen onSwitchScreen={setScreen} />}
      </div>
    </div>
  );
}
