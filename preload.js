const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for update status messages from main process
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, message) => callback(message));
  },
  
  // Request to restart and install the update
  requestRestartAndUpdate: () => {
    ipcRenderer.send('restart-and-update');
  },
  
  // Get the current app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
