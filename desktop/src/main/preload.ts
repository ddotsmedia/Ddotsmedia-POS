import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('posAPI', {
  // Printer
  printReceipt: (receiptData: string) => ipcRenderer.invoke('printer:print', receiptData),
  openCashDrawer: () => ipcRenderer.invoke('printer:open-drawer'),

  // Barcode Scanner
  onBarcodeScanned: (callback: (barcode: string) => void) => {
    ipcRenderer.on('scanner:barcode', (_, barcode) => callback(barcode));
    return () => ipcRenderer.removeAllListeners('scanner:barcode');
  },

  // Sync
  setToken: (token: string) => ipcRenderer.invoke('sync:set-token', token),
  syncOfflineData: () => ipcRenderer.invoke('sync:push-offline'),
  pullCatalog: () => ipcRenderer.invoke('sync:pull-catalog'),
  getSyncStatus: () => ipcRenderer.invoke('sync:status'),

  // Local DB (proxied from main process)
  db: {
    searchProducts: (q: string) => ipcRenderer.invoke('db:search-products', q),
    findByBarcode: (barcode: string) => ipcRenderer.invoke('db:find-barcode', barcode),
    saveOfflineSale: (sale: any) => ipcRenderer.invoke('db:save-sale', sale),
  },
  onSyncComplete: (callback: (result: any) => void) => {
    ipcRenderer.on('sync:complete', (_, result) => callback(result));
    return () => ipcRenderer.removeAllListeners('sync:complete');
  },

  // App
  getVersion: () => ipcRenderer.invoke('app:version'),
  isOnline: () => ipcRenderer.invoke('app:is-online'),
  openAdminPanel: () => ipcRenderer.invoke('app:open-admin'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
});
