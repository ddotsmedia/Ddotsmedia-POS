import { create } from 'zustand';
import { posApi } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  branchId: string | null;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithPin: (pin: string, branchId: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

function syncTokenToMain(token: string) {
  (window as any).posAPI?.setToken(token).catch(() => {});
}

function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('access_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
  syncTokenToMain(accessToken);
}

function saveUser(user: User) {
  localStorage.setItem('userId', user.id);
  localStorage.setItem('tenantId', user.tenantId);
  localStorage.setItem('branchId', user.branchId ?? '');
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: !!localStorage.getItem('access_token'),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data } = await posApi.login(email, password);
      saveTokens(data.accessToken, data.refreshToken);
      saveUser(data.user);
      set({ user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  loginWithPin: async (pin, branchId) => {
    set({ isLoading: true });
    try {
      const { data } = await posApi.loginWithPin(pin, branchId);
      saveTokens(data.accessToken, data.refreshToken);
      saveUser(data.user);
      set({ user: data.user, isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.clear();
    set({ user: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const { data } = await posApi.me();
      saveUser(data);
      const token = localStorage.getItem('access_token');
      if (token) syncTokenToMain(token);
      set({ user: data, isAuthenticated: true });
    } catch {
      get().logout();
    }
  },
}));
