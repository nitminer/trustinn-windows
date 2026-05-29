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
  autoUpdater.checkForUpdatesAndNotify();

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
    sendStatusToWindow('Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    sendStatusToWindow(`Update available: ${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    sendStatusToWindow('No updates available.');
  });

  autoUpdater.on('error', (err) => {
    sendStatusToWindow(`Update error: ${err == null ? 'unknown' : err.message}`);
  });

  autoUpdater.on('update-downloaded', () => {
    sendStatusToWindow('Update downloaded. Restart app to install.');
  });
}

function sendStatusToWindow(message) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('update-status', message);
  }
}

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.on('restart-and-update', () => {
  autoUpdater.quitAndInstall();
});
