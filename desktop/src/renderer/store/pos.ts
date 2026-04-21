import { create } from 'zustand';

export interface CartItem {
  productId: string;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  total: number;
  note?: string;
}

export interface HeldSale {
  id: string;
  items: CartItem[];
  customerId?: string;
  customerName?: string;
  notes?: string;
  heldAt: string;
}

interface POSState {
  cart: CartItem[];
  customerId: string | null;
  customerName: string | null;
  loyaltyPoints: number;
  notes: string;
  heldSales: HeldSale[];
  globalDiscount: number;
  tip: number;

  addToCart: (product: any) => void;
  removeFromCart: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  updateItemDiscount: (productId: string, discount: number) => void;
  updateItemNote: (productId: string, note: string) => void;
  setCustomer: (id: string | null, name: string | null, points: number) => void;
  setNotes: (notes: string) => void;
  setGlobalDiscount: (pct: number) => void;
  setTip: (amount: number) => void;
  clearCart: () => void;
  holdSale: () => void;
  resumeSale: (id: string) => void;
  deleteHeld: (id: string) => void;

  subtotal: () => number;
  taxAmount: () => number;
  discountAmount: () => number;
  total: () => number;
}

export const usePOSStore = create<POSState>((set, get) => ({
  cart: [],
  customerId: null,
  customerName: null,
  loyaltyPoints: 0,
  notes: '',
  heldSales: [],
  globalDiscount: 0,
  tip: 0,

  addToCart: (product) => set((s) => {
    const existing = s.cart.find((i) => i.productId === product.id);
    const price = Number(product.sellingPrice ?? product.selling_price ?? 0);
    if (existing) {
      const qty = existing.quantity + 1;
      return { cart: s.cart.map((i) => i.productId === product.id ? { ...i, quantity: qty, total: qty * price * (1 - i.discount / 100) } : i) };
    }
    return { cart: [...s.cart, { productId: product.id, name: product.name, barcode: product.barcode, quantity: 1, unitPrice: price, discount: 0, taxRate: 5, total: price }] };
  }),

  removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((i) => i.productId !== productId) })),

  updateQty: (productId, qty) => set((s) => {
    if (qty <= 0) return { cart: s.cart.filter((i) => i.productId !== productId) };
    return { cart: s.cart.map((i) => i.productId === productId ? { ...i, quantity: qty, total: qty * i.unitPrice * (1 - i.discount / 100) } : i) };
  }),

  updateItemDiscount: (productId, discount) => set((s) => ({
    cart: s.cart.map((i) => i.productId === productId ? { ...i, discount, total: i.quantity * i.unitPrice * (1 - discount / 100) } : i),
  })),

  updateItemNote: (productId, note) => set((s) => ({
    cart: s.cart.map((i) => i.productId === productId ? { ...i, note } : i),
  })),

  setCustomer: (id, name, points) => set({ customerId: id, customerName: name, loyaltyPoints: points }),
  setNotes: (notes) => set({ notes }),
  setGlobalDiscount: (pct) => set({ globalDiscount: pct }),
  setTip: (amount) => set({ tip: amount }),

  clearCart: () => set({ cart: [], customerId: null, customerName: null, loyaltyPoints: 0, notes: '', globalDiscount: 0, tip: 0 }),

  holdSale: () => set((s) => {
    if (s.cart.length === 0) return s;
    const held: HeldSale = { id: crypto.randomUUID(), items: s.cart, customerId: s.customerId ?? undefined, customerName: s.customerName ?? undefined, notes: s.notes, heldAt: new Date().toISOString() };
    return { heldSales: [...s.heldSales, held], cart: [], customerId: null, customerName: null, notes: '', globalDiscount: 0 };
  }),

  resumeSale: (id) => set((s) => {
    const held = s.heldSales.find((h) => h.id === id);
    if (!held) return s;
    return { cart: held.items, customerId: held.customerId ?? null, customerName: held.customerName ?? null, notes: held.notes ?? '', heldSales: s.heldSales.filter((h) => h.id !== id) };
  }),

  deleteHeld: (id) => set((s) => ({ heldSales: s.heldSales.filter((h) => h.id !== id) })),

  subtotal: () => get().cart.reduce((s, i) => s + i.total, 0),
  taxAmount: () => {
    const s = get();
    const sub = s.subtotal() * (1 - s.globalDiscount / 100);
    return sub * 0.05;
  },
  discountAmount: () => {
    const s = get();
    const itemDiscounts = s.cart.reduce((acc, i) => acc + i.quantity * i.unitPrice * (i.discount / 100), 0);
    const globalDisc = s.subtotal() * (s.globalDiscount / 100);
    return itemDiscounts + globalDisc;
  },
  total: () => {
    const s = get();
    return s.subtotal() * (1 - s.globalDiscount / 100) + s.taxAmount() + s.tip;
  },
}));
