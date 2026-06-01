const appVersionEl = document.getElementById('appVersion');
const updateStatusEl = document.getElementById('updateStatus');
const restartUpdateBtn = document.getElementById('restartUpdateBtn');
const progressBar = document.getElementById('progressBar');
const progressFill = document.getElementById('progressFill');
const terminalEl = document.getElementById('terminal-scroll');
const outputAreaEl = document.querySelector('.output-area');
const ofStatusEl = document.getElementById('of-status');
const analyticsModalEl = document.getElementById('mwrap');
const analyticsResultGridEl = document.getElementById('m-result-grid');
const analyticsHealthEl = document.getElementById('m-health');
const analyticsInsightsEl = document.getElementById('m-insights-list');
const analyticsListEl = document.getElementById('m-log-list');
const runsCountEl = document.getElementById('ms1');
const viewButton = document.createElement('button');

const TOOLS = {
  c: [
    { name: 'CC Bounded Model Checker', params: [{ l: 'Unwind Bound', id: 'p1', t: 'number', ph: 'e.g. 10' }] },
    { name: 'DSE Mutation Analyzer', params: [{ l: 'Tool Value', id: 'p2', t: 'text', ph: 'e.g. 1' }] },
    { name: 'Dynamic Symbolic Execution', params: [] },
    { name: 'DSE with Pruning', params: [] },
    { name: 'Adv. Coverage Profiler', params: [{ l: 'Version', id: 'p3', t: 'text', ph: '1.0' }, { l: 'Time Bound (s)', id: 'p4', t: 'number', ph: '60' }] },
    { name: 'Mutation Testing Profiler', params: [{ l: 'Version', id: 'p5', t: 'text', ph: '1.0' }, { l: 'Time Bound (s)', id: 'p6', t: 'number', ph: '60' }] }
  ],
  java: [
    { name: 'Java Bounded Model Checker', params: [{ l: 'Unwind Bound', id: 'j1', t: 'number', ph: '10' }] }
  ],
  python: [
    { name: 'Condition Coverage Fuzzing', params: [{ l: 'Fuzz Iterations', id: 'py1', t: 'number', ph: '1000' }] }
  ],
  solidity: [
    {
      name: 'Smart Contract Verifier',
      params: [],
      subtools: [
        { name: 'BMC', params: [{ l: 'Unwind Bound', id: 's1', t: 'number', ph: '10' }] },
        { name: 'CHC', params: [{ l: 'Depth Bound', id: 's2', t: 'number', ph: '5' }] }
      ]
    }
  ]
};

let lang = 'c';
let tool = 0;
let sub = null;
let runs = 0;
let log = [];
let selectedSource = {
  kind: 'file',
  path: null,
  name: null
};
let latestOutputDir = null;
let latestRunResult = null;
let outputBuffer = [];
let isRunning = false;
let followTerminalScroll = true;

const root = document.documentElement;
const splitter = document.getElementById('splitter');
const mainLayout = document.getElementById('main-layout');
const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 520;
let isDragging = false;

function basenameLike(value) {
  if (!value) {
    return '';
  }
  const normalized = String(value).replace(/\\/g, '/').replace(/\/+$/, '');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function commonPath(paths) {
  if (!paths.length) {
    return null;
  }

  const normalized = paths.map((value) => String(value).replace(/\\/g, '/'));
  const splitPaths = normalized.map((value) => value.split('/'));
  let prefix = splitPaths[0];

  for (let index = 1; index < splitPaths.length; index += 1) {
    const current = splitPaths[index];
    let prefixLength = Math.min(prefix.length, current.length);
    while (prefixLength > 0) {
      const candidate = prefix.slice(0, prefixLength).join('/');
      const currentCandidate = current.slice(0, prefixLength).join('/');
      if (candidate === currentCandidate) {
        break;
      }
      prefixLength -= 1;
    }
    prefix = prefix.slice(0, prefixLength);
  }

  return prefix.join('/');
}

function resolveFolderSelection(files) {
  const paths = files.map((file) => file.path).filter(Boolean);
  if (!paths.length) {
    return { path: null, name: null };
  }

  const sample = files[0];
  const relativePath = sample.webkitRelativePath || '';
  if (relativePath.includes('/')) {
    const rootFolderName = relativePath.split('/')[0];
    const samplePath = String(sample.path || '').replace(/\\/g, '/');
    const marker = `/${rootFolderName}/`;
    const markerIndex = samplePath.indexOf(marker);
    if (markerIndex >= 0) {
      return {
        path: samplePath.slice(0, markerIndex + marker.length - 1),
        name: rootFolderName
      };
    }
  }

  const folderPath = commonPath(paths);
  return {
    path: folderPath,
    name: basenameLike(folderPath || paths[0] || '')
  };
}

function setSidebarWidth(px) {
  const width = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR, px));
  root.style.setProperty('--sidebar-width', width + 'px');
  splitter.setAttribute('aria-valuenow', width);
}

