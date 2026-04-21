import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Branch {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
}

interface BranchState {
  selectedBranchId: string | null;
  selectedBranch: Branch | null;
  setSelectedBranch: (branch: Branch | null) => void;
  clearBranch: () => void;
}

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      selectedBranchId: null,
      selectedBranch: null,
      setSelectedBranch: (branch) =>
        set({ selectedBranch: branch, selectedBranchId: branch?.id ?? null }),
      clearBranch: () => set({ selectedBranch: null, selectedBranchId: null }),
    }),
    { name: 'pos-branch' },
  ),
);
