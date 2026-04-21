import axios from 'axios';

export const API_URL = (window as any).__env__?.VITE_API_URL || import.meta.env?.VITE_API_URL || 'http://localhost:5100';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${API_URL}/v1/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.reload();
      }
    }
    return Promise.reject(error);
  },
);

export const posApi = {
  login: (email: string, password: string) => api.post('/v1/auth/login', { email, password }),
  loginWithPin: (pin: string, branchId: string) => api.post('/v1/auth/pin', { pin, branchId }),
  me: () => api.get('/v1/auth/me'),
  logout: () => api.post('/v1/auth/logout'),

  getProducts: (params?: any) => api.get('/v1/products', { params }),
  searchProducts: (q: string) => api.get('/v1/products', { params: { search: q, limit: 20 } }),
  getProductByBarcode: (barcode: string) => api.get(`/v1/products/barcode/${barcode}`),
  getCategories: () => api.get('/v1/products/categories'),

  createSale: (data: any) => api.post('/v1/sales', data),
  getSales: (params?: any) => api.get('/v1/sales', { params }),
  getSale: (id: string) => api.get(`/v1/sales/${id}`),
  voidSale: (id: string) => api.post(`/v1/sales/${id}/void`),

  getInventory: (params?: any) => api.get('/v1/inventory', { params }),
  adjustStock: (data: any) => api.put('/v1/inventory/adjust', data),

  getCustomers: (params?: any) => api.get('/v1/customers', { params }),
  getCustomer: (id: string) => api.get(`/v1/customers/${id}`),
  createCustomer: (data: any) => api.post('/v1/customers', data),
  redeemPoints: (customerId: string, points: number) => api.post(`/v1/customers/${customerId}/redeem`, { points }),

  getAdminStats: () => api.get('/v1/admin/stats'),
  getSalesReport: (params: any) => api.get('/v1/reports/sales', { params }),
  getProfitReport: (params: any) => api.get('/v1/reports/profit', { params }),
  getCashierReport: (params: any) => api.get('/v1/reports/cashier', { params }),

  getDailyInsights: () => api.get('/v1/ai/insights/daily'),
  getAnomalies: (branchId?: string) => api.get('/v1/ai/anomalies', { params: { branchId } }),
  aiChat: (messages: any[]) => api.post('/v1/ai/chat', { messages }),
  nlQuery: (question: string) => api.post('/v1/ai/query', { question }),
  getForecast: (productId: string) => api.get(`/v1/ai/forecast/${productId}`),
  getRecommendations: (productId: string) => api.get('/v1/ai/recommendations', { params: { productId } }),

  pullCatalog: () => api.get('/v1/sync/pull'),
  pushOffline: (records: any[]) => api.post('/v1/sync/push', { records }),
};
