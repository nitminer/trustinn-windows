const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    icon: path.join(__dirname, 'logo', 'logo.png'),
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();
  
  // Configure auto-updater
  autoUpdater.checkForUpdatesAndNotify();
  
  // Check for updates every 60 seconds
  setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

if (process.env.NODE_ENV !== 'test') {
  autoUpdater.on('checking-for-update', () => {
    console.log('[Auto-Update] Checking for updates...');
    sendStatusToWindow('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[Auto-Update] Update available: ${info.version}`);
    sendStatusToWindow(`🎉 Update available: v${info.version}. Downloading now...`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Auto-Update] No updates available.');
    sendStatusToWindow('✅ You are running the latest version!');
  });

  autoUpdater.on('error', (err) => {
    console.log('[Auto-Update] Error:', err);
    sendStatusToWindow(`❌ Update error: ${err == null ? 'unknown' : err.message}`);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[Auto-Update] Downloaded ${progressObj.percent}%`);
    sendStatusToWindow(`Downloading update... ${Math.round(progressObj.percent)}%`);
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[Auto-Update] Update downloaded. Ready to install.');
    sendStatusToWindow('✨ Update downloaded! Click "Restart and Install" to complete the update.');
  });
}

function sendStatusToWindow(message) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-status', message);
  }
}

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('restart-and-update', () => {
  console.log('[Auto-Update] Installing update and restarting...');
  autoUpdater.quitAndInstall();
});
