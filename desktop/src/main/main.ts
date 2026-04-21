import { app, BrowserWindow, ipcMain, dialog, shell, Tray, Menu, nativeImage } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import { setupPrinterHandlers } from './ipc/printer';
import { setupScannerHandlers } from './ipc/scanner';
import { setupSyncHandlers } from './ipc/sync';

// Suppress GPU disk cache errors on Windows
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('disable-gpu-disk-cache');

const IS_DEV = process.env.NODE_ENV === 'development';
const API_URL = process.env.VITE_API_URL || 'http://localhost:5100';

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// ── Splash screen ─────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    skipTaskbar: true,
    webPreferences: { contextIsolation: true },
  });

  const splashHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
        border-radius: 16px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        color: white;
        -webkit-app-region: drag;
      }
      .logo { font-size: 72px; font-weight: 900; letter-spacing: -2px; margin-bottom: 8px; }
      .subtitle { font-size: 14px; opacity: 0.8; margin-bottom: 32px; letter-spacing: 2px; text-transform: uppercase; }
      .bar-bg { width: 200px; height: 4px; background: rgba(255,255,255,0.2); border-radius: 2px; overflow: hidden; }
      .bar { height: 100%; background: white; border-radius: 2px; animation: load 2s ease-in-out forwards; }
      @keyframes load { 0%{width:0%} 60%{width:75%} 100%{width:100%} }
      .version { position: absolute; bottom: 16px; font-size: 11px; opacity: 0.5; }
    </style>
  </head>
  <body>
    <div class="logo">POS</div>
    <div class="subtitle">Ddotsmedia Point of Sale</div>
    <div class="bar-bg"><div class="bar"></div></div>
    <div class="version">v${app.getVersion()} · Starting...</div>
  </body>
  </html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(splashHtml)}`);
}

// ── Main window ───────────────────────────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 768,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../main/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#f3f4f6',
    icon: getIconPath(),
  });

  // Inject API URL into renderer
  mainWindow.webContents.on('dom-ready', () => {
    mainWindow?.webContents.executeJavaScript(`
      window.__env__ = { VITE_API_URL: '${API_URL}' };
    `);
  });

  if (IS_DEV) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      splashWindow?.close();
      splashWindow = null;
      mainWindow?.show();
      mainWindow?.focus();
    }, 1800);
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Open external links in browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
}

// ── System tray ───────────────────────────────────────────────────────────────
function createTray() {
  const iconPath = getIconPath();
  const img = nativeImage.createFromPath(iconPath);
  const resized = img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 });

  tray = new Tray(resized);
  const menu = Menu.buildFromTemplate([
    { label: 'Ddotsmedia POS', enabled: false },
    { type: 'separator' },
    { label: '🖥 Show Window', click: () => { mainWindow?.show(); mainWindow?.focus(); } },
    { label: '🌐 Admin Panel', click: () => shell.openExternal('http://localhost:3001') },
    { label: '📡 API Status', click: () => shell.openExternal(`${API_URL}/health`) },
    { type: 'separator' },
    { label: '❌ Quit', click: () => app.quit() },
  ]);
  tray.setToolTip('Ddotsmedia POS System');
  tray.setContextMenu(menu);
  tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
}

function getIconPath(): string {
  const candidates = [
    path.join(process.resourcesPath ?? '', 'assets', 'icon.ico'),
    path.join(app.getAppPath(), 'assets', 'icon.ico'),
    path.join(__dirname, '../../assets', 'icon.ico'),
    path.join(__dirname, '../../../assets', 'icon.ico'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return '';
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createSplash();
  createWindow();
  createTray();
  setupPrinterHandlers();
  setupScannerHandlers();
  setupSyncHandlers();

  if (!IS_DEV) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  // Keep running in tray on Windows
  if (process.platform === 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
  else { mainWindow.show(); mainWindow.focus(); }
});

app.on('before-quit', () => {
  tray?.destroy();
});

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('app:open-admin', () => shell.openExternal('http://localhost:3001'));
ipcMain.handle('app:open-external', (_, url: string) => shell.openExternal(url));

// ── Error handling ────────────────────────────────────────────────────────────
process.on('uncaughtException', (error) => {
  dialog.showErrorBox('Unexpected Error', `${error.message}\n\n${error.stack}`);
});
