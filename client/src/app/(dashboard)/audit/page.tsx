'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { posApi } from '@/lib/api';
import { format } from 'date-fns';

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-600',
  LOGIN: 'bg-purple-100 text-purple-700',
  VOID: 'bg-orange-100 text-orange-700',
};

export default function AuditLogsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page],
    queryFn: () => posApi.getAuditLogs(page).then((r) => r.data),
  });

  const logs: any[] = data?.data ?? [];
  const pages = Math.ceil((data?.total ?? 0) / (data?.limit ?? 50));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">Complete trail of all system actions</p>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['Time', 'User', 'Action', 'Entity', 'Entity ID', 'Details'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No audit logs found</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                  {format(new Date(log.createdAt), 'MMM d HH:mm:ss')}
                </td>
                <td className="px-4 py-3 text-gray-700 font-medium">{log.user?.name ?? 'System'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-500'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{log.entityType}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{log.entityId?.slice(-8)}</td>
                <td className="px-4 py-3 text-gray-600 text-xs max-w-xs truncate">
                  {log.description ?? (log.changes ? JSON.stringify(log.changes).slice(0, 60) + '...' : '—')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">← Prev</button>
            <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
