import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { format, differenceInMinutes, differenceInSeconds } from 'date-fns';

const CLOCK_KEY = 'pos-timeclock-entries';
const ACTIVE_KEY = 'pos-timeclock-active';

interface ClockEntry {
  id: string;
  userId: string;
  userName: string;
  clockIn: string;
  clockOut?: string;
  breakMinutes: number;
}

interface ActiveSession {
  userId: string;
  userName: string;
  clockIn: string;
  onBreak: boolean;
  breakStart?: string;
  breakMinutes: number;
}

function getEntries(): ClockEntry[] { try { return JSON.parse(localStorage.getItem(CLOCK_KEY) || '[]'); } catch { return []; } }
function getActive(): ActiveSession | null { try { return JSON.parse(localStorage.getItem(ACTIVE_KEY) || 'null'); } catch { return null; } }
function saveActive(s: ActiveSession | null) { localStorage.setItem(ACTIVE_KEY, JSON.stringify(s)); }
function saveEntry(e: ClockEntry) {
  const entries = getEntries().filter((x) => x.id !== e.id);
  localStorage.setItem(CLOCK_KEY, JSON.stringify([e, ...entries].slice(0, 100)));
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function TimeClock({ onClose }: { onClose: () => void }) {
  const { user } = useAuthStore();
  const [active, setActive] = useState<ActiveSession | null>(getActive);
  const [entries, setEntries] = useState<ClockEntry[]>(getEntries);
  const [elapsed, setElapsed] = useState(0);
  const [confirmAction, setConfirmAction] = useState<'clockout' | null>(null);

  // Live timer
  useEffect(() => {
    const id = setInterval(() => {
      if (!active) return;
      const totalSecs = differenceInSeconds(new Date(), new Date(active.clockIn));
      const breakSecs = active.breakMinutes * 60 + (active.onBreak && active.breakStart ? differenceInSeconds(new Date(), new Date(active.breakStart)) : 0);
      setElapsed(Math.max(0, totalSecs - breakSecs));
    }, 1000);
    return () => clearInterval(id);
  }, [active]);

  const clockIn = () => {
    if (!user) return;
    const session: ActiveSession = {
      userId: user.id,
      userName: user.name,
      clockIn: new Date().toISOString(),
      onBreak: false,
      breakMinutes: 0,
    };
    saveActive(session);
    setActive(session);
  };

  const toggleBreak = () => {
    if (!active) return;
    let updated: ActiveSession;
    if (active.onBreak && active.breakStart) {
      const breakMins = active.breakMinutes + differenceInMinutes(new Date(), new Date(active.breakStart));
      updated = { ...active, onBreak: false, breakStart: undefined, breakMinutes: breakMins };
    } else {
      updated = { ...active, onBreak: true, breakStart: new Date().toISOString() };
    }
    saveActive(updated);
    setActive(updated);
  };

  const clockOut = () => {
    if (!active) return;
    const breakMins = active.breakMinutes + (active.onBreak && active.breakStart ? differenceInMinutes(new Date(), new Date(active.breakStart)) : 0);
    const entry: ClockEntry = {
      id: crypto.randomUUID(),
      userId: active.userId,
      userName: active.userName,
      clockIn: active.clockIn,
      clockOut: new Date().toISOString(),
      breakMinutes: breakMins,
    };
    saveEntry(entry);
    saveActive(null);
    setActive(null);
    setEntries(getEntries());
    setConfirmAction(null);
  };

  const isSelf = active?.userId === user?.id;
  const elapsedH = Math.floor(elapsed / 3600);
  const elapsedM = Math.floor((elapsed % 3600) / 60);
  const elapsedS = elapsed % 60;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-black text-gray-900">Time Clock</h2>
            <p className="text-xs text-gray-400 mt-0.5">{user?.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Active session */}
          {active ? (
            <div className={`rounded-2xl p-5 text-center ${active.onBreak ? 'bg-orange-50 border-2 border-orange-200' : 'bg-green-50 border-2 border-green-200'}`}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 ${active.onBreak ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                <span className={`w-2 h-2 rounded-full animate-pulse ${active.onBreak ? 'bg-orange-500' : 'bg-green-500'}`} />
                {active.onBreak ? 'On Break' : 'Clocked In'}
              </div>
              <p className="text-4xl font-black text-gray-900 font-mono tracking-tight">
                {String(elapsedH).padStart(2, '0')}:{String(elapsedM).padStart(2, '0')}:{String(elapsedS).padStart(2, '0')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Since {format(new Date(active.clockIn), 'HH:mm')}
                {active.breakMinutes > 0 && ` · ${active.breakMinutes}m break`}
              </p>

              {isSelf && (
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={toggleBreak}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${active.onBreak ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'}`}
                  >
                    {active.onBreak ? '▶ End Break' : '⏸ Start Break'}
                  </button>
                  {confirmAction === 'clockout' ? (
                    <div className="flex-1 flex gap-1">
                      <button onClick={clockOut} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700">Confirm</button>
                      <button onClick={() => setConfirmAction(null)} className="px-3 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmAction('clockout')} className="flex-1 py-2.5 rounded-xl bg-red-50 text-red-600 text-sm font-bold hover:bg-red-100 border border-red-200">
                      🔴 Clock Out
                    </button>
                  )}
                </div>
              )}

              {!isSelf && (
                <p className="text-xs text-gray-500 mt-3">Clocked in as: <strong>{active.userName}</strong></p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 p-6 text-center">
              <p className="text-4xl mb-2">⏰</p>
              <p className="text-sm font-semibold text-gray-600 mb-4">Not clocked in</p>
              <button
                onClick={clockIn}
                className="w-full py-3.5 bg-green-600 hover:bg-green-700 text-white font-black rounded-xl text-base transition-colors"
              >
                🟢 Clock In
              </button>
            </div>
          )}

          {/* History */}
          {entries.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Recent Entries</p>
              <div className="space-y-2">
                {entries.slice(0, 10).map((e) => {
                  const workMins = e.clockOut
                    ? differenceInMinutes(new Date(e.clockOut), new Date(e.clockIn)) - e.breakMinutes
                    : 0;
                  return (
                    <div key={e.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{e.userName}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(e.clockIn), 'MMM d · HH:mm')}
                          {e.clockOut && ` → ${format(new Date(e.clockOut), 'HH:mm')}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{fmtDuration(workMins)}</p>
                        {e.breakMinutes > 0 && <p className="text-xs text-orange-500">{e.breakMinutes}m break</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
