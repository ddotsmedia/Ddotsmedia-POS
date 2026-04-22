import axios from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh = localStorage.getItem('refresh_token');
        const { data } = await axios.post(`${original.baseURL}/v1/auth/refresh`, { refreshToken: refresh });
        localStorage.setItem('access_token', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export const posApi = {
  // Sales
  createSale: (data: any) => api.post('/v1/sales', data),
  getSales: (params?: any) => api.get('/v1/sales', { params }),
  getSale: (id: string) => api.get(`/v1/sales/${id}`),
  voidSale: (id: string) => api.post(`/v1/sales/${id}/void`),
  getReceipt: (id: string) => api.get(`/v1/sales/${id}/receipt`, { responseType: 'blob' }),

  // Products
  getProducts: (params?: any) => api.get('/v1/products', { params }),
  searchProducts: (q: string) => api.get('/v1/products/search', { params: { q } }),
  createProduct: (data: any) => api.post('/v1/products', data),
  updateProduct: (id: string, data: any) => api.put(`/v1/products/${id}`, data),
  deleteProduct: (id: string) => api.delete(`/v1/products/${id}`),

  // Categories
  getCategories: () => api.get('/v1/products/categories'),
  createCategory: (data: any) => api.post('/v1/products/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/v1/products/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/v1/products/categories/${id}`),

  // Inventory
  getInventory: (params?: any) => api.get('/v1/inventory', { params }),
  adjustStock: (data: any) => api.put('/v1/inventory/adjust', data),
  transferStock: (data: any) => api.post('/v1/inventory/transfer', data),

  // Customers
  getCustomers: (params?: any) => api.get('/v1/customers', { params }),
  getCustomer: (id: string) => api.get(`/v1/customers/${id}`),
  createCustomer: (data: any) => api.post('/v1/customers', data),

  // Reports
  getSalesReport: (params: any) => api.get('/v1/reports/sales', { params }),
  getProfitReport: (params: any) => api.get('/v1/reports/profit', { params }),
  exportReport: (type: string, params: any) => api.get('/v1/reports/export', { params: { type, ...params }, responseType: 'blob' }),

  // Admin
  getAdminStats: () => api.get('/v1/admin/stats'),
  getAdminUsers: () => api.get('/v1/admin/users'),
  createAdminUser: (data: any) => api.post('/v1/admin/users', data),
  updateUserRole: (id: string, role: string) => api.put(`/v1/admin/users/${id}/role`, { role }),
  toggleUser: (id: string, isActive: boolean) => api.put(`/v1/admin/users/${id}/toggle`, { isActive }),
  getAuditLogs: (page = 1) => api.get('/v1/admin/audit-logs', { params: { page } }),

  // Branches
  getBranches: () => api.get('/v1/branches'),
  createBranch: (data: any) => api.post('/v1/branches', data),
  updateBranch: (id: string, data: any) => api.put(`/v1/branches/${id}`, data),

  // Purchase Orders
  getPurchaseOrders: (params?: any) => api.get('/v1/purchase-orders', { params }),
  createPurchaseOrder: (data: any) => api.post('/v1/purchase-orders', data),
  receivePurchaseOrder: (id: string) => api.put(`/v1/purchase-orders/${id}/receive`),

  // AI
  naturalLanguageQuery: (question: string) => api.post('/v1/ai/query', { question }),
  getDailyInsights: () => api.get('/v1/ai/insights/daily'),
  getForecast: (productId: string) => api.get(`/v1/ai/forecast/${productId}`),
  getAnomalies: () => api.get('/v1/ai/anomalies'),
  chat: (messages: any[]) => api.post('/v1/ai/chat', { messages }),

  // Expenses
  getExpenses: (params?: any) => api.get('/v1/expenses', { params }),
  getExpenseSummary: (params?: any) => api.get('/v1/expenses/summary', { params }),
  createExpense: (data: any) => api.post('/v1/expenses', data),
  updateExpense: (id: string, data: any) => api.put(`/v1/expenses/${id}`, data),
  deleteExpense: (id: string) => api.delete(`/v1/expenses/${id}`),

  // Gift Cards
  getGiftCards: (params?: any) => api.get('/v1/gift-cards', { params }),
  getGiftCard: (id: string) => api.get(`/v1/gift-cards/${id}`),
  lookupGiftCard: (code: string) => api.get('/v1/gift-cards/lookup', { params: { code } }),
  createGiftCard: (data: any) => api.post('/v1/gift-cards', data),
  topUpGiftCard: (id: string, amount: number, note?: string) => api.post(`/v1/gift-cards/${id}/top-up`, { amount, note }),
  redeemGiftCard: (id: string, amount: number, saleId?: string) => api.post(`/v1/gift-cards/${id}/redeem`, { amount, saleId }),
  deactivateGiftCard: (id: string) => api.patch(`/v1/gift-cards/${id}/deactivate`),

  // Promotions
  getPromotions: (params?: any) => api.get('/v1/promotions', { params }),
  validatePromoCode: (code: string, amount: number) => api.get('/v1/promotions/validate', { params: { code, amount } }),
  createPromotion: (data: any) => api.post('/v1/promotions', data),
  applyPromoCode: (code: string) => api.post('/v1/promotions/apply', { code }),
  updatePromotion: (id: string, data: any) => api.put(`/v1/promotions/${id}`, data),
  togglePromotion: (id: string) => api.patch(`/v1/promotions/${id}/toggle`),
  deletePromotion: (id: string) => api.delete(`/v1/promotions/${id}`),

  // Suppliers
  getSuppliers: (params?: any) => api.get('/v1/suppliers', { params }),
  getSupplier: (id: string) => api.get(`/v1/suppliers/${id}`),
  createSupplier: (data: any) => api.post('/v1/suppliers', data),
  updateSupplier: (id: string, data: any) => api.put(`/v1/suppliers/${id}`, data),
  deleteSupplier: (id: string) => api.delete(`/v1/suppliers/${id}`),
};