function setStatus(message) {
  updateStatusEl.textContent = message;
}

function setRestartButtonVisible(visible) {
  if (!restartUpdateBtn) {
    return;
  }
  restartUpdateBtn.style.display = visible ? 'inline-flex' : 'none';
}

function clearTerminal() {
  terminalEl.innerHTML = '<div class="t-empty" id="t-empty"><div class="t-empty-cross"></div><div class="t-empty-text">No output yet</div></div>';
}

function normalizeRunResult(result) {
  if (!result || typeof result !== 'object') {
    return null;
  }

  return result;
}

function updateTerminalScrollMode() {
  const threshold = 24;
  const remaining = terminalEl.scrollHeight - terminalEl.scrollTop - terminalEl.clientHeight;
  followTerminalScroll = remaining <= threshold;
}

function resetRunOutput() {
  outputBuffer = [];
  latestRunResult = null;
  latestOutputDir = null;
  followTerminalScroll = true;
  clearTerminal();
  ofStatusEl.textContent = 'Idle';
}

function appendLine(text, color) {
  const emptyState = document.getElementById('t-empty');
  if (emptyState && emptyState.parentNode) {
    emptyState.remove();
  }

  const row = document.createElement('div');
  row.style.whiteSpace = 'pre-wrap';
  row.style.color = color || 'var(--ink-2)';
  row.textContent = text;
  terminalEl.appendChild(row);
  if (followTerminalScroll) {
    terminalEl.scrollTop = terminalEl.scrollHeight;
  }
  outputBuffer.push(text);
}

function appendChunk(chunk, color) {
  String(chunk)
    .split(/\r?\n/)
    .filter(Boolean)
    .forEach((line) => appendLine(line, color));
}

function getCombinedOutputText() {
  const parts = [];
  if (latestRunResult && typeof latestRunResult.stdout === 'string') {
    parts.push(latestRunResult.stdout);
  }
  if (latestRunResult && typeof latestRunResult.stderr === 'string') {
    parts.push(latestRunResult.stderr);
  }
  if (outputBuffer.length) {
    parts.push(outputBuffer.join('\n'));
  }
  return parts.join('\n');
}

function getLastMatchValue(text, regex) {
  const matches = Array.from(text.matchAll(regex));
  if (!matches.length) {
    return null;
  }
  return matches[matches.length - 1][1];
}

