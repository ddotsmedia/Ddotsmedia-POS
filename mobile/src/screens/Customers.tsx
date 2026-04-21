import React, { useState } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Modal, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export default function CustomersScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '' });

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['customers-mobile', search],
    queryFn: () => api.get(`/v1/customers?search=${encodeURIComponent(search)}&limit=50`).then((r) => r.data),
  });

  const createMut = useMutation({
    mutationFn: (d: any) => api.post('/v1/customers', d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers-mobile'] });
      setShowModal(false);
      setForm({ name: '', phone: '', email: '' });
    },
    onError: () => Alert.alert('Error', 'Failed to create customer'),
  });

  const customers: any[] = data?.data ?? data?.customers ?? [];

  const initials = (name: string) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={styles.container}>
      {/* Toolbar */}
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={14} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name or phone..."
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      {!isLoading && customers.length > 0 && (
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{customers.length}</Text>
            <Text style={styles.statLbl}>Customers</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>
              AED {customers.reduce((s: number, c: any) => s + Number(c.totalSpent ?? 0), 0).toFixed(0)}
            </Text>
            <Text style={styles.statLbl}>Total Revenue</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>
              {customers.reduce((s: number, c: any) => s + (c.loyaltyPoints ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statLbl}>Loyalty Pts</Text>
          </View>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#4f46e5" />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#4f46e5" />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color="#d1d5db" />
              <Text style={styles.emptyText}>No customers found</Text>
              <TouchableOpacity onPress={() => setShowModal(true)}>
                <Text style={styles.emptyLink}>Add your first customer</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatarBox}>
                <Text style={styles.avatarText}>{initials(item.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customerName}>{item.name}</Text>
                <Text style={styles.customerMeta}>{item.phone ?? item.email ?? 'No contact info'}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.spent}>AED {Number(item.totalSpent ?? 0).toFixed(0)}</Text>
                {(item.loyaltyPoints ?? 0) > 0 && (
                  <View style={styles.pointsBadge}>
                    <Ionicons name="star" size={10} color="#d97706" />
                    <Text style={styles.pointsText}>{item.loyaltyPoints} pts</Text>
                  </View>
                )}
              </View>
            </View>
          )}
          contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 32 }}
        />
      )}

      {/* Add Customer Modal */}
      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Customer</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <View style={styles.modalBody}>
            {[
              { key: 'name', label: 'Full Name *', placeholder: 'John Doe', keyboard: 'default' },
              { key: 'phone', label: 'Phone Number', placeholder: '+971 50 000 0000', keyboard: 'phone-pad' },
              { key: 'email', label: 'Email Address', placeholder: 'john@example.com', keyboard: 'email-address' },
            ].map(({ key, label, placeholder, keyboard }) => (
              <View key={key} style={styles.modalField}>
                <Text style={styles.modalLabel}>{label}</Text>
                <TextInput
                  style={styles.modalInput}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  placeholder={placeholder}
                  keyboardType={keyboard as any}
                  autoCapitalize={key === 'email' ? 'none' : 'words'}
                />
              </View>
            ))}
            <TouchableOpacity
              style={[styles.createBtn, (!form.name.trim() || createMut.isPending) && styles.createBtnDisabled]}
              onPress={() => createMut.mutate(form)}
              disabled={!form.name.trim() || createMut.isPending}
            >
              <Text style={styles.createBtnText}>
                {createMut.isPending ? 'Creating...' : 'Create Customer'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  toolbar: { flexDirection: 'row', padding: 16, gap: 10, paddingBottom: 8 },
  searchWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', gap: 8 },
  searchInput: { flex: 1, fontSize: 14, color: '#374151' },
  addBtn: { backgroundColor: '#4f46e5', borderRadius: 12, width: 44, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 4 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  statVal: { fontSize: 14, fontWeight: '700', color: '#111827' },
  statLbl: { fontSize: 10, color: '#6b7280', marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  avatarBox: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  customerName: { fontSize: 15, fontWeight: '600', color: '#111827' },
  customerMeta: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  spent: { fontSize: 14, fontWeight: '700', color: '#111827' },
  pointsBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 },
  pointsText: { fontSize: 10, fontWeight: '600', color: '#d97706' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#9ca3af', fontSize: 15, marginTop: 12 },
  emptyLink: { color: '#4f46e5', fontSize: 14, fontWeight: '600', marginTop: 8 },
  modal: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { backgroundColor: '#0f172a', padding: 20, paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  modalBody: { padding: 20, gap: 16 },
  modalField: { gap: 6 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 },
  modalInput: { borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#111827' },
  createBtn: { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
