const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateStatus: (callback) => ipcRenderer.on('update-status', (_event, message) => callback(message)),
  requestRestartAndUpdate: () => ipcRenderer.send('restart-and-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
