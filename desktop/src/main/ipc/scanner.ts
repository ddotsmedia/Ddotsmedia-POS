import { ipcMain, BrowserWindow } from 'electron';

// Simulates barcode scanner input — in production, listen to HID/serial scanner device
export function setupScannerHandlers() {
  // Allow renderer to trigger a barcode scan (for testing)
  ipcMain.handle('scanner:simulate', (_, barcode: string) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.webContents.send('scanner:barcode', barcode);
    return { sent: true };
  });
}
