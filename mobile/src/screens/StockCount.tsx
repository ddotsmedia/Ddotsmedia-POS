import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, FlatList,
  Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

interface CountItem {
  inventoryId: string;
  productId: string;
  productName: string;
  systemQty: number;
  countedQty: string;
  variantName?: string;
}

export default function StockCountScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['inventory-count', search],
    queryFn: () =>
      api.get('/v1/inventory', { params: { search, limit: 50 } }).then((r) => r.data),
  });

  const inventory: any[] = (data as any)?.data ?? (data as any)?.inventory ?? [];

  const updateCount = (inventoryId: string, qty: string) => {
    setCounts((prev) => ({ ...prev, [inventoryId]: qty }));
  };

  const hasChanges = Object.keys(counts).some((key) => {
    const item = inventory.find((inv: any) => inv.id === key);
    return item && counts[key] !== '' && parseFloat(counts[key]) !== item.quantity;
  });

  const saveAdjustments = async () => {
    const adjustments = Object.keys(counts)
      .filter((key) => {
        const item = inventory.find((inv: any) => inv.id === key);
        return item && counts[key] !== '' && parseFloat(counts[key]) !== item.quantity;
      })
      .map((key) => {
        const item = inventory.find((inv: any) => inv.id === key);
        return { productId: item.productId, variantId: item.variantId, branchId: item.branchId, quantity: parseFloat(counts[key]), type: 'ADJUSTMENT', note: 'Stock count adjustment' };
      });

    if (adjustments.length === 0) { Alert.alert('No Changes', 'No quantities were changed.'); return; }

    Alert.alert('Confirm Adjustments', `Save ${adjustments.length} stock adjustment(s)?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save', onPress: async () => {
          setSaving(true);
          try {
            await Promise.all(adjustments.map((adj) => api.put('/v1/inventory/adjust', adj)));
            setCounts({});
            await refetch();
            Alert.alert('Done', `${adjustments.length} adjustment(s) saved successfully`);
          } catch {
            Alert.alert('Error', 'Failed to save adjustments');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const changedCount = Object.keys(counts).filter((key) => {
    const item = inventory.find((inv: any) => inv.id === key);
    return item && counts[key] !== '' && parseFloat(counts[key]) !== item.quantity;
  }).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Stock Count</Text>
        <Text style={styles.headerSub}>Update physical stock quantities</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search product..."
        placeholderTextColor="#9ca3af"
        value={search}
        onChangeText={setSearch}
      />

      {isLoading ? (
        <ActivityIndicator color="#4f46e5" size="large" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 120 }}
          renderItem={({ item }) => {
            const counted = counts[item.id];
            const countedNum = counted !== undefined && counted !== '' ? parseFloat(counted) : null;
            const isChanged = countedNum !== null && countedNum !== item.quantity;
            const diff = countedNum !== null ? countedNum - item.quantity : 0;

            return (
              <View style={[styles.row, isChanged && styles.rowChanged]}>
                <View style={styles.rowInfo}>
                  <Text style={styles.productName} numberOfLines={1}>{item.product?.name ?? 'Unknown'}</Text>
                  {item.variant?.name && <Text style={styles.variantName}>{item.variant.name}</Text>}
                  <Text style={styles.branchName}>{item.branch?.name ?? ''}</Text>
                </View>
                <View style={styles.qtySection}>
                  <View style={styles.systemQty}>
                    <Text style={styles.qtyLabel}>System</Text>
                    <Text style={styles.qtyValue}>{item.quantity}</Text>
                  </View>
                  <View style={styles.countInput}>
                    <Text style={styles.qtyLabel}>Count</Text>
                    <TextInput
                      style={[styles.countField, isChanged && styles.countFieldChanged]}
                      value={counted ?? ''}
                      onChangeText={(v) => updateCount(item.id, v)}
                      keyboardType="decimal-pad"
                      placeholder={String(item.quantity)}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  {isChanged && (
                    <View style={styles.diffBadge}>
                      <Text style={[styles.diffText, { color: diff > 0 ? '#10b981' : '#ef4444' }]}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No inventory found</Text></View>}
        />
      )}

      {hasChanges && (
        <View style={styles.footer}>
          <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={saveAdjustments} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save {changedCount} Adjustment{changedCount !== 1 ? 's' : ''}</Text>}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  searchInput: { margin: 16, backgroundColor: '#fff', borderRadius: 14, borderWidth: 2, borderColor: '#e2e8f0', padding: 13, fontSize: 14, color: '#1e293b' },
  row: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: 'transparent' },
  rowChanged: { borderColor: '#4f46e5', backgroundColor: '#fefce8' },
  rowInfo: { flex: 1, marginRight: 12 },
  productName: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  variantName: { fontSize: 11, color: '#64748b', marginTop: 2 },
  branchName: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  qtySection: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  systemQty: { alignItems: 'center' },
  countInput: { alignItems: 'center' },
  qtyLabel: { fontSize: 9, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  qtyValue: { fontSize: 16, fontWeight: '800', color: '#1e293b', minWidth: 36, textAlign: 'center' },
  countField: { borderWidth: 2, borderColor: '#e2e8f0', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, fontSize: 15, fontWeight: '700', color: '#1e293b', minWidth: 56, textAlign: 'center', backgroundColor: '#fff' },
  countFieldChanged: { borderColor: '#4f46e5', backgroundColor: '#eef2ff', color: '#4f46e5' },
  diffBadge: { minWidth: 36, alignItems: 'center' },
  diffText: { fontSize: 13, fontWeight: '800' },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontSize: 15 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#4f46e5', borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
