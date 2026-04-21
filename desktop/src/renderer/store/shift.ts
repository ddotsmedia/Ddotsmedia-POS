import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';

export interface CashMovement {
  id: string;
  type: 'IN' | 'OUT';
  amount: number;
  reason: string;
  time: string;
}

export interface ShiftSummary {
  shiftId: string;
  startTime: string;
  endTime: string;
  openingFloat: number;
  salesCount: number;
  salesTotal: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
  movements: CashMovement[];
}

interface ShiftState {
  isOpen: boolean;
  shiftId: string | null;
  openingFloat: number;
  startTime: string | null;
  salesCount: number;
  salesTotal: number;
  cashMovements: CashMovement[];

  openShift: (float: number) => void;
  closeShift: () => ShiftSummary | null;
  recordSale: (amount: number) => void;
  addCashMovement: (type: 'IN' | 'OUT', amount: number, reason: string) => void;
  getExpectedCash: () => number;
  getCashIn: () => number;
  getCashOut: () => number;
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      shiftId: null,
      openingFloat: 0,
      startTime: null,
      salesCount: 0,
      salesTotal: 0,
      cashMovements: [],

      openShift: (float) =>
        set({
          isOpen: true,
          shiftId: uuidv4(),
          openingFloat: float,
          startTime: new Date().toISOString(),
          salesCount: 0,
          salesTotal: 0,
          cashMovements: [],
        }),

      closeShift: () => {
        const s = get();
        if (!s.isOpen || !s.shiftId || !s.startTime) return null;
        const cashIn = s.getCashIn();
        const cashOut = s.getCashOut();
        const summary: ShiftSummary = {
          shiftId: s.shiftId,
          startTime: s.startTime,
          endTime: new Date().toISOString(),
          openingFloat: s.openingFloat,
          salesCount: s.salesCount,
          salesTotal: s.salesTotal,
          cashIn,
          cashOut,
          expectedCash: s.getExpectedCash(),
          movements: s.cashMovements,
        };
        set({ isOpen: false, shiftId: null, startTime: null, salesCount: 0, salesTotal: 0, cashMovements: [], openingFloat: 0 });
        return summary;
      },

      recordSale: (amount) =>
        set((s) => ({ salesCount: s.salesCount + 1, salesTotal: s.salesTotal + amount })),

      addCashMovement: (type, amount, reason) =>
        set((s) => ({
          cashMovements: [
            ...s.cashMovements,
            { id: uuidv4(), type, amount, reason, time: new Date().toISOString() },
          ],
        })),

      getExpectedCash: () => {
        const s = get();
        const cashIn = s.getCashIn();
        const cashOut = s.getCashOut();
        return s.openingFloat + s.salesTotal + cashIn - cashOut;
      },

      getCashIn: () => get().cashMovements.filter((m) => m.type === 'IN').reduce((s, m) => s + m.amount, 0),
      getCashOut: () => get().cashMovements.filter((m) => m.type === 'OUT').reduce((s, m) => s + m.amount, 0),
    }),
    { name: 'pos-shift' },
  ),
);