function buildAnalyticsInsights(text) {
  const metricPatterns = [
    { label: 'Reachable Paths', regex: /Total number of Reachable paths or valid test cases\s*=:\s*([0-9]+)/gi },
    { label: 'Unreachable Paths', regex: /Total number of Unreachable paths or invalid test cases\s*=:\s*([0-9]+)/gi },
    { label: 'CBMC Time (sec)', regex: /Total time required \(sec\)\s*:=\s*([0-9.]+)/gi },
    { label: 'Killed Mutants', regex: /Total number of Killed Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Alive Mutants', regex: /Total number of Alive Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Reached Mutants', regex: /Total number of Reached Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Mutation Score', regex: /Mutation Score[^\n]*=:\s*([0-9.]+%?)/gi },
    { label: 'Total Instructions', regex: /KLEE:\s*done:\s*total instructions\s*=\s*([0-9]+)/gi },
    { label: 'Completed Paths', regex: /KLEE:\s*done:\s*completed paths\s*=\s*([0-9]+)/gi },
    { label: 'Generated Tests', regex: /KLEE:\s*done:\s*generated tests\s*=\s*([0-9]+)/gi },
    { label: 'ICMP Conditions Covered', regex: /Total number of Covered ICMP\/Atomic Condition:\s*([0-9]+)/gi },
    { label: 'ICMP Conditions Total', regex: /Total number of All ICMP\/Atomic Condition:\s*([0-9]+)/gi },
    { label: 'MC/DC Score', regex: /MC\/DC Score\s*=\s*([0-9.]+)/gi },
    { label: 'SC-MCC Score', regex: /SC-MCC Score\s*=\s*([0-9.]+)/gi },
    { label: 'Assertion Failures', regex: /Total Assertion Failure:\s*([0-9]+)/gi },
    { label: 'Assertions Added', regex: /Total Assertion Added:\s*([0-9]+)/gi },
    { label: 'Conditional Coverage', regex: /Conditional Coverage:\s*([0-9.]+%?)/gi },
    { label: 'Properties Inserted', regex: /Properties inserted\s*:\s*([0-9]+)/gi },
    { label: 'Property Violations', regex: /Properties violation detected \(unique\)\s*:\s*([0-9]+)/gi },
    { label: 'Atomic Conditions', regex: /Total atomic condition\s*:\s*([0-9]+)/gi },
    { label: 'Coverage %', regex: /Condition Coverage\s*%\s*:\s*([0-9.]+%?)/gi },
    { label: 'Runtime (sec)', regex: /total runtime in seconds\s*:\s*([0-9.]+)/gi }
  ];

  const metrics = metricPatterns
    .map((item) => ({ label: item.label, value: getLastMatchValue(text, item.regex) }))
    .filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() !== '');

  const errorCount = (text.match(/PARSING ERROR|syntax error|\berror\b|cannot stat|cannot remove|cannot move/gi) || []).length;
  const warningCount = (text.match(/\bWARNING\b|warning/gi) || []).length;

  return { metrics, errorCount, warningCount };
}

function renderAnalyticsInsights() {
  if (!analyticsHealthEl || !analyticsInsightsEl) {
    return;
  }

  const text = getCombinedOutputText();
  if (!text.trim()) {
    analyticsHealthEl.innerHTML = '<div class="m-chip">No output</div>';
    analyticsInsightsEl.innerHTML = '<div class="m-insight-item"><div class="m-insight-k">Status</div><div class="m-insight-v">Run a tool to generate analytics.</div></div>';
    return;
  }

  const parsed = buildAnalyticsInsights(text);
  analyticsHealthEl.innerHTML = [
    `<div class="m-chip">Metrics ${parsed.metrics.length}</div>`,
    `<div class="m-chip warn">Warnings ${parsed.warningCount}</div>`,
    `<div class="m-chip error">Errors ${parsed.errorCount}</div>`
  ].join('');

  analyticsInsightsEl.innerHTML = parsed.metrics.length
    ? parsed.metrics.map((metric) => `<div class="m-insight-item"><div class="m-insight-k">${metric.label}</div><div class="m-insight-v">${metric.value}</div></div>`).join('')
    : '<div class="m-insight-item"><div class="m-insight-k">Status</div><div class="m-insight-v">No recognizable metrics found in this output.</div></div>';
}

function handleOutputAreaWheel(event) {
  if (!outputAreaEl || !terminalEl) {
    return;
  }

  if (analyticsModalEl && analyticsModalEl.classList.contains('open')) {
    return;
  }

  if (event.target === terminalEl || terminalEl.contains(event.target)) {
    return;
  }

  event.preventDefault();
  followTerminalScroll = false;
  terminalEl.scrollTop += event.deltaY;
}

