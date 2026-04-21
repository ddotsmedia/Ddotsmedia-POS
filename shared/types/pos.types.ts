export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'CASHIER' | 'INVENTORY';
export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'LOYALTY_POINTS' | 'SPLIT';
export type SaleStatus = 'COMPLETED' | 'HELD' | 'VOIDED' | 'REFUNDED';
export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export interface User {
  id: string;
  tenantId: string;
  branchId?: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
}

export interface Product {
  id: string;
  tenantId: string;
  categoryId?: string;
  name: string;
  barcode?: string;
  sku?: string;
  sellingPrice: number;
  costPrice: number;
  trackInventory: boolean;
  taxIncluded: boolean;
  isActive: boolean;
}

export interface CartItem {
  productId: string;
  variantId?: string;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface SalePayment {
  method: PaymentMethod;
  amount: number;
  reference?: string;
  cashGiven?: number;
  changeDue?: number;
  pointsUsed?: number;
}

export interface CreateSaleRequest {
  tenantId: string;
  branchId: string;
  customerId?: string;
  deviceId?: string;
  items: CartItem[];
  payments: SalePayment[];
  discountAmount?: number;
  notes?: string;
  isOffline?: boolean;
  offlineCreatedAt?: string;
}

export interface Sale {
  id: string;
  receiptNumber: string;
  tenantId: string;
  branchId: string;
  cashierId: string;
  customerId?: string;
  status: SaleStatus;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  isOffline: boolean;
  syncStatus: SyncStatus;
  createdAt: string;
  items: CartItem[];
  payments: SalePayment[];
}

export interface DemandForecast {
  productId: string;
  historicalSales: number;
  avgPerDay: number;
  forecastedDays: number;
  forecast: number;
  confidence: 'low' | 'medium' | 'high';
  reasoning: string;
  reorderRecommended: boolean;
}

export interface AnomalyReport {
  anomalies: string[];
  count: number;
  riskLevel: 'low' | 'medium' | 'high';
  findings: string[];
  recommendations: string[];
}

export interface DailySummary {
  date: string;
  todayRevenue: number;
  todayTransactions: number;
  changePercent: number;
  topProducts: { name: string; _sum: { total: number; quantity: number } }[];
  aiSummary: string;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  pages?: number;
}
