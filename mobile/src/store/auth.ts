import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,

  hydrate: async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        const res = await api.get('/v1/auth/me');
        set({ user: res.data, token, isAuthenticated: true });
      }
    } catch {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.post('/v1/auth/login', { email, password });
    await AsyncStorage.setItem('access_token', data.accessToken);
    await AsyncStorage.setItem('refresh_token', data.refreshToken);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    set({ user: data.user, token: data.accessToken, isAuthenticated: true });
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
