import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

const PERIODS = [
  { label: 'Today', value: 'today' },
  { label: '7 Days', value: 'week' },
  { label: '30 Days', value: 'month' },
];

export default function ReportsScreen() {
  const [period, setPeriod] = useState('today');

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['reports-mobile', period],
    queryFn: () => api.get(`/v1/reports/sales?period=${period}`).then((r) => r.data),
  });

  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['top-products-mobile', period],
    queryFn: () => api.get(`/v1/reports/sales?period=${period}&groupBy=product`).then((r) => r.data),
  });

  const summary = data?.summary ?? data;
  const products: any[] = topProducts?.topProducts ?? topProducts?.data ?? [];

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4f46e5" />}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 32 }}
    >
      {/* Period selector */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <TouchableOpacity
            key={p.value}
            style={[styles.periodBtn, period === p.value && styles.periodBtnActive]}
            onPress={() => setPeriod(p.value)}
          >
            <Text style={[styles.periodText, period === p.value && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ActivityIndicator color="#4f46e5" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* KPI Cards */}
          <View style={styles.kpiGrid}>
            <KpiCard
              icon="cash-outline"
              label="Revenue"
              value={`AED ${Number(summary?.totalRevenue ?? summary?.revenue ?? 0).toFixed(0)}`}
              color="#4f46e5"
            />
            <KpiCard
              icon="receipt-outline"
              label="Transactions"
              value={String(summary?.totalTransactions ?? summary?.count ?? 0)}
              color="#059669"
            />
            <KpiCard
              icon="trending-up-outline"
              label="Avg. Sale"
              value={`AED ${Number(summary?.avgOrderValue ?? summary?.avgSale ?? 0).toFixed(0)}`}
              color="#0891b2"
            />
            <KpiCard
              icon="pricetag-outline"
              label="Tax (VAT)"
              value={`AED ${Number(summary?.totalTax ?? summary?.tax ?? 0).toFixed(0)}`}
              color="#d97706"
            />
          </View>

          {/* Payment breakdown */}
          {summary?.paymentBreakdown && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Payment Methods</Text>
              {Object.entries(summary.paymentBreakdown as Record<string, number>).map(([method, amount]) => (
                <View key={method} style={styles.breakdownRow}>
                  <View style={styles.breakdownLeft}>
                    <Ionicons
                      name={method === 'CASH' ? 'cash-outline' : method === 'CARD' ? 'card-outline' : 'wallet-outline'}
                      size={14}
                      color="#6b7280"
                    />
                    <Text style={styles.breakdownLabel}>{method}</Text>
                  </View>
                  <Text style={styles.breakdownValue}>AED {Number(amount).toFixed(0)}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Top Products */}
          {products.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Top Products</Text>
              {products.slice(0, 8).map((p: any, i: number) => (
                <View key={i} style={styles.productRow}>
                  <View style={styles.productRank}>
                    <Text style={styles.rankText}>{i + 1}</Text>
                  </View>
                  <Text style={styles.productName} numberOfLines={1}>{p.name}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.productRevenue}>AED {Number(p._sum?.total ?? p.revenue ?? 0).toFixed(0)}</Text>
                    <Text style={styles.productQty}>{p._sum?.quantity ?? p.quantity ?? 0} units</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Status breakdown */}
          {summary?.statusBreakdown && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Transaction Status</Text>
              {Object.entries(summary.statusBreakdown as Record<string, number>).map(([status, count]) => (
                <View key={status} style={styles.breakdownRow}>
                  <View style={[styles.statusDot, {
                    backgroundColor: status === 'COMPLETED' ? '#10b981' : status === 'VOIDED' ? '#ef4444' : '#f59e0b'
                  }]} />
                  <Text style={[styles.breakdownLabel, { flex: 1 }]}>{status}</Text>
                  <Text style={styles.breakdownValue}>{count}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function KpiCard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  periodRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#4f46e5' },
  periodText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  periodTextActive: { color: '#fff' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  kpiCard: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  kpiLabel: { fontSize: 11, color: '#6b7280', fontWeight: '600' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  breakdownLabel: { fontSize: 13, color: '#374151', fontWeight: '500' },
  breakdownValue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9fafb' },
  productRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 11, fontWeight: '700', color: '#6b7280' },
  productName: { flex: 1, fontSize: 13, color: '#374151' },
  productRevenue: { fontSize: 13, fontWeight: '700', color: '#111827' },
  productQty: { fontSize: 11, color: '#9ca3af', marginTop: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
