import { ipcMain, app, net } from 'electron';
import { offlineSalesDb, productCache } from '../../shared/db/sqlite';
import axios from 'axios';

const API_URL = process.env.VITE_API_URL || 'http://localhost:5100';

// Token is passed from renderer via IPC since we can't access localStorage from main
let cachedToken = '';

export function setupSyncHandlers() {
  ipcMain.handle('sync:set-token', (_, token: string) => { cachedToken = token; });

  ipcMain.handle('sync:push-offline', async () => {
    const pending = await offlineSalesDb.getPending();
    if (pending.length === 0) return { synced: 0, failed: 0, total: 0 };

    let synced = 0, failed = 0;
    for (const sale of pending) {
      try {
        await axios.post(`${API_URL}/v1/sync/push`, {
          records: [{ localId: (sale as any).id, type: 'SALE', payload: JSON.parse((sale as any).payload), createdAt: (sale as any).created_at, deviceId: 'desktop' }],
        }, { headers: { Authorization: `Bearer ${cachedToken}` } });
        await offlineSalesDb.markSynced((sale as any).id);
        synced++;
      } catch {
        await offlineSalesDb.markFailed((sale as any).id);
        failed++;
      }
    }
    return { synced, failed, total: pending.length };
  });

  ipcMain.handle('sync:status', async () => {
    const pending = await offlineSalesDb.getPending();
    return { pendingCount: pending.length };
  });

  ipcMain.handle('sync:pull-catalog', async () => {
    try {
      const { data } = await axios.get(`${API_URL}/v1/sync/pull`, { headers: { Authorization: `Bearer ${cachedToken}` } });
      if (data.products) await productCache.upsertMany(data.products);
      return { success: true, count: data.products?.length ?? 0 };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Local DB proxy handlers
  ipcMain.handle('db:search-products', async (_, q: string) => productCache.search(q));
  ipcMain.handle('db:find-barcode', async (_, barcode: string) => productCache.findByBarcode(barcode));
  ipcMain.handle('db:save-sale', async (_, sale: any) => offlineSalesDb.insert(sale));

  ipcMain.handle('app:version', () => app.getVersion());
  ipcMain.handle('app:is-online', () => net.isOnline());
}
