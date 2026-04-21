import React, { useState, useEffect, useRef } from 'react';
import { posApi } from '../lib/api';

interface Message { role: 'user' | 'assistant'; content: string; }

export default function AIScreen() {
  const [insights, setInsights] = useState<any>(null);
  const [anomalies, setAnomalies] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I\'m your AI assistant. I can help you analyze sales, check inventory, or answer questions about your business. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [nlqQuery, setNlqQuery] = useState('');
  const [nlqResult, setNlqResult] = useState<any>(null);
  const [nlqLoading, setNlqLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'nlq' | 'insights'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([
      posApi.getDailyInsights().catch(() => null),
      posApi.getAnomalies().catch(() => null),
    ]).then(([ins, anom]) => {
      if (ins) setInsights(ins.data);
      if (anom) setAnomalies(anom.data);
    });
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg: Message = { role: 'user', content: input };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setChatLoading(true);
    try {
      const { data } = await posApi.aiChat(updated);
      setMessages((m) => [...m, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: '⚠️ AI chat unavailable. Please configure your OPENAI_API_KEY in the server .env file.' }]);
    } finally { setChatLoading(false); }
  };

  const runNLQ = async () => {
    if (!nlqQuery.trim() || nlqLoading) return;
    setNlqLoading(true);
    setNlqResult(null);
    try {
      const { data } = await posApi.nlQuery(nlqQuery);
      setNlqResult(data);
    } catch (e: any) {
      setNlqResult({ error: e.response?.data?.message || 'Query failed — AI or DB error' });
    } finally { setNlqLoading(false); }
  };

  const quickQuestions = [
    'What are the top 5 selling products this month?',
    'Which cashier has the most sales today?',
    'What products are running low on stock?',
    'Show me revenue trend for the last 7 days',
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-blue-700 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🤖</div>
          <div>
            <h1 className="text-xl font-black">AI Business Intelligence</h1>
            <p className="text-sm opacity-80">Powered by GPT-4o · Natural language analytics</p>
          </div>
        </div>

        {/* Stats Strip */}
        {insights && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xs opacity-70">Today Revenue</p>
              <p className="text-lg font-black">AED {Number(insights.todayRevenue).toFixed(0)}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-xs opacity-70">Transactions</p>
              <p className="text-lg font-black">{insights.todayTransactions}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${(insights.changePercent ?? 0) >= 0 ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
              <p className="text-xs opacity-70">vs Yesterday</p>
              <p className="text-lg font-black">{(insights.changePercent ?? 0) >= 0 ? '+' : ''}{insights.changePercent}%</p>
            </div>
          </div>
        )}
      </div>

      {/* Anomaly Alert */}
      {anomalies?.count > 0 && (
        <div className={`mx-5 mt-3 p-3 rounded-xl border ${anomalies.riskLevel === 'high' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className="font-bold text-sm text-gray-900">⚠️ {anomalies.count} anomalies detected — Risk: <span className="uppercase">{anomalies.riskLevel}</span></p>
          {anomalies.findings?.slice(0, 2).map((f: string, i: number) => <p key={i} className="text-xs text-gray-700 mt-1">• {f}</p>)}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mx-5 mt-3 bg-gray-200 p-1 rounded-xl">
        {(['chat', 'nlq', 'insights'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${activeTab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
            {t === 'nlq' ? 'Data Query' : t === 'insights' ? 'Daily Insights' : 'AI Chat'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden mx-5 mb-5 mt-3">
        {/* AI CHAT */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">🤖</div>}
                  <div className={`max-w-sm rounded-2xl px-4 py-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start gap-2">
                  <div className="w-7 h-7 bg-purple-600 rounded-full flex items-center justify-center text-xs">🤖</div>
                  <div className="bg-gray-100 rounded-2xl px-4 py-3">
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick questions */}
            <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
              {quickQuestions.map((q) => (
                <button key={q} onClick={() => setInput(q)} className="flex-shrink-0 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 whitespace-nowrap">
                  {q}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-100 p-4 flex gap-2">
              <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Ask anything about your business..."
                className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" />
              <button onClick={sendMessage} disabled={chatLoading || !input.trim()} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors">
                Send
              </button>
            </div>
          </div>
        )}

        {/* NL QUERY */}
        {activeTab === 'nlq' && (
          <div className="h-full flex flex-col gap-4">
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
              <p className="text-sm font-bold text-gray-700 mb-3">Ask a business question in plain English:</p>
              <div className="flex gap-3">
                <textarea value={nlqQuery} onChange={(e) => setNlqQuery(e.target.value)} rows={3}
                  placeholder="e.g. What were the total sales by category last week?"
                  className="flex-1 border-2 border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500" />
                <button onClick={runNLQ} disabled={nlqLoading || !nlqQuery.trim()} className="px-6 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 disabled:opacity-40 transition-colors">
                  {nlqLoading ? '⏳' : '▶ Run'}
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Top 5 products this week', 'Revenue by cashier today', 'Low stock products'].map((q) => (
                  <button key={q} onClick={() => setNlqQuery(q)} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium hover:bg-purple-100 border border-purple-200">{q}</button>
                ))}
              </div>
            </div>

            {nlqResult && (
              <div className="flex-1 bg-white rounded-2xl border-2 border-gray-100 p-5 overflow-auto">
                {nlqResult.error ? (
                  <div className="text-red-600 text-sm p-3 bg-red-50 rounded-xl">{nlqResult.error}</div>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-600 mb-3">{nlqResult.description}</p>
                    {Array.isArray(nlqResult.data) && nlqResult.data.length > 0 ? (
                      <table className="w-full text-sm border-collapse">
                        <thead>
                          <tr>{Object.keys(nlqResult.data[0]).map((k) => <th key={k} className="text-left px-3 py-2 bg-gray-50 font-semibold text-gray-600 text-xs uppercase border-b">{k}</th>)}</tr>
                        </thead>
                        <tbody>
                          {nlqResult.data.map((row: any, i: number) => (
                            <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                              {Object.values(row).map((v: any, j) => <td key={j} className="px-3 py-2.5 text-gray-700">{String(v ?? '')}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <pre className="text-xs text-gray-700 bg-gray-50 rounded-xl p-4 overflow-auto">{JSON.stringify(nlqResult.data, null, 2)}</pre>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* DAILY INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="h-full overflow-y-auto space-y-4">
            {insights?.aiSummary && (
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🤖</span>
                  <div>
                    <p className="font-bold text-purple-800 mb-2">AI Daily Summary — {insights.date}</p>
                    <p className="text-gray-700 text-sm leading-relaxed">{insights.aiSummary}</p>
                  </div>
                </div>
              </div>
            )}

            {insights?.topProducts?.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-4">Top Products Today</h3>
                {insights.topProducts.map((p: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full text-sm flex items-center justify-center font-black">{i + 1}</div>
                    <span className="flex-1 text-sm font-medium text-gray-800">{p.name}</span>
                    <span className="text-sm font-bold text-gray-900">AED {Number(p._sum?.total ?? 0).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            )}

            {anomalies && (
              <div className={`rounded-2xl border-2 p-5 ${anomalies.count > 0 ? (anomalies.riskLevel === 'high' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200') : 'bg-green-50 border-green-200'}`}>
                <h3 className="font-bold text-gray-800 mb-2">🔍 Fraud & Anomaly Detection</h3>
                {anomalies.count === 0 ? (
                  <p className="text-green-700 text-sm">✓ No anomalies detected in the last 24 hours</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold mb-2">Risk Level: <span className="uppercase font-black">{anomalies.riskLevel}</span> · {anomalies.count} flagged</p>
                    {anomalies.findings?.map((f: string, i: number) => <p key={i} className="text-sm text-gray-700 mb-1">• {f}</p>)}
                    {anomalies.recommendations?.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-xs font-bold uppercase text-gray-500 mb-1">Recommendations</p>
                        {anomalies.recommendations.map((r: string, i: number) => <p key={i} className="text-sm text-gray-700">→ {r}</p>)}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