function getSelectedInputPath() {
  return selectedSource.path;
}

function getSelectedInputName() {
  return selectedSource.name || basenameLike(selectedSource.path || '');
}

function getParamValues() {
  const toolConfig = TOOLS[lang][tool];
  const params = toolConfig.subtools && sub !== null ? toolConfig.subtools[sub].params : toolConfig.params;
  return params.reduce((accumulator, param) => {
    const input = document.getElementById(param.id);
    accumulator[param.id] = input ? input.value.trim() : '';
    return accumulator;
  }, {});
}

function getSelectedToolLabel() {
  const toolConfig = TOOLS[lang][tool];
  if (toolConfig.subtools && sub !== null) {
    return `${toolConfig.name} - ${toolConfig.subtools[sub].name}`;
  }
  return toolConfig.name;
}

function buildRunPayload() {
  const sourcePath = getSelectedInputPath();
  if (!sourcePath) {
    throw new Error('Please choose an input file or folder first.');
  }

  const toolConfig = TOOLS[lang][tool];
  const sourceName = getSelectedInputName();
  const isFolder = selectedSource.kind === 'folder';

  return {
    language: lang,
    toolIndex: tool,
    subtoolIndex: toolConfig.subtools ? (sub ?? 0) : null,
    params: getParamValues(),
    sourcePath,
    isFolder,
    inputName: sourceName,
    toolLabel: getSelectedToolLabel()
  };
}

function render() {
  const tools = TOOLS[lang];
  document.getElementById('sb-tool-count').textContent = `${String(tool + 1).padStart(2, '0')}/${String(tools.length).padStart(2, '0')}`;
  const strip = document.getElementById('tool-strip');
  strip.innerHTML = '';

  tools.forEach((item, index) => {
    const element = document.createElement('div');
    element.className = 'tool-row' + (index === tool ? ' active' : '');
    element.innerHTML = `<div class="tool-row-num">${String(index + 1).padStart(2, '0')}</div><div class="tool-row-name">${item.name}</div><div class="tool-row-arrow">→</div>`;
    element.onclick = () => {
      tool = index;
      sub = null;
      resetRunOutput();
      render();
    };
    strip.appendChild(element);
  });

  const activeTool = tools[tool];
  const subtoolWrap = document.getElementById('subtool-wrap');
  const subtoolRow = document.getElementById('subtool-row');
  if (activeTool.subtools) {
    subtoolWrap.style.display = 'block';
    subtoolRow.innerHTML = activeTool.subtools.map((subtool, index) => `<button class="st-btn${sub === index ? ' active' : ''}" onclick="setSub(${index}, event)">${subtool.name}</button>`).join('');
  } else {
    subtoolWrap.style.display = 'none';
  }

  renderParams();
}

function setSub(index, event) {
  event.stopPropagation();
  sub = index;
  resetRunOutput();
  render();
}

function renderParams() {
  const toolConfig = TOOLS[lang][tool];
  let params = toolConfig.params;
  if (toolConfig.subtools && sub !== null) {
    params = toolConfig.subtools[sub].params;
  }

  const paramsBody = document.getElementById('params-body');
  if (!params.length) {
    paramsBody.innerHTML = '<div style="font-family:var(--mono);font-size:9px;color:var(--ink-4);font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">None required</div>';
    return;
  }

  paramsBody.innerHTML = params.map((item) => `<div class="param-block"><label class="param-lbl">${item.l}</label><input class="param-in" id="${item.id}" type="${item.t}" placeholder="${item.ph}"></div>`).join('');
}

