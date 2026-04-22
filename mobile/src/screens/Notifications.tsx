import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

interface Notification {
  id: string;
  type: 'LOW_STOCK' | 'SYNC_ERROR' | 'SALE' | 'SYSTEM' | 'PROMOTION';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  createdAt: string;
  read: boolean;
}

function buildNotificationsFromData(inventory: any[], anomalies: any[]): Notification[] {
  const notifications: Notification[] = [];

  // Low stock alerts from inventory
  (inventory ?? []).forEach((item: any) => {
    if (item.product && item.quantity <= (item.product.minStockAlert ?? 10) && item.product.trackInventory) {
      notifications.push({
        id: `low-${item.id}`,
        type: 'LOW_STOCK',
        title: 'Low Stock Alert',
        message: `${item.product.name} has only ${item.quantity} units left at ${item.branch?.name ?? 'unknown branch'}`,
        severity: item.quantity === 0 ? 'error' : 'warning',
        createdAt: new Date().toISOString(),
        read: false,
      });
    }
  });

  // Anomalies from AI
  (anomalies ?? []).forEach((anomaly: any, idx: number) => {
    notifications.push({
      id: `anomaly-${idx}`,
      type: 'SYSTEM',
      title: 'AI Anomaly Detected',
      message: anomaly.description ?? anomaly.message ?? String(anomaly),
      severity: 'warning',
      createdAt: anomaly.detectedAt ?? new Date().toISOString(),
      read: false,
    });
  });

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

const SEVERITY_COLORS: Record<string, string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  error: '#ef4444',
  success: '#10b981',
};

const SEVERITY_BG: Record<string, string> = {
  info: '#eff6ff',
  warning: '#fffbeb',
  error: '#fef2f2',
  success: '#f0fdf4',
};

const TYPE_ICONS: Record<string, string> = {
  LOW_STOCK: '📦',
  SYNC_ERROR: '🔄',
  SALE: '💰',
  SYSTEM: '🤖',
  PROMOTION: '🎯',
};

export default function NotificationsScreen() {
  const [filter, setFilter] = useState<'all' | 'warning' | 'error'>('all');

  const { data: inventoryData, isLoading: loadingInv, refetch: refetchInv, isRefetching } = useQuery({
    queryKey: ['notif-inventory'],
    queryFn: () => api.get('/v1/inventory', { params: { limit: 200 } }).then((r) => r.data),
  });

  const { data: anomalyData, isLoading: loadingAnom, refetch: refetchAnom } = useQuery({
    queryKey: ['notif-anomalies'],
    queryFn: () => api.get('/v1/ai/anomalies').then((r) => r.data).catch(() => []),
  });

  const inventory: any[] = (inventoryData as any)?.data ?? (inventoryData as any)?.inventory ?? [];
  const anomalies: any[] = Array.isArray(anomalyData) ? anomalyData : ((anomalyData as any)?.anomalies ?? []);

  const allNotifications = buildNotificationsFromData(inventory, anomalies);
  const filtered = filter === 'all' ? allNotifications : allNotifications.filter((n) => n.severity === filter);

  const refetch = () => { refetchInv(); refetchAnom(); };
  const isLoading = loadingInv || loadingAnom;

  const errorCount = allNotifications.filter((n) => n.severity === 'error').length;
  const warningCount = allNotifications.filter((n) => n.severity === 'warning').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerBadges}>
          {errorCount > 0 && <View style={[styles.headerBadge, { backgroundColor: '#ef4444' }]}><Text style={styles.badgeText}>{errorCount} critical</Text></View>}
          {warningCount > 0 && <View style={[styles.headerBadge, { backgroundColor: '#f59e0b' }]}><Text style={styles.badgeText}>{warningCount} warnings</Text></View>}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {([['all', 'All'], ['warning', 'Warnings'], ['error', 'Critical']] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.filterTab, filter === key && styles.filterTabActive]} onPress={() => setFilter(key)}>
            <Text style={[styles.filterTabText, filter === key && styles.filterTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#4f46e5" size="large" />
          <Text style={styles.loadingText}>Checking alerts...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>{filter === 'error' ? '✅' : '🎉'}</Text>
              <Text style={styles.emptyTitle}>{filter === 'all' ? 'All Clear!' : `No ${filter}s`}</Text>
              <Text style={styles.emptyText}>{filter === 'all' ? 'No alerts at this time. Pull to refresh.' : 'No notifications match this filter.'}</Text>
            </View>
          ) : (
            filtered.map((notif) => (
              <View key={notif.id} style={[styles.card, { borderLeftColor: SEVERITY_COLORS[notif.severity], backgroundColor: SEVERITY_BG[notif.severity] }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.typeIcon}>{TYPE_ICONS[notif.type] ?? '🔔'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: SEVERITY_COLORS[notif.severity] }]}>{notif.title}</Text>
                    <Text style={styles.cardTime}>{new Date(notif.createdAt).toLocaleString()}</Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: SEVERITY_COLORS[notif.severity] }]}>
                    <Text style={styles.severityText}>{notif.severity.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={styles.cardMessage}>{notif.message}</Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 16, paddingTop: 20 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerBadges: { flexDirection: 'row', gap: 8, marginTop: 6 },
  headerBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  filterRow: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  filterTab: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: '#f8fafc' },
  filterTabActive: { backgroundColor: '#4f46e5' },
  filterTabText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  filterTabTextActive: { color: '#fff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#94a3b8', fontSize: 14 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#1e293b', marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#94a3b8', textAlign: 'center', lineHeight: 20 },
  card: { borderRadius: 14, padding: 16, marginBottom: 10, borderLeftWidth: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  typeIcon: { fontSize: 20 },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  cardTime: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  severityBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  severityText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardMessage: { fontSize: 13, color: '#475569', lineHeight: 18 },
});
