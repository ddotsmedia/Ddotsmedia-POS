import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function SalesScreen() {
  const [search, setSearch] = useState('');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['sales'],
    queryFn: () => api.get('/v1/sales?limit=50').then((r) => r.data),
  });

  const sales: any[] = data?.data ?? data?.sales ?? [];

  const filtered = sales.filter((s: any) =>
    !search || s.id.includes(search) || (s.cashier?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  );

  const statusColor = (status: string) => {
    if (status === 'COMPLETED') return '#16a34a';
    if (status === 'VOIDED') return '#dc2626';
    return '#ca8a04';
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by ID or cashier..."
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
          ListEmptyComponent={<Text style={styles.empty}>No sales found</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <Text style={styles.saleId}>#{item.id.slice(-8).toUpperCase()}</Text>
                <Text style={[styles.status, { color: statusColor(item.status) }]}>{item.status}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cashier}>{item.cashier?.name ?? 'Unknown'}</Text>
                <Text style={styles.total}>AED {Number(item.total ?? 0).toFixed(2)}</Text>
              </View>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16, gap: 8 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  search: { margin: 16, marginBottom: 0, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14 },
  empty: { textAlign: 'center', color: '#9ca3af', marginTop: 40, fontSize: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f3f4f6' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  saleId: { fontFamily: 'monospace', fontSize: 13, fontWeight: '600', color: '#374151' },
  status: { fontSize: 12, fontWeight: '700' },
  cashier: { fontSize: 13, color: '#6b7280' },
  total: { fontSize: 16, fontWeight: '700', color: '#111827' },
  date: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
});
