import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function DashboardScreen() {
  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['daily-insights'],
    queryFn: () => api.get('/v1/ai/insights/daily').then((r) => r.data),
    refetchInterval: 60000, // refresh every minute
  });

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      {/* KPI Cards */}
      <View style={styles.kpiRow}>
        <KpiCard label="Revenue Today" value={`AED ${data?.todayRevenue?.toFixed(0) ?? '—'}`} positive={data?.changePercent >= 0} change={data?.changePercent} />
        <KpiCard label="Transactions" value={String(data?.todayTransactions ?? '—')} />
      </View>

      {/* AI Summary */}
      {data?.aiSummary && (
        <View style={styles.aiCard}>
          <Text style={styles.aiLabel}>✨ AI Insight</Text>
          <Text style={styles.aiText}>{data.aiSummary}</Text>
        </View>
      )}

      {/* Top Products */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Products Today</Text>
        {data?.topProducts?.map((p: any, i: number) => (
          <View key={i} style={styles.productRow}>
            <Text style={styles.productName}>{p.name}</Text>
            <Text style={styles.productRevenue}>AED {p._sum?.total?.toFixed(0)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function KpiCard({ label, value, positive, change }: any) {
  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={styles.kpiValue}>{value}</Text>
      {change !== undefined && (
        <Text style={{ color: positive ? '#16a34a' : '#dc2626', fontSize: 12 }}>
          {positive ? '▲' : '▼'} {Math.abs(change)}%
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  kpiRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  aiCard: { backgroundColor: '#eff6ff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  aiLabel: { fontSize: 13, fontWeight: '600', color: '#1d4ed8', marginBottom: 6 },
  aiText: { fontSize: 14, color: '#374151', lineHeight: 20 },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 12 },
  productRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  productName: { fontSize: 14, color: '#374151' },
  productRevenue: { fontSize: 14, fontWeight: '600', color: '#111827' },
});
