import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export default function AIInsightsScreen() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights-mobile'],
    queryFn: () => api.get('/v1/ai/insights/daily').then((r) => r.data),
  });

  const sendMessage = async () => {
    if (!chatInput.trim()) return;
    const userMsg: { role: 'user' | 'assistant'; content: string } = { role: 'user', content: chatInput };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await api.post('/v1/ai/chat', { messages: updated });
      setMessages((m) => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'AI chat unavailable. Configure OPENAI_API_KEY.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, gap: 16 }}>
        {isLoading ? (
          <ActivityIndicator color="#2563EB" />
        ) : insights ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>🤖 Daily Summary — {insights.date}</Text>
            <Text style={styles.summaryText}>{insights.aiSummary}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statVal}>AED {Number(insights.todayRevenue ?? 0).toFixed(0)}</Text>
                <Text style={styles.statLbl}>Revenue</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statVal}>{insights.todayTransactions}</Text>
                <Text style={styles.statLbl}>Sales</Text>
              </View>
              <View style={styles.stat}>
                <Text style={[styles.statVal, { color: (insights.changePercent ?? 0) >= 0 ? '#16a34a' : '#dc2626' }]}>
                  {(insights.changePercent ?? 0) >= 0 ? '+' : ''}{insights.changePercent}%
                </Text>
                <Text style={styles.statLbl}>vs Yesterday</Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.chatCard}>
          <Text style={styles.chatTitle}>AI Support Chat</Text>
          <View style={styles.chatMessages}>
            {messages.length === 0 && <Text style={styles.chatPlaceholder}>Ask anything about your POS system...</Text>}
            {messages.map((msg, i) => (
              <View key={i} style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.bubbleText, msg.role === 'user' && styles.userText]}>{msg.content}</Text>
              </View>
            ))}
            {chatLoading && <Text style={styles.chatPlaceholder}>Thinking...</Text>}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Ask a question..."
              onSubmitEditing={sendMessage}
              returnKeyType="send"
            />
            <TouchableOpacity style={[styles.sendBtn, !chatInput.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!chatInput.trim() || chatLoading}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  summaryCard: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#bfdbfe' },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  summaryText: { fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  statVal: { fontSize: 16, fontWeight: '700', color: '#111827' },
  statLbl: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  chatCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#f3f4f6' },
  chatTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 12 },
  chatMessages: { minHeight: 120, maxHeight: 240, gap: 8, marginBottom: 12 },
  chatPlaceholder: { color: '#9ca3af', fontSize: 13, textAlign: 'center', marginTop: 20 },
  bubble: { borderRadius: 12, padding: 10, maxWidth: '85%' },
  userBubble: { backgroundColor: '#2563EB', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#f3f4f6', alignSelf: 'flex-start' },
  bubbleText: { fontSize: 13, color: '#374151' },
  userText: { color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 8 },
  chatInput: { flex: 1, backgroundColor: '#f9fafb', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#e5e7eb', fontSize: 14 },
  sendBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
