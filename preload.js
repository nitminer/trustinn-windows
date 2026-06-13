const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Listen for update status messages from main process
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (_event, message) => callback(message));
  },

  // Listen for tool execution status and output
  onToolStatus: (callback) => {
    ipcRenderer.on('tool-status', (_event, message) => callback(message));
  },
  onToolOutput: (callback) => {
    ipcRenderer.on('tool-output', (_event, message) => callback(message));
  },
  onToolComplete: (callback) => {
    ipcRenderer.on('tool-complete', (_event, result) => callback(result));
  },
  onToolError: (callback) => {
    ipcRenderer.on('tool-error', (_event, error) => callback(error));
  },
  
  // Request to restart and install the update
  requestRestartAndUpdate: () => {
    ipcRenderer.send('restart-and-update');
  },
  
  // Get the current app version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // Docker-backed Trustinn tool execution
  pickInputFile: (language) => ipcRenderer.invoke('tool:pick-file', language),
  pickInputFolder: () => ipcRenderer.invoke('tool:pick-folder'),
  validateTool: (payload) => ipcRenderer.invoke('tool:validate', payload),
  runTool: (payload) => ipcRenderer.invoke('tool:run', payload),
  stopTool: () => ipcRenderer.invoke('tool:stop'),
  openOutputFolder: (folderPath) => ipcRenderer.invoke('tool:open-output-folder', folderPath),
  copyText: (text) => ipcRenderer.invoke('tool:copy-text', text),
  getToolAnalytics: (folderPath) => ipcRenderer.invoke('tool:get-analytics', folderPath),
  listSamples: (payload) => ipcRenderer.invoke('tool:list-samples', payload)
});
