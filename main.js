/**
 * IP Detectives — Electron Main Process
 * Handles window creation, IPC for saving/loading data, and CSV export.
 */

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

/* ── Save-file path ─────────────────────────────────────────────── */
const SAVE_FILE = path.join(app.getPath('userData'), 'ip-detectives-save.json');

/* ── Window creation ─────────────────────────────────────────────── */
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 750,
    minWidth: 1000,
    minHeight: 650,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'IP Detectives',
    backgroundColor: '#0f0e17',
    show: false          // show after ready-to-show to avoid white flash
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Hide the default menu bar for a cleaner look
  win.setMenuBarVisibility(false);

  // Relay renderer errors to terminal for debugging
  win.webContents.on('console-message', (_e, level, message, line, sourceId) => {
    if (level >= 2) {
      console.error(`[Renderer Log/Error] ${message} (${sourceId}:${line})`);
    }
  });

  // Smoke test support
  if (process.env.ELECTRON_SMOKE_TEST) {
    win.webContents.on('did-finish-load', () => {
      console.log('SMOKE_TEST: Renderer loaded successfully!');
      setTimeout(() => {
        app.quit();
      }, 1500);
    });
    win.webContents.on('did-fail-load', (_e, code, desc) => {
      console.error('SMOKE_TEST: Failed to load:', code, desc);
      process.exit(1);
    });
  }

  // Show window once content is painted
  win.once('ready-to-show', () => win.show());
}

/* ── IPC Handlers ────────────────────────────────────────────────── */

// Load saved profiles (returns { profiles: {} } on error / first run)
ipcMain.handle('load-profiles', async () => {
  try {
    if (fs.existsSync(SAVE_FILE)) {
      const raw = fs.readFileSync(SAVE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      // Basic sanity check
      if (data && typeof data.profiles === 'object') return data;
    }
  } catch (err) {
    console.error('Error loading save file (will reset):', err.message);
  }
  return { profiles: {} };
});

// Persist profiles to disk
ipcMain.handle('save-profiles', async (_event, data) => {
  try {
    fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving profiles:', err.message);
    return false;
  }
});

// Load a JSON data file from the /data directory
ipcMain.handle('load-game-data', async (_event, filename) => {
  try {
    const filePath = path.join(__dirname, 'data', filename);
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading data/${filename}:`, err.message);
    return null;
  }
});

// Export a CSV string — opens a Save dialog and writes the file
ipcMain.handle('export-csv', async (_event, csvString) => {
  try {
    const result = await dialog.showSaveDialog({
      title: 'Export Report as CSV',
      defaultPath: `ip-detectives-report-${Date.now()}.csv`,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }]
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, csvString, 'utf-8');
      return true;
    }
  } catch (err) {
    console.error('Error exporting CSV:', err.message);
  }
  return false;
});

// Quit the app
ipcMain.handle('quit', () => {
  app.quit();
});

/* ── App lifecycle ───────────────────────────────────────────────── */
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
