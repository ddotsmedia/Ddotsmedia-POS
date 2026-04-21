import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@mystore.com');
  const [password, setPassword] = useState('admin123');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Brand */}
        <View style={styles.brandSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.brandName}>Ddotsmedia POS</Text>
          <Text style={styles.brandSub}>Manager Console</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="mail-outline" size={16} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={16} color="#9ca3af" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                secureTextEntry={!showPw}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? 'eye-off-outline' : 'eye-outline'} size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In →</Text>
            )}
          </TouchableOpacity>

          <View style={styles.demo}>
            <Text style={styles.demoTitle}>Demo Credentials</Text>
            <Text style={styles.demoText}>Admin: admin@mystore.com / admin123</Text>
            <Text style={styles.demoText}>Manager: manager@mystore.com / manager123</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', justifyContent: 'center', padding: 24 },
  brandSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 56, height: 56, backgroundColor: '#4f46e5', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  logoText: { color: '#fff', fontSize: 24, fontWeight: '900' },
  brandName: { color: '#fff', fontSize: 22, fontWeight: '700' },
  brandSub: { color: '#818cf8', fontSize: 13, marginTop: 2 },
  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: '700', color: '#374151', letterSpacing: 0.8, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 14, paddingHorizontal: 12, backgroundColor: '#fff' },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, paddingVertical: 12, fontSize: 14, color: '#111827' },
  eyeBtn: { padding: 4 },
  loginBtn: { backgroundColor: '#4f46e5', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  demo: { marginTop: 20, backgroundColor: '#f9fafb', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb' },
  demoTitle: { fontSize: 11, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  demoText: { fontSize: 12, color: '#374151', marginBottom: 2 },
});