function updateAnalyticsModal() {
  const completedRuns = log.filter((entry) => entry.ok && typeof entry.durationMs === 'number');
  const averageDuration = completedRuns.length
    ? Math.round(completedRuns.reduce((sum, entry) => sum + entry.durationMs, 0) / completedRuns.length / 1000)
    : null;
  const passRate = log.length
    ? Math.round((log.filter((entry) => entry.ok).length / log.length) * 100)
    : null;

  runsCountEl.textContent = String(log.length);

  const statValues = document.querySelectorAll('.m-stat-n');
  if (statValues[0]) {
    statValues[0].textContent = String(log.length);
  }
  if (statValues[1]) {
    statValues[1].textContent = averageDuration === null ? '—' : `${averageDuration}s`;
  }
  if (statValues[2]) {
    statValues[2].textContent = passRate === null ? '—' : `${passRate}%`;
  }

  if (analyticsResultGridEl) {
    if (latestRunResult) {
      const result = latestRunResult;
      const outputFiles = Array.isArray(result.outputFiles) ? result.outputFiles : [];
      analyticsResultGridEl.innerHTML = [
        { k: 'Tool', v: result.toolLabel || '—' },
        { k: 'Exit Code', v: result.exitCode === 0 ? '0' : String(result.exitCode ?? '—') },
        { k: 'Duration', v: typeof result.durationMs === 'number' ? `${Math.round(result.durationMs / 1000)}s` : '—' },
        { k: 'Output Files', v: String(outputFiles.length) },
        { k: 'Output Folder', v: result.outputDir || '—' },
        { k: 'Run ID', v: result.runId || '—' }
      ].map((item) => `<div class="m-result-item"><div class="m-result-k">${item.k}</div><div class="m-result-v">${item.v}</div></div>`).join('');
    } else {
      analyticsResultGridEl.innerHTML = '<div class="m-result-item"><div class="m-result-k">Status</div><div class="m-result-v">No completed run yet</div></div>';
    }
  }

  renderAnalyticsInsights();

  analyticsListEl.innerHTML = log.length
    ? log.map((entry) => `<div class="m-log-row"><span class="m-log-t">${entry.ts}</span><span>${entry.tn}</span><span class="${entry.ok ? 'm-log-ok' : 'm-log-fail'}">${entry.ok ? 'OK' : 'FAIL'}</span></div>`).join('')
    : '<div class="m-log-row"><span class="m-log-t">—</span><span>No runs yet</span></div>';
}

function updateSelectedSourceLabels() {
  const fileLabel = document.getElementById('file-selection-label');
  const folderLabel = document.getElementById('folder-selection-label');
  if (selectedSource.kind === 'folder') {
    if (folderLabel) {
      folderLabel.textContent = selectedSource.path || selectedSource.name ? `${selectedSource.name || 'Folder'} • ${selectedSource.path || ''}` : 'No folder selected';
    }
    if (fileLabel) {
      fileLabel.textContent = 'File not selected';
    }
    return;
  }

  if (fileLabel) {
    fileLabel.textContent = selectedSource.path || selectedSource.name ? `${selectedSource.name || 'File'} • ${selectedSource.path || ''}` : 'No file selected';
  }
  if (folderLabel) {
    folderLabel.textContent = 'No folder selected';
  }
}

async function chooseFile() {
  if (!window.electronAPI) {
    appendLine('File picker is only available in Electron mode.', 'var(--orange)');
    return;
  }

  const result = await window.electronAPI.pickInputFile();
  if (result && !result.canceled && result.path) {
    selectedSource = {
      kind: 'file',
      path: result.path,
      name: result.name || basenameLike(result.path)
    };
    updateSelectedSourceLabels();
    appendLine(`✓ Selected file: ${result.path}`, 'var(--green)');
  }
}

async function chooseFolder() {
  if (!window.electronAPI) {
    appendLine('Folder picker is only available in Electron mode.', 'var(--orange)');
    return;
  }

  const result = await window.electronAPI.pickInputFolder();
  if (result && !result.canceled && result.path) {
    selectedSource = {
      kind: 'folder',
      path: result.path,
      name: result.name || basenameLike(result.path)
    };
    updateSelectedSourceLabels();
    appendLine(`✓ Selected folder: ${result.path}`, 'var(--green)');
  }
}

function closeModal() {
  analyticsModalEl.classList.remove('open');
}

