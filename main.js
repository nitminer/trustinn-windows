const { app, BrowserWindow, clipboard, dialog, ipcMain, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runDockerTool, stopActiveRun, validateTool, compileDockerTool } = require('./toolRunner');

let mainWindow;
let updateTimer = null;

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

function sendToWindow(channel, message) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send(channel, message);
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged || process.env.NODE_ENV === 'test') {
    return;
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[Auto-Update] Checking for updates...');
    sendToWindow('update-status', 'Checking for updates...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[Auto-Update] Update available: ${info.version}`);
    sendToWindow('update-status', `🎉 Update available: v${info.version}. Downloading now...`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[Auto-Update] No updates available.');
    sendToWindow('update-status', '✅ You are running the latest version!');
  });

  autoUpdater.on('error', (err) => {
    console.log('[Auto-Update] Error:', err);
    sendToWindow('update-status', `❌ Update error: ${err == null ? 'unknown' : err.message}`);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    console.log(`[Auto-Update] Downloaded ${progressObj.percent}%`);
    sendToWindow('update-status', `Downloading update... ${Math.round(progressObj.percent)}%`);
  });

  autoUpdater.on('update-downloaded', () => {
    console.log('[Auto-Update] Update downloaded. Ready to install.');
    sendToWindow('update-status', '✨ Update downloaded! Click "Restart and Install" to complete the update.');
  });

  autoUpdater.checkForUpdatesAndNotify();
  updateTimer = setInterval(() => {
    autoUpdater.checkForUpdates();
  }, 60000);
}

function cleanupTimers() {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  cleanupTimers();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());

ipcMain.handle('tool:pick-file', async (_event, language) => {
  let exts = ['c', 'h', 'java', 'py', 'sol'];
  let filterName = 'Supported files';

  if (language === 'c') {
    exts = ['c', 'h'];
    filterName = 'C files';
  } else if (language === 'java') {
    exts = ['java'];
    filterName = 'Java files';
  } else if (language === 'python') {
    exts = ['py'];
    filterName = 'Python files';
  } else if (language === 'solidity') {
    exts = ['sol'];
    filterName = 'Solidity files';
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Trustinn Input File',
    properties: ['openFile'],
    filters: [
      { name: filterName, extensions: exts },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true, path: null, name: null };
  }

  return {
    canceled: false,
    path: result.filePaths[0],
    name: path.basename(result.filePaths[0])
  };
});

ipcMain.handle('tool:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Choose Trustinn Input Folder',
    properties: ['openDirectory']
  });

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true, path: null, name: null };
  }

  return {
    canceled: false,
    path: result.filePaths[0],
    name: path.basename(result.filePaths[0])
  };
});

ipcMain.handle('tool:validate', async (_event, payload) => {
  sendToWindow('update-status', 'Validating Docker environment...');
  return validateTool(payload, {
    onStatus: (message) => sendToWindow('update-status', message)
  });
});

ipcMain.handle('tool:run', async (_event, payload) => {
  sendToWindow('update-status', 'Starting Trustinn Docker workflow...');
  try {
    const result = await runDockerTool(payload, {
      onStatus: (message) => sendToWindow('update-status', message),
      onOutput: (message) => sendToWindow('tool-output', message)
    });
    sendToWindow('tool-complete', result);
    return result;
  } catch (error) {
    sendToWindow('tool-error', {
      message: error.message,
      exitCode: error.exitCode || 1,
      outputDir: error.outputDir || null,
      outputFiles: error.outputFiles || []
    });
    throw error;
  }
});

ipcMain.handle('tool:compile', async (_event, payload) => {
  sendToWindow('update-status', 'Starting Trustinn Docker compile...');
  try {
    const result = await compileDockerTool(payload, {
      onStatus: (message) => sendToWindow('update-status', message),
      onOutput: (message) => sendToWindow('tool-output', message)
    });
    sendToWindow('tool-complete', result);
    return result;
  } catch (error) {
    sendToWindow('tool-error', {
      message: error.message,
      exitCode: error.exitCode || 1,
      outputDir: error.outputDir || null,
      outputFiles: error.outputFiles || []
    });
    throw error;
  }
});

ipcMain.handle('tool:stop', () => {
  const stopped = stopActiveRun();
  if (stopped) {
    sendToWindow('update-status', 'Stopping active Docker run...');
  }
  return stopped;
});

ipcMain.handle('tool:open-output-folder', async (_event, folderPath) => {
  if (!folderPath) {
    return { success: false, message: 'No output folder available.' };
  }

  const result = await shell.openPath(folderPath);
  return result ? { success: false, message: result } : { success: true, message: folderPath };
});

ipcMain.handle('tool:copy-text', (_event, text) => {
  clipboard.writeText(String(text || ''));
  return true;
});

ipcMain.handle('tool:get-analytics', (_event, folderPath) => {
  if (!folderPath || !fs.existsSync(folderPath)) {
    return { success: false, runs: [] };
  }

  // const summaryFile = path.join(folderPath, 'run-summary.json');
  if (fs.existsSync(summaryFile)) {
    try {
      return { success: true, summary: JSON.parse(fs.readFileSync(summaryFile, 'utf8')) };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  return { success: false, message: 'No analytics summary found.' };
});

ipcMain.handle('tool:list-samples', (_event, payload) => {
  const { language, toolIndex } = payload;
  const sampleMap = {
    'c': [
      'CC-bounded-Model-Checker',
      'DSE MUTATION ANALYSER',
      'DYNAMIC SYMBOLIC EXECUTION',
      'DSE WITH PRUNING',
      'AdvanceCodeCoverageProfiler',
      'Mutation testing profiler'
    ],
    'java': ['JAVA'],
    'python': ['PYTHON'],
    'solidity': ['SOLIDITY']
  };

  const folderName = sampleMap[language]?.[toolIndex];
  if (!folderName) return { success: false, message: 'No samples configured for this tool.' };

  const folderPath = path.join(__dirname, 'sampleprograms', folderName);
  if (!fs.existsSync(folderPath)) {
    return { success: false, message: 'Samples directory not found.' };
  }

  try {
    const entries = fs.readdirSync(folderPath, { withFileTypes: true });
    const files = entries
      .filter(e => e.isFile() || e.isDirectory())
      .filter(e => !e.name.startsWith('.'))
      .map(e => ({
        name: e.name,
        kind: e.isDirectory() ? 'folder' : 'file',
        path: path.join(folderPath, e.name)
      }));
    return { success: true, files };
  } catch (err) {
    return { success: false, message: err.message };
  }
});

ipcMain.on('restart-and-update', () => {
  console.log('[Auto-Update] Installing update and restarting...');
  autoUpdater.quitAndInstall();
});

ipcMain.handle('tool:save-custom-code', async (_event, payload) => {
  const { code, language } = payload;
  const extMap = { 'c': 'c', 'java': 'java', 'python': 'py', 'solidity': 'sol' };
  const ext = extMap[language] || 'txt';

  let tempDir = os.tmpdir();
  let fileName = `trustinn-custom-${Date.now()}.${ext}`;

  if (language === 'java') {
    const classMatch = code.match(/public\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/);
    const className = classMatch ? classMatch[1] : 'Main';
    // Java strictly requires the file name to match the public class name
    tempDir = path.join(os.tmpdir(), `trustinn-java-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    fileName = `${className}.java`;
  }

  const tempFile = path.join(tempDir, fileName);
  fs.writeFileSync(tempFile, code, 'utf8');

  return {
    path: tempFile,
    name: fileName
  };
});
