import { offlineSalesDb } from './sqlite';

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:5100';

let isSyncing = false;

async function getAuthHeader(): Promise<Record<string, string>> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function syncOfflineSales(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  isSyncing = true;

  let synced = 0;
  let failed = 0;

  try {
    const pending = await offlineSalesDb.getPending();
    if (!pending.length) return { synced: 0, failed: 0 };

    const headers = await getAuthHeader();
    const records = pending.map((row: any) => ({
      localId: row.id,
      type: 'SALE' as const,
      payload: JSON.parse(row.payload),
      createdAt: row.created_at,
      deviceId: row.branch_id,
    }));

    const res = await fetch(`${API_URL}/v1/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify({ records }),
    });

    if (!res.ok) throw new Error(`Sync push failed: ${res.status}`);

    const data = await res.json();

    for (const result of data.results ?? []) {
      if (result.status === 'synced') {
        await offlineSalesDb.markSynced(result.localId);
        synced++;
      } else {
        await offlineSalesDb.markFailed(result.localId);
        failed++;
      }
    }
  } catch (err) {
    console.error('[Sync] Push failed:', err);
    failed++;
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

export async function pullCatalog(tenantId: string, branchId: string, since?: string): Promise<any> {
  try {
    const headers = await getAuthHeader();
    const params = new URLSearchParams({ tenantId, branchId, ...(since && { since }) });
    const res = await fetch(`${API_URL}/v1/sync/pull?${params}`, { headers });
    if (!res.ok) throw new Error(`Catalog pull failed: ${res.status}`);
    const data = await res.json();

    if (data.products?.length) {
      const { productCache } = await import('./sqlite');
      await productCache.upsertMany(data.products);
    }

    return data;
  } catch (err) {
    console.error('[Sync] Pull failed:', err);
    return null;
  }
}

export function startAutoSync(intervalMs = 30_000): () => void {
  const run = () => {
    if (navigator.onLine) syncOfflineSales().catch(console.error);
  };

  window.addEventListener('online', run);
  const timer = setInterval(run, intervalMs);

  // Run immediately if online
  if (navigator.onLine) run();

  return () => {
    window.removeEventListener('online', run);
    clearInterval(timer);
  };
}
