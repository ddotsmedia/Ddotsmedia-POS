import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Alert, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../services/api';

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);

  useEffect(() => {
    api.get('/v1/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
          // App would navigate to login via auth state change
          Alert.alert('Signed out', 'Please restart the app to sign in again.');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
      {user && (
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name ?? 'U')[0].toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{user.role}</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Push Notifications</Text>
          <Switch value={notifications} onValueChange={setNotifications} trackColor={{ true: '#2563EB' }} />
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Offline Mode</Text>
          <Switch value={offlineMode} onValueChange={setOfflineMode} trackColor={{ true: '#2563EB' }} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>System</Text>
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>API Endpoint</Text>
          <Text style={styles.rowValue}>localhost:5100</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.row}>
          <Text style={styles.rowLabel}>Version</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
  name: { fontSize: 18, fontWeight: '700', color: '#111827' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 4 },
  badge: { marginTop: 10, backgroundColor: '#dbeafe', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4 },
  badgeText: { color: '#1e40af', fontSize: 12, fontWeight: '600' },
  section: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#f3f4f6', overflow: 'hidden' },
  sectionTitle: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 15, color: '#374151' },
  rowValue: { fontSize: 14, color: '#9ca3af', fontFamily: 'monospace' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 16 },
  logoutBtn: { backgroundColor: '#fef2f2', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#fecaca' },
  logoutText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },
});
