'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/lib/api';

export default function AIInsightsPage() {
  const [question, setQuestion] = useState('');
  const [nlqResult, setNlqResult] = useState<any>(null);
  const [nlqLoading, setNlqLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const { data: insights } = useQuery({
    queryKey: ['daily-insights'],
    queryFn: () => posApi.getDailyInsights().then((r) => r.data),
  });

  const { data: anomalies } = useQuery({
    queryKey: ['anomalies'],
    queryFn: () => posApi.getAnomalies().then((r) => r.data),
  });

  const handleNLQ = async () => {
    if (!question.trim()) return;
    setNlqLoading(true);
    try {
      const res = await posApi.naturalLanguageQuery(question);
      setNlqResult(res.data);
    } catch (e: any) {
      setNlqResult({ error: e.response?.data?.message || 'Query failed — AI may not be configured' });
    } finally {
      setNlqLoading(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    const newMsg: { role: 'user' | 'assistant'; content: string } = { role: 'user', content: chatInput };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await posApi.chat(updatedMessages);
      setChatMessages((m) => [...m, { role: 'assistant', content: res.data.reply }]);
    } catch {
      setChatMessages((m) => [...m, { role: 'assistant', content: 'Sorry, AI chat is not available. Configure your OPENAI_API_KEY.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">AI Insights</h1>

      {insights?.aiSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🤖</span>
            <div>
              <p className="text-sm font-semibold text-blue-800 mb-1">Daily Summary — {insights.date}</p>
              <p className="text-gray-700 text-sm leading-relaxed">{insights.aiSummary}</p>
            </div>
          </div>
        </div>
      )}

      {anomalies && anomalies.count > 0 && (
        <div className={`border rounded-xl p-5 ${anomalies.riskLevel === 'high' ? 'border-red-300 bg-red-50' : 'border-orange-200 bg-orange-50'}`}>
          <p className="font-semibold text-gray-800 mb-2">
            ⚠️ {anomalies.count} anomalies detected — Risk: <span className="uppercase font-bold">{anomalies.riskLevel}</span>
          </p>
          {anomalies.findings?.map((f: string, i: number) => <p key={i} className="text-sm text-gray-700">• {f}</p>)}
          {anomalies.recommendations?.length > 0 && (
            <div className="mt-3 pt-3 border-t border-orange-200">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Recommendations</p>
              {anomalies.recommendations.map((r: string, i: number) => <p key={i} className="text-sm text-gray-700">→ {r}</p>)}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-gray-800">Natural Language Query</h2>
          <p className="text-xs text-gray-500">Ask questions about your data in plain English</p>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. What were the top 5 products sold last week?"
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <button onClick={handleNLQ} disabled={nlqLoading || !question.trim()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {nlqLoading ? 'Querying...' : 'Run Query'}
          </button>
          {nlqResult && (
            <div className="mt-3 bg-gray-50 rounded-lg p-3">
              {nlqResult.error ? (
                <p className="text-sm text-red-600">{nlqResult.error}</p>
              ) : (
                <>
                  <p className="text-xs text-gray-500 mb-2">{nlqResult.description}</p>
                  <pre className="text-xs text-gray-700 overflow-auto max-h-48">{JSON.stringify(nlqResult.data, null, 2)}</pre>
                </>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-5 flex flex-col">
          <h2 className="font-semibold text-gray-800 mb-1">AI Support Chat</h2>
          <p className="text-xs text-gray-500 mb-3">Ask about POS operations, inventory, and reports</p>
          <div className="flex-1 border border-gray-200 rounded-lg p-3 space-y-3 overflow-y-auto max-h-72 mb-3 bg-gray-50">
            {chatMessages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Start a conversation...</p>
            ) : chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-700'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border rounded-xl px-3 py-2 text-sm text-gray-400">Thinking...</div>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleChat()}
              placeholder="Ask anything..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <button onClick={handleChat} disabled={chatLoading || !chatInput.trim()}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