function bgClose(event) {
  if (event.target === analyticsModalEl) {
    closeModal();
  }
}

async function doRun() {
  if (!window.electronAPI) {
    appendLine('Electron IPC is unavailable in browser mode.', 'var(--orange)');
    return;
  }

  let payload;
  try {
    payload = buildRunPayload();
  } catch (error) {
    appendLine(error.message, 'var(--orange)');
    setStatus(error.message);
    return;
  }

  if (isRunning) {
    appendLine('A Docker run is already in progress.', 'var(--orange)');
    return;
  }

  resetRunOutput();
  isRunning = true;
  latestRunResult = null;
  appendLine(`▶ ${payload.language}/${payload.toolLabel}${payload.inputName ? ` [${payload.inputName}]` : ''}`, 'var(--ink)');
  setStatus('Starting Docker workflow...');

  try {
    const result = normalizeRunResult(await window.electronAPI.runTool(payload));
    latestRunResult = result;
    latestOutputDir = result ? result.outputDir : null;
    runs += 1;
    log.unshift({
      ts: new Date().toLocaleTimeString(),
      tn: (result && result.toolLabel) || payload.toolLabel,
      ok: true,
      durationMs: result && typeof result.durationMs === 'number' ? result.durationMs : null,
      outputDir: result ? result.outputDir || null : null
    });
    if (result && result.outputDir) {
      appendLine(`✓ Output saved to ${result.outputDir}`, 'var(--green)');
    } else {
      appendLine('✓ Docker run finished.', 'var(--green)');
    }
    appendLine(`✓ Output files: ${result && Array.isArray(result.outputFiles) ? result.outputFiles.length : 0}`, 'var(--green)');
    ofStatusEl.textContent = 'Complete';
    setStatus(`Completed ${(result && result.toolLabel) || payload.toolLabel}`);
  } catch (error) {
    log.unshift({
      ts: new Date().toLocaleTimeString(),
      tn: payload.toolLabel,
      ok: false,
      durationMs: typeof error.durationMs === 'number' ? error.durationMs : null,
      outputDir: error && error.outputDir ? error.outputDir : null
    });
    appendLine(error.message || 'Docker run failed.', 'var(--orange)');
    ofStatusEl.textContent = 'Failed';
  } finally {
    isRunning = false;
    updateAnalyticsModal();
  }
}

function updateAnalyticsStats(summary) {
  if (summary && typeof summary === 'object') {
    latestRunResult = {
      ...(latestRunResult || {}),
      ...summary,
      toolLabel: (latestRunResult && latestRunResult.toolLabel) || summary.toolLabel || (latestRunResult ? latestRunResult.toolLabel : null)
    };
  }
}

async function doCompile() {
  if (!window.electronAPI) {
    appendLine('Electron IPC is unavailable in browser mode.', 'var(--orange)');
    return;
  }

  let payload;
  try {
    payload = buildRunPayload();
  } catch (error) {
    appendLine(error.message, 'var(--orange)');
    setStatus(error.message);
    return;
  }

  try {
    const result = await window.electronAPI.validateTool(payload);
    latestOutputDir = result.outputDir;
    appendLine(`✓ Docker ready for ${result.toolLabel}`, 'var(--green)');
    appendLine(`✓ Target output folder: ${result.outputDir}`, 'var(--green)');
    setStatus(`Ready to run ${result.toolLabel}`);
    ofStatusEl.textContent = 'Ready';
  } catch (error) {
    appendLine(error.message || 'Validation failed.', 'var(--orange)');
    setStatus(`❌ ${error.message || 'Validation failed'}`);
    ofStatusEl.textContent = 'Validation failed';
  }
}

async function doCopy() {
  const text = outputBuffer.join('\n');
  if (!text) {
    appendLine('Nothing to copy yet.', 'var(--orange)');
    return;
  }

  if (window.electronAPI) {
    await window.electronAPI.copyText(text);
    appendLine('✓ Terminal output copied to clipboard.', 'var(--green)');
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    appendLine('✓ Terminal output copied to clipboard.', 'var(--green)');
  } catch (error) {
    appendLine('Clipboard copy failed.', 'var(--orange)');
  }
}

