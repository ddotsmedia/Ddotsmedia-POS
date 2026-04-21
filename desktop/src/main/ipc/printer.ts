import { ipcMain } from 'electron';

// ESC/POS commands
const ESC = '\x1B';
const CUT = `${ESC}\x69`;
const BOLD_ON = `${ESC}E\x01`;
const BOLD_OFF = `${ESC}E\x00`;
const CENTER = `${ESC}a\x01`;
const LEFT = `${ESC}a\x00`;
const OPEN_DRAWER = `${ESC}p\x00\x19\xFA`;

export function setupPrinterHandlers() {
  ipcMain.handle('printer:print', async (_, receiptText: string) => {
    try {
      // Try to find a connected serial/USB printer
      const { SerialPort } = await import('serialport');
      const ports = await SerialPort.list();
      const printerPort = ports.find((p) => p.manufacturer?.toLowerCase().includes('epson') || p.manufacturer?.toLowerCase().includes('star'));

      if (!printerPort) {
        // Fallback: use Electron's print dialog
        return { success: false, error: 'No printer found — use print dialog' };
      }

      const port = new SerialPort({ path: printerPort.path, baudRate: 9600 });
      const data = Buffer.from(CENTER + BOLD_ON + receiptText + BOLD_OFF + LEFT + '\n\n\n' + CUT, 'binary');
      port.write(data);
      port.close();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('printer:open-drawer', async () => {
    try {
      const { SerialPort } = await import('serialport');
      const ports = await SerialPort.list();
      const printerPort = ports[0];
      if (!printerPort) return { success: false };

      const port = new SerialPort({ path: printerPort.path, baudRate: 9600 });
      port.write(Buffer.from(OPEN_DRAWER, 'binary'));
      port.close();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
