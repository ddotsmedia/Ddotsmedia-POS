import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  ScrollView, Alert, ActivityIndicator, Vibration,
} from 'react-native';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../services/api';

interface CartItem {
  product: any;
  quantity: number;
  unitPrice: number;
}

export default function QuickSaleScreen() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'WALLET'>('CASH');
  const [cashGiven, setCashGiven] = useState('');
  const [processing, setProcessing] = useState(false);
  const searchRef = useRef<TextInput>(null);

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['quick-products', search],
    queryFn: () =>
      api.get('/v1/products', { params: { search, limit: 20, isActive: true } }).then((r) => r.data),
    enabled: search.length > 0,
  });

  const addToCart = (product: any) => {
    Vibration.vibrate(30);
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: product.sellingPrice }];
    });
    setSearch('');
  };

  const updateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((item) => item.product.id !== productId));
    } else {
      setCart((prev) => prev.map((item) => (item.product.id === productId ? { ...item, quantity: qty } : item)));
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const discount = promoDiscount;
  const total = Math.max(0, subtotal - discount);
  const change = paymentMethod === 'CASH' && cashGiven ? Math.max(0, parseFloat(cashGiven) - total) : 0;

  const applyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const { data } = await api.get('/v1/promotions/validate', { params: { code: promoCode, amount: subtotal } });
      setPromoDiscount(data.discountAmount ?? 0);
      Alert.alert('Promo Applied', `Discount: AED ${(data.discountAmount ?? 0).toFixed(2)}`);
    } catch (e: any) {
      Alert.alert('Invalid Code', e?.response?.data?.message ?? 'Promo code not valid');
    }
  };

  const completeSale = async () => {
    if (cart.length === 0) { Alert.alert('Empty Cart', 'Add items before completing sale'); return; }
    if (paymentMethod === 'CASH' && parseFloat(cashGiven || '0') < total) {
      Alert.alert('Insufficient Cash', 'Cash given is less than total');
      return;
    }
    setProcessing(true);
    try {
      const items = cart.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        costPrice: item.product.costPrice ?? 0,
        total: item.unitPrice * item.quantity,
      }));
      const payments = [
        { method: paymentMethod, amount: total, cashGiven: paymentMethod === 'CASH' ? parseFloat(cashGiven) : undefined, changeDue: change || undefined },
      ];
      await api.post('/v1/sales', { items, payments, subtotal, discountAmount: discount, total, isOffline: false });
      if (promoCode) await api.post('/v1/promotions/apply', { code: promoCode });
      Alert.alert('Sale Complete!', `Total: AED ${total.toFixed(2)}${change > 0 ? `\nChange: AED ${change.toFixed(2)}` : ''}`, [
        { text: 'OK', onPress: () => { setCart([]); setPromoCode(''); setPromoDiscount(0); setCashGiven(''); } },
      ]);
    } catch (e: any) {
      Alert.alert('Sale Failed', e?.response?.data?.message ?? 'Could not process sale');
    } finally {
      setProcessing(false);
    }
  };

  const productList: any[] = (products as any)?.data ?? (products as any)?.products ?? [];

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          ref={searchRef}
          style={styles.searchInput}
          placeholder="Search product or scan barcode..."
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          autoFocus
        />
        {loadingProducts && <ActivityIndicator size="small" color="#4f46e5" style={{ marginRight: 12 }} />}
      </View>

      {/* Search results dropdown */}
      {search.length > 0 && productList.length > 0 && (
        <View style={styles.dropdown}>
          {productList.slice(0, 8).map((product: any) => (
            <TouchableOpacity key={product.id} style={styles.dropdownItem} onPress={() => addToCart(product)}>
              <Text style={styles.dropdownName}>{product.name}</Text>
              <Text style={styles.dropdownPrice}>AED {Number(product.sellingPrice).toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Cart */}
      <View style={styles.cartSection}>
        <Text style={styles.sectionTitle}>Cart ({cart.length} items)</Text>
        {cart.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartText}>Search and add products to start a sale</Text>
          </View>
        ) : (
          <FlatList
            data={cart}
            keyExtractor={(item) => item.product.id}
            style={{ maxHeight: 220 }}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartItemName}>{item.product.name}</Text>
                  <Text style={styles.cartItemPrice}>AED {item.unitPrice.toFixed(2)} each</Text>
                </View>
                <View style={styles.qtyControl}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity - 1)}>
                    <Text style={styles.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateQty(item.product.id, item.quantity + 1)}>
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.cartItemTotal}>AED {(item.unitPrice * item.quantity).toFixed(2)}</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Promo code */}
      <View style={styles.promoRow}>
        <TextInput style={styles.promoInput} placeholder="Promo code" placeholderTextColor="#9ca3af"
          value={promoCode} onChangeText={setPromoCode} autoCapitalize="characters" />
        <TouchableOpacity style={styles.promoBtn} onPress={applyPromo}>
          <Text style={styles.promoBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>

      {/* Payment method */}
      <View style={styles.paymentRow}>
        {(['CASH', 'CARD', 'WALLET'] as const).map((method) => (
          <TouchableOpacity key={method} style={[styles.paymentBtn, paymentMethod === method && styles.paymentBtnActive]}
            onPress={() => setPaymentMethod(method)}>
            <Text style={[styles.paymentBtnText, paymentMethod === method && styles.paymentBtnTextActive]}>{method}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {paymentMethod === 'CASH' && (
        <TextInput style={styles.cashInput} placeholder="Cash given (AED)" placeholderTextColor="#9ca3af"
          value={cashGiven} onChangeText={setCashGiven} keyboardType="decimal-pad" />
      )}

      {/* Totals */}
      <View style={styles.totals}>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Subtotal</Text><Text style={styles.totalValue}>AED {subtotal.toFixed(2)}</Text></View>
        {discount > 0 && (
          <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: '#10b981' }]}>Discount</Text><Text style={[styles.totalValue, { color: '#10b981' }]}>−AED {discount.toFixed(2)}</Text></View>
        )}
        {change > 0 && (
          <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: '#3b82f6' }]}>Change</Text><Text style={[styles.totalValue, { color: '#3b82f6' }]}>AED {change.toFixed(2)}</Text></View>
        )}
        <View style={[styles.totalRow, styles.grandTotal]}><Text style={styles.grandTotalLabel}>TOTAL</Text><Text style={styles.grandTotalValue}>AED {total.toFixed(2)}</Text></View>
      </View>

      {/* Complete button */}
      <TouchableOpacity style={[styles.completeBtn, (processing || cart.length === 0) && styles.completeBtnDisabled]}
        onPress={completeSale} disabled={processing || cart.length === 0}>
        {processing ? <ActivityIndicator color="#fff" /> : <Text style={styles.completeBtnText}>Complete Sale →</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, borderWidth: 2, borderColor: '#e2e8f0', marginBottom: 4 },
  searchInput: { flex: 1, padding: 14, fontSize: 15, color: '#1e293b', fontWeight: '500' },
  dropdown: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 8, maxHeight: 220, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownName: { fontSize: 14, fontWeight: '600', color: '#1e293b', flex: 1 },
  dropdownPrice: { fontSize: 14, fontWeight: '700', color: '#4f46e5' },
  cartSection: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginVertical: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  emptyCart: { paddingVertical: 24, alignItems: 'center' },
  emptyCartText: { color: '#94a3b8', fontSize: 14 },
  cartItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cartItemName: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  cartItemPrice: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  qtyControl: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
  qtyBtn: { width: 28, height: 28, backgroundColor: '#f1f5f9', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: '700', color: '#475569' },
  qtyText: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginHorizontal: 10, minWidth: 20, textAlign: 'center' },
  cartItemTotal: { fontSize: 13, fontWeight: '700', color: '#1e293b', minWidth: 70, textAlign: 'right' },
  promoRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  promoInput: { flex: 1, backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', padding: 12, fontSize: 14, color: '#1e293b', fontWeight: '600', letterSpacing: 1 },
  promoBtn: { backgroundColor: '#4f46e5', borderRadius: 12, paddingHorizontal: 18, justifyContent: 'center' },
  promoBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  paymentRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  paymentBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#fff' },
  paymentBtnActive: { borderColor: '#4f46e5', backgroundColor: '#eef2ff' },
  paymentBtnText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  paymentBtnTextActive: { color: '#4f46e5' },
  cashInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', padding: 12, fontSize: 15, color: '#1e293b', fontWeight: '600', marginBottom: 8 },
  totals: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  totalLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  totalValue: { fontSize: 13, color: '#1e293b', fontWeight: '600' },
  grandTotal: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 10, marginTop: 4 },
  grandTotalLabel: { fontSize: 15, color: '#1e293b', fontWeight: '800' },
  grandTotalValue: { fontSize: 18, color: '#4f46e5', fontWeight: '900' },
  completeBtn: { backgroundColor: '#4f46e5', borderRadius: 16, paddingVertical: 16, alignItems: 'center', shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  completeBtnDisabled: { backgroundColor: '#a5b4fc', shadowOpacity: 0 },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
});