async function openModal() {
  updateAnalyticsModal();
  if (window.electronAPI && latestOutputDir) {
    const analytics = await window.electronAPI.getToolAnalytics(latestOutputDir);
    if (analytics && analytics.success && analytics.summary) {
      updateAnalyticsStats(analytics.summary);
      updateAnalyticsModal();
    }
  }
  analyticsModalEl.classList.add('open');
}

async function viewOutput() {
  if (!latestOutputDir) {
    appendLine('No output folder available yet.', 'var(--orange)');
    return;
  }

  if (!window.electronAPI) {
    appendLine('Output folders can only be opened in Electron.', 'var(--orange)');
    return;
  }

  const result = await window.electronAPI.openOutputFolder(latestOutputDir);
  if (result.success) {
    appendLine(`✓ Opened ${latestOutputDir}`, 'var(--green)');
  } else {
    appendLine(result.message || 'Could not open output folder.', 'var(--orange)');
  }
}

async function doStop() {
  if (!window.electronAPI) {
    appendLine('Stop is only available in Electron mode.', 'var(--orange)');
    return;
  }

  const stopped = await window.electronAPI.stopTool();
  if (stopped) {
    appendLine('■ Active Docker run stopped.', 'var(--orange)');
    setStatus('Stopping active Docker run...');
    ofStatusEl.textContent = 'Stopped';
  } else {
    appendLine('No active Docker run to stop.', 'var(--orange)');
  }
}

function doClear() {
  resetRunOutput();
  setStatus('Ready');
}

function handlePointerDown() {
  if (window.innerWidth <= 720) {
    return;
  }
  isDragging = true;
  splitter.classList.add('dragging');
  document.body.style.userSelect = 'none';
}

function handlePointerMove(event) {
  if (!isDragging || window.innerWidth <= 720) {
    return;
  }
  const mainRect = mainLayout.getBoundingClientRect();
  setSidebarWidth(event.clientX - mainRect.left);
}

function handlePointerUp() {
  if (!isDragging) {
    return;
  }
  isDragging = false;
  splitter.classList.remove('dragging');
  document.body.style.userSelect = '';
}

splitter.addEventListener('pointerdown', handlePointerDown);
window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointercancel', handlePointerUp);

splitter.addEventListener('keydown', (event) => {
  if (window.innerWidth <= 720) {
    return;
  }

  const current = parseInt(getComputedStyle(root).getPropertyValue('--sidebar-width'), 10) || 280;
  if (event.key === 'ArrowLeft') {
    event.preventDefault();
    setSidebarWidth(current - 16);
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault();
    setSidebarWidth(current + 16);
  }
  if (event.key === 'Home') {
    event.preventDefault();
    setSidebarWidth(MIN_SIDEBAR);
  }
  if (event.key === 'End') {
    event.preventDefault();
    setSidebarWidth(MAX_SIDEBAR);
  }
});

window.addEventListener('resize', () => {
  if (window.innerWidth <= 720) {
    return;
  }
  const current = parseInt(getComputedStyle(root).getPropertyValue('--sidebar-width'), 10) || 280;
  setSidebarWidth(current);
});

