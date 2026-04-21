import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function InventoryScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['inventory-mobile'],
    queryFn: () => api.get('/v1/inventory').then((r) => r.data),
  });

  const items: any[] = Array.isArray(data) ? data : [];

  const filtered = items.filter((i: any) =>
    !search ||
    (i.product?.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (i.product?.barcode ?? '').includes(search),
  );

  const totalItems = items.length;
  const lowStockCount = items.filter((i: any) => i.quantity <= (i.product?.minStockAlert ?? 10)).length;

  return (
    <View style={styles.container}>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalItems}</Text>
          <Text style={styles.statLabel}>Total SKUs</Text>
        </View>
        <View style={[styles.statCard, lowStockCount > 0 && styles.warnCard]}>
          <Text style={[styles.statValue, lowStockCount > 0 && styles.warnText]}>{lowStockCount}</Text>
          <Text style={styles.statLabel}>Low Stock</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by name or barcode..."
        value={search}
        onChangeText={setSearch}
      />

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#2563EB" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#2563EB" />}
          ListEmptyComponent={<Text style={styles.empty}>No inventory records</Text>}
          renderItem={({ item }) => {
            const isLow = item.quantity <= (item.product?.minStockAlert ?? 10);
            return (
              <View style={[styles.card, isLow && styles.lowCard]}>
                <View style={styles.cardRow}>
                  <Text style={styles.productName}>{item.product?.name}</Text>
                  <Text style={[styles.qty, isLow && styles.warnText]}>{item.quantity}</Text>
                </View>
                <View style={styles.cardRow}>
                  <Text style={styles.barcode}>{item.product?.barcode}</Text>
                  <Text style={styles.branch}>{item.branch?.name}</Text>
                </View>
                {isLow && <Text style={styles.lowLabel}>⚠️ Low Stock</Text>}
              </View>
            );
          }}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  statsRow: { flexDirection: 'row', gap: 12, padding: 16, paddingBottom: 0 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  warnCard: { borderColor: '#fed7aa' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  warnText: { color: '#ea580c' },
  search: { margin: 16, marginBottom: 0, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  lowCard: { borderColor: '#fed7aa', backgroundColor: '#fff7ed' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  productName: { fontSize: 14, fontWeight: '600', color: '#111827', flex: 1 },
  qty: { fontSize: 20, fontWeight: '700', color: '#2563EB' },
  barcode: { fontFamily: 'monospace', fontSize: 11, color: '#9ca3af' },
  branch: { fontSize: 12, color: '#6b7280' },
  lowLabel: { fontSize: 12, color: '#ea580c', marginTop: 4 },
});