if (window.electronAPI) {
  window.electronAPI.getAppVersion()
    .then((version) => {
      appVersionEl.innerText = `v${version}`;
      if (updateStatusEl.textContent === 'Initializing...') {
        setStatus('Ready for Docker tool execution');
      }
    })
    .catch((error) => {
      console.error('Error getting app version:', error);
      appVersionEl.innerText = 'v0.0.2';
    });

  window.electronAPI.onUpdateStatus((message) => {
    console.log('[UI] Update status:', message);
    setStatus(message);

    if (message.includes('Downloading')) {
      progressBar.style.display = 'block';
      setRestartButtonVisible(false);
      const match = message.match(/(\d+)%/);
      if (match) {
        progressFill.style.width = match[1] + '%';
      }
    } else if (message.includes('Update downloaded') || message.includes('Restart and Install')) {
      progressBar.style.display = 'none';
      setRestartButtonVisible(true);
    } else {
      progressBar.style.display = 'none';
      setRestartButtonVisible(false);
    }
  });

  window.electronAPI.onToolOutput((message) => {
    appendChunk(message, 'var(--ink-2)');
  });

  terminalEl.addEventListener('scroll', updateTerminalScrollMode, { passive: true });
  terminalEl.addEventListener('pointerdown', () => {
    updateTerminalScrollMode();
  });
  if (outputAreaEl) {
    outputAreaEl.addEventListener('wheel', handleOutputAreaWheel, { passive: false });
  }

  window.electronAPI.onToolComplete((result) => {
    const normalized = normalizeRunResult(result);
    if (!normalized) {
      return;
    }

    latestRunResult = normalized;
    latestOutputDir = normalized.outputDir || null;
    if (normalized.toolLabel) {
      setStatus(`Completed ${normalized.toolLabel}`);
    }
  });

  window.electronAPI.onToolError((error) => {
    if (error && error.message) {
      appendLine(error.message, 'var(--orange)');
      setStatus(`❌ ${error.message}`);
    }
  });

  window.electronAPI.pickInputFile = window.electronAPI.pickInputFile || (() => Promise.resolve({ canceled: true }));
  window.electronAPI.pickInputFolder = window.electronAPI.pickInputFolder || (() => Promise.resolve({ canceled: true }));
} else {
  appVersionEl.innerText = 'browser';
  setStatus('Running in browser mode. Auto-update is disabled.');
  setRestartButtonVisible(false);
}

if (restartUpdateBtn) {
  restartUpdateBtn.addEventListener('click', () => {
    if (!window.electronAPI || typeof window.electronAPI.requestRestartAndUpdate !== 'function') {
      appendLine('Restart and install is only available in Electron mode.', 'var(--orange)');
      return;
    }

    restartUpdateBtn.disabled = true;
    restartUpdateBtn.textContent = 'Restarting...';
    setStatus('Installing update and restarting...');
    window.electronAPI.requestRestartAndUpdate();
  });
}

const fileButton = document.getElementById('fb1');
if (fileButton) {
  fileButton.addEventListener('click', chooseFile);
}

const folderButton = document.getElementById('fb2');
if (folderButton) {
  folderButton.addEventListener('click', chooseFolder);
}

window.setLang = function setLang(language, button) {
  lang = language;
  tool = 0;
  sub = null;
  resetRunOutput();
  document.querySelectorAll('.lang-card').forEach((card) => card.classList.remove('active'));
  if (button && button.classList) {
    button.classList.add('active');
  } else {
    const activeCard = Array.from(document.querySelectorAll('.lang-card')).find((card) => card.getAttribute('onclick')?.includes(`setLang('${language}'`));
    if (activeCard) {
      activeCard.classList.add('active');
    }
  }
  document.getElementById('fdir-wrap').style.display = language === 'solidity' ? 'block' : 'none';
  render();
};

window.doRun = doRun;
window.doCompile = doCompile;
window.doCopy = doCopy;
window.doStop = doStop;
window.doClear = doClear;
window.openModal = openModal;
window.closeModal = closeModal;
window.bgClose = bgClose;
window.setSub = setSub;
window.viewOutput = viewOutput;
window.getSelectedOutputPath = () => latestOutputDir;
window.chooseFile = chooseFile;
window.chooseFolder = chooseFolder;

// Add a view button to the output actions without changing the HTML structure too much.
const outputActions = document.querySelector('.out-actions');
if (outputActions && !document.getElementById('view-output-btn')) {
  viewButton.id = 'view-output-btn';
  viewButton.className = 'oa-btn';
  viewButton.textContent = 'View';
  viewButton.onclick = viewOutput;
  outputActions.insertBefore(viewButton, outputActions.children[1] || null);
}

render();
updateSelectedSourceLabels();
