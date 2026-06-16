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

const samplesModalWrapEl = document.getElementById('samples-modal-wrap');
const samplesListEl = document.getElementById('samples-list');

const authWrapEl = document.getElementById('authWrap');
const authBtnEl = document.getElementById('authBtn');
const loginIdentifierEl = document.getElementById('loginIdentifier');
const loginPasswordEl = document.getElementById('loginPassword');
const loginBtnEl = document.getElementById('loginBtn');
const logoutBtnEl = document.getElementById('logoutBtn');
const authStatusTextEl = document.getElementById('authStatusText');
const authHeadingTextEl = document.getElementById('authHeadingText');
const authNoteEl = document.getElementById('authNote');
const lockedCardEl = document.getElementById('lockedCard');

const AUTH_KEY = 'nitminer_auth_v1';
const LOGIN_URL = 'https://api.nitminer.com/api/auth/login';
const ADMIN_EMAIL = 'admin@nitminer.com';

const TOOLS = {
  c: [
    { name: 'CC Bounded Model Checker', params: [{ l: 'Unwind Bound', id: 'p1', t: 'number', ph: 'e.g. 10 sec' }] },
    { name: 'DSE Mutation Analyzer', params: [{ l: 'Tool Value', id: 'p2', t: 'text', ph: 'e.g. 1' }] },
    { name: 'Dynamic Symbolic Execution', params: [] },
    { name: 'DSE with Pruning', params: [] },
    { name: 'Adv. Coverage Profiler', params: [{ l: 'Version', id: 'p3', t: 'text', ph: '4' }, { l: 'Time Bound (s)', id: 'p4', t: 'number', ph: '3600' }] },
    { name: 'Mutation Testing Profiler', params: [{ l: 'Version', id: 'p5', t: 'text', ph: '4' }, { l: 'Time Bound (s)', id: 'p6', t: 'number', ph: '3600' }] }
  ],
  java: [
    { name: 'Java Bounded Model Checker' }
  ],
  python: [
    { name: 'Condition Coverage Fuzzing', params: [] }
  ],
  solidity: [
    {
      name: 'Smart Contract Verifier',
      params: [],
      subtools: [
        { name: 'BMC', params: [] },
        { name: 'CHC', params: [] }
      ]
    }
  ]
};

let lang = 'c';
let tool = 0;
let sub = null;
let runs = 0;
let log = [];
let selectedSource = { kind: 'file', path: null, name: null };
let latestOutputDir = null;
let latestRunResult = null;
let outputBuffer = [];
let isRunning = false;
let followTerminalScroll = true;
let currentAuth = null;
let appUnlocked = false;

let javaAssertionsChartInstance = null;
let javaCoverageChartInstance = null;

let pythonAssertionsChartInstance = null;
let pythonCoverageChartInstance = null;

let activeRunLang = null;
let activeRunTool = null;
let activeRunSub = null;

const root = document.documentElement;
const splitter = document.getElementById('splitter');
const mainLayout = document.getElementById('main-layout');
const MIN_SIDEBAR = 240;
const MAX_SIDEBAR = 520;
let isDragging = false;

function basenameLike(value) {
  if (!value) return '';
  const normalized = String(value).replace(/\\/g, '/').replace(/\/+$/, '');
  const index = normalized.lastIndexOf('/');
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function getSimulatedPrompt(payload) {
  const toolConfig = TOOLS[payload.language][payload.toolIndex];
  let toolDir = '';
  let scriptCall = '';

  if (payload.language === 'c') {
    if (payload.toolIndex === 0) {
      toolDir = 'CC-BOUNDED MODEL CHECKER';
      scriptCall = `./cbmc_script.sh ${payload.inputName} ${payload.params.p1 || '10'}`;
    } else if (payload.toolIndex === 1) {
      toolDir = 'DSE_MUTATION_ANALYSER';
      scriptCall = `./KLEEMA.sh ${payload.inputName} ${payload.params.p2 || '1'}`;
    } else if (payload.toolIndex === 2) {
      toolDir = 'DYNAMIC_SYMBOLIC_EXECUTION';
      scriptCall = `./KLEE.sh ${payload.inputName}`;
    } else if (payload.toolIndex === 3) {
      toolDir = 'DSE_WITH_PRUNING';
      scriptCall = `./tx.sh ${payload.inputName}`;
    } else if (payload.toolIndex === 4) {
      toolDir = 'ADVANCE_CODE_COVERAGE_PROFILER';
      const nameWithoutExt = payload.inputName.replace(/\.[^/.]+$/, "");
      scriptCall = `./main-gProfiler.sh ${nameWithoutExt} ${payload.params.p3 || '4'} ${payload.params.p4 || '3600'}`;
    } else if (payload.toolIndex === 5) {
      toolDir = 'MUTATION_TESTING_PROFILER';
      scriptCall = `./main-gProfiler.sh ${payload.inputName} ${payload.params.p5 || '4'} ${payload.params.p6 || '3600'}`;
    }
  } else if (payload.language === 'java') {
    toolDir = 'JAVA';
    scriptCall = `./shellsc.sh ${payload.inputName}`;
  } else if (payload.language === 'python') {
    toolDir = 'PYTHON';
    scriptCall = `./shellpy.sh ${payload.inputName}`;
  } else if (payload.language === 'solidity') {
    toolDir = 'SOLIDITY';
    const mode = payload.subtoolIndex === 1 ? 'chc' : 'bmc';
    scriptCall = `./latest.sh ${payload.inputName} ${mode}`;
  }

  return `user@NITMINER:/mnt/d/TRUSTINN/${toolDir}$ ${scriptCall}`;
}

function filterLine(line, filterLang, filterTool, filterSub) {
  if (filterTool === 'compile') return true;

  const commonErrors = [
    /\berror\b/i,
    /\bwarning\b/i,
    /PARSING ERROR/i,
    /syntax error/i,
    /Compilation:\s*FAILED/i,
    /Compilation \(Syntax Check\):\s*FAILED/i,
    /failed/i,
    /exception/i
  ];

  const common = [
    /This code is developed by/i
  ];

  let regexes = [];

  if (filterLang === 'c') {
    if (filterTool === 0) {
      regexes = [
        ...common,
        /Final Result Report from CBMC/i,
        /Total number of Reachable paths/i,
        /Total number of Unreachable paths/i,
        /Total time required/i
      ];
    } else if (filterTool === 1) {
      regexes = [
        ...common,
        /Mutation Score Report/i,
        /Total number of Alive Mutants/i,
        /Total number of Killed Mutants/i,
        /Total number of Reached Mutants/i,
        /Total number of Dead Mutants/i,
        /Total number of Total Mutants/i,
        /Mutation Score/i,
        /Report-Finish/i
      ];
    } else if (filterTool === 2 || filterTool === 3) {
      regexes = [
        ...common,
        /^Odd[-]+|^[-]+$/i,
        /\|\s*Path\s*\|/i,
        /^\|/i
      ];
    } else if (filterTool === 4) {
      regexes = [
        ...common,
        /MC\/DC Report/i,
        /SC-MCC Report/i,
        /Total no\. of feasible/i,
        /Total no\. of (MC\/DC|SC-MCC) sequences/i,
        /Score\s*=\s*/i,
        /Report-Finish/i
      ];
    } else if (filterTool === 5) {
      regexes = [
        ...common,
        /Mutation Report/i,
        /Total no\. of Killed Mutants/i,
        /Total no\. of Mutants/i,
        /Mutation Score/i,
        /Report-Finish/i
      ];
    }
  } else if (filterLang === 'java') {
    regexes = [
      ...common,
      /Total Assertion Failure/i,
      /Total Assertion Added/i,
      /Conditional Coverage/i
    ];
  } else if (filterLang === 'python') {
    regexes = [
      ...commonErrors,
      /=== Assertion Summary ===/i,
      /Total assertion violations/i,
      /Unique assertions covered/i,
      /Failed Assertion/i,
      /Unique Assertions/i,
      /Passed Assertions/i,
      /Total Assertion/i,
      /Conditional Coverage/i,
      /^[=-]{3,}$/
    ];
  } else if (filterLang === 'solidity') {
    regexes = [
      ...common,
      /^={10,}/,
      /^[=-]{3,}$/,
      /^\s*\d+\s*$/,
      /Processing Contract/i,
      /Properties inserted/i,
      /Properties violation detected/i,
      /Total atomic condition/i,
      /Condition Coverage %/i,
      /Total runtime/i,
      /Final result of/i,
      /Project total Assert count/i,
      /Project total Properties violation/i,
      /Project total violation/i,
      /Project total atomic condition/i,
      /Project total Condition Coverage/i,
      /\*+Time Analysis\*+/
    ];
  }

  for (const regex of regexes) {
    if (regex.test(line)) {
      return true;
    }
  }
  return false;
}

function commonPath(paths) {
  if (!paths.length) return null;
  const normalized = paths.map((value) => String(value).replace(/\\/g, '/'));
  const splitPaths = normalized.map((value) => value.split('/'));
  let prefix = splitPaths[0];
  for (let index = 1; index < splitPaths.length; index += 1) {
    const current = splitPaths[index];
    let prefixLength = Math.min(prefix.length, current.length);
    while (prefixLength > 0) {
      const candidate = prefix.slice(0, prefixLength).join('/');
      const currentCandidate = current.slice(0, prefixLength).join('/');
      if (candidate === currentCandidate) break;
      prefixLength -= 1;
    }
    prefix = prefix.slice(0, prefixLength);
  }
  return prefix.join('/');
}

function resolveFolderSelection(files) {
  const paths = files.map((file) => file.path).filter(Boolean);
  if (!paths.length) return { path: null, name: null };
  const sample = files[0];
  const relativePath = sample.webkitRelativePath || '';
  if (relativePath.includes('/')) {
    const rootFolderName = relativePath.split('/')[0];
    const samplePath = String(sample.path || '').replace(/\\/g, '/');
    const marker = `/${rootFolderName}/`;
    const markerIndex = samplePath.indexOf(marker);
    if (markerIndex >= 0) {
      return { path: samplePath.slice(0, markerIndex + marker.length - 1), name: rootFolderName };
    }
  }
  const folderPath = commonPath(paths);
  return { path: folderPath, name: basenameLike(folderPath || paths[0] || '') };
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
  if (!restartUpdateBtn) return;
  restartUpdateBtn.style.display = visible ? 'inline-flex' : 'none';
}

function clearTerminal() {
  terminalEl.innerHTML = '<div class="t-empty" id="t-empty"><div class="t-empty-cross"></div><div class="t-empty-text">No output yet</div></div>';
}

function normalizeRunResult(result) {
  if (!result || typeof result !== 'object') return null;
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
  ofStatusEl.style.color = '';
}

function appendLine(text, color) {
  const emptyState = document.getElementById('t-empty');
  if (emptyState && emptyState.parentNode) emptyState.remove();
  const row = document.createElement('div');
  row.style.whiteSpace = 'pre-wrap';
  row.style.color = color || 'var(--ink-2)';
  row.textContent = text;
  terminalEl.appendChild(row);
  if (followTerminalScroll) terminalEl.scrollTop = terminalEl.scrollHeight;
  outputBuffer.push(text);
}

function filterText(rawText, lang, toolIndex, subtoolIndex) {
  if (!rawText) return '';
  const lines = rawText.split(/\r?\n/);
  const filtered = [];

  lines.forEach((line) => {
    if (/^TRUSTINN_HOME:\s*/.test(line) ||
      /^TRACERX_PATH:\s*/.test(line) ||
      /^LD_LIBRARY_PATH:\s*/.test(line) ||
      /^PATH updated successfully for Docker environment$/.test(line)) {
      return;
    }
    if (filterLine(line, lang, toolIndex, subtoolIndex)) {
      if (line.trim() === '') {
        const lastLine = filtered[filtered.length - 1];
        if (lastLine !== undefined && lastLine.trim() !== '') {
          filtered.push('');
        }
      } else {
        filtered.push(line);
      }
    }
  });
  return filtered.join('\n');
}

function appendChunk(chunk, color) {
  const filterLang = activeRunLang || lang;
  const filterTool = activeRunTool !== null ? activeRunTool : tool;
  const filterSub = activeRunSub !== null ? activeRunSub : sub;

  const lines = String(chunk).split(/\r?\n/);
  lines.forEach((line) => {
    if (/^TRUSTINN_HOME:\s*/.test(line) ||
      /^TRACERX_PATH:\s*/.test(line) ||
      /^LD_LIBRARY_PATH:\s*/.test(line) ||
      /^PATH updated successfully for Docker environment$/.test(line)) {
      return;
    }

    if (filterLine(line, filterLang, filterTool, filterSub)) {
      if (line.trim() === '') {
        const lastLine = outputBuffer[outputBuffer.length - 1];
        if (lastLine !== undefined && lastLine.trim() !== '') {
          appendLine('', color);
        }
      } else {
        appendLine(line, color);
      }
    }
  });
}

function getCombinedOutputText() {
  const parts = [];
  if (latestRunResult) {
    const runLang = latestRunResult.language || activeRunLang || lang;
    const runTool = latestRunResult.toolIndex !== undefined ? latestRunResult.toolIndex : (activeRunTool !== null ? activeRunTool : tool);
    const runSub = latestRunResult.subtoolIndex !== undefined ? latestRunResult.subtoolIndex : (activeRunSub !== null ? activeRunSub : sub);

    let cleanStdout = '';
    if (typeof latestRunResult.stdout === 'string') {
      cleanStdout = filterText(latestRunResult.stdout, runLang, runTool, runSub);
    }
    let cleanStderr = '';
    if (typeof latestRunResult.stderr === 'string') {
      cleanStderr = filterText(latestRunResult.stderr, runLang, runTool, runSub);
    }

    if (cleanStdout) parts.push(cleanStdout);
    if (cleanStderr) parts.push(cleanStderr);

    if (!cleanStdout && !cleanStderr && outputBuffer.length) {
      parts.push(outputBuffer.join('\n'));
    }
  } else if (outputBuffer.length) {
    parts.push(outputBuffer.join('\n'));
  }
  return parts.join('\n');
}

function getLastMatchValue(text, regex) {
  const matches = Array.from(text.matchAll(regex));
  if (!matches.length) return null;
  return matches[matches.length - 1][1];
}

function buildAnalyticsInsights(text, runLang, runTool, runSub) {
  // console.log(text, runLang, runSub, runTool);

  const metricPatterns = [
    { label: 'Properties inserted', regex: /Properties inserted\s*:\s*([0-9]+)/gi },
    { label: 'Properties violation detected (dynamic)', regex: /Properties violation detected \(dynamic\)\s*:\s*([0-9]+)/gi },
    { label: 'Properties violation detected (unique)', regex: /Properties violation detected \(unique\)\s*:\s*([0-9]+)/gi },
    { label: 'Total atomic condition', regex: /Total atomic condition\s*:\s*([0-9]+)/gi },
    { label: 'Condition Coverage %', regex: /Condition Coverage\s*%\s*:\s*([0-9.]+%?)/gi },
    { label: 'Total runtime in seconds', regex: /Total runtime in seconds\s*:\s*([0-9.]+)/gi },
    { label: 'Total runtime', regex: /Total runtime:\s*([0-9:.,eE-]+)/gi },
    { label: 'Total number of Reachable paths or valid test cases', regex: /Total number of Reachable paths or valid test cases\s*=:\s*([0-9]+)/gi },
    { label: 'Total number of Unreachable paths or invalid test cases', regex: /Total number of Unreachable paths or invalid test cases\s*=:\s*([0-9]+)/gi },
    { label: 'Total time required (sec)', regex: /Total time required \(sec\)\s*:=\s*([0-9.]+)/gi },
    { label: 'Total number of Alive Mutants', regex: /Total number of Alive Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Total number of Killed Mutants', regex: /Total number of Killed Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Total number of Reached Mutants', regex: /Total number of Reached Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Total number of Dead Mutants', regex: /Total number of Dead Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Total number of Total Mutants', regex: /Total number of Total Mutants\s*=:\s*([0-9]+)/gi },
    { label: 'Mutation Score (Killed/Reached)', regex: /Mutation Score[^\n]*=:\s*([0-9.]+%?)/gi },

    { label: 'Path', regex: /\|\s*([^\s|]+\/klee-out-\d+)\s*\|/gi },
    { label: 'Instructions', regex: /\|\s*[^\s|]+\/klee-out-\d+\s*\|\s*([0-9]+)\s*\|/gi },
    { label: 'Time (sec)', regex: /\|\s*[^\s|]+\/klee-out-\d+\s*\|\s*[0-9]+\s*\|\s*([0-9.]+)\s*\|/gi },
    { label: 'ICov %', regex: /\|\s*[^\s|]+\/klee-out-\d+\s*\|\s*[0-9]+\s*\|\s*[0-9.]+\s*\|\s*([0-9.]+%?)\s*\|/gi },
    { label: 'BCov %', regex: /\|\s*[^\s|]+\/klee-out-\d+\s*\|\s*[0-9]+\s*\|\s*[0-9.]+\s*\|\s*[0-9.]+\s*\|\s*([0-9.]+\s*%?)\s*\|/gi },
    { label: 'ICount', regex: /\|\s*[^\s|]+\/klee-out-\d+\s*\|\s*[0-9]+\s*\|\s*[0-9.]+\s*\|\s*[0-9.]+\s*\|\s*[0-9.]+\s*\|\s*([0-9]+)\s*\|/gi },
    { label: 'TSolver %', regex: /\|\s*[^\s|]+\/klee-out-\d+\s*\|\s*[0-9]+\s*\|\s*[0-9.]+\s*\|\s*[0-9.]+\s*\|\s*[0-9.]+\s*\|\s*[0-9]+\s*\|\s*([0-9.]+%?)\s*\|/gi },

    { label: 'Feasible MC/DC sequences', regex: /Total no\.\ of feasible MC\/DC sequences\s*=\s*([0-9]+)/gi },
    { label: 'Total MC/DC sequences', regex: /Total no\.\ of MC\/DC sequences\s*=\s*([0-9]+)/gi },
    { label: 'MC/DC Score', regex: /MC\/DC Score\s*=\s*([0-9.]+)/gi },
    { label: 'Feasible SC-MCC sequences', regex: /Total no\.\ of feasible SC-MCC sequences\s*=\s*([0-9]+)/gi },
    { label: 'Total SC-MCC sequences', regex: /Total no\.\ of SC-MCC sequences\s*=\s*([0-9]+)/gi },
    { label: 'SC-MCC Score', regex: /SC-MCC Score\s*=\s*([0-9.]+)/gi },

    { label: 'Killed Mutants', regex: /Total no\.\ of Killed Mutants\s*=\s*([0-9]+)/gi },
    { label: 'Total Mutants', regex: /Total no\.\ of Mutants\s*=\s*([0-9]+)/gi },
    { label: 'Mutation Score', regex: /Mutation Score\s*=\s*([0-9.]+)/gi },

    { label: 'Assertion Failures', regex: /Total Assertion Failure:\s*([0-9]+)/gi },
    { label: 'Assertions Added', regex: /Total Assertion Added:\s*([0-9]+)/gi },
    { label: 'Failed Assertion', regex: /Failed Assertion:\s*([0-9]+)/gi },
    { label: 'Unique Assertions', regex: /Unique Assertions\s*:\s*([0-9]+)/gi },
    { label: 'Passed Assertions', regex: /Passed Assertions\s*:\s*([0-9]+)/gi },
    { label: 'Total Assertion', regex: /Total Assertion\s*:\s*([0-9]+)/gi },
    { label: 'Conditional Coverage %', regex: /Conditional Coverage:\s*([0-9.]+%?)/gi },

    { label: 'Project total Assert count', regex: /total Assert count:\s*([0-9]+)/gi },
    { label: 'Project total violation (dynamic)', regex: /total Properties violation detected \(dynamic\):\s*([0-9]+)/gi },
    { label: 'Project total violation (unique)', regex: /total violation detected \(unique\):\s*([0-9]+)/gi },
    { label: 'Project total atomic condition', regex: /total atomic condition:\s*([0-9]+)/gi },
    { label: 'Project total Condition Coverage %', regex: /total Condition Coverage\s*%\s*:\s*([0-9.]+%?)/gi },
    { label: 'Project total runtime in seconds', regex: /total runtime in seconds\s*:\s*([0-9.]+)/gi }
  ];

  const metrics = metricPatterns
    .map((item) => ({ label: item.label, value: getLastMatchValue(text, item.regex) }))
    .filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() !== '');

  let allowedLabels = [];
  if (runLang === 'c') {
    if (runTool === 0) {
      allowedLabels = [
        'Total number of Reachable paths or valid test cases',
        'Total number of Unreachable paths or invalid test cases',
        'Total time required (sec)'
      ];
    } else if (runTool === 1) {
      allowedLabels = [
        'Total number of Alive Mutants',
        'Total number of Killed Mutants',
        'Total number of Reached Mutants',
        'Total number of Dead Mutants',
        'Total number of Total Mutants',
        'Mutation Score (Killed/Reached)'
      ];
    } else if (runTool === 2 || runTool === 3) {
      allowedLabels = ['Path', 'Instructions', 'Time (sec)', 'ICov %', 'BCov %', 'ICount', 'TSolver %'];
    } else if (runTool === 4) {
      allowedLabels = ['Feasible MC/DC sequences', 'Total MC/DC sequences', 'MC/DC Score', 'Feasible SC-MCC sequences', 'Total SC-MCC sequences', 'SC-MCC Score'];
    } else if (runTool === 5) {
      allowedLabels = ['Killed Mutants', 'Total Mutants', 'Mutation Score'];
    }
  } else if (runLang === 'java') {
    allowedLabels = ['Assertion Failures', 'Assertions Added', 'Conditional Coverage %'];
  } else if (runLang === 'python') {
    allowedLabels = ['Failed Assertion', 'Unique Assertions', 'Passed Assertions', 'Total Assertion', 'Conditional Coverage %'];
  } else if (runLang === 'solidity') {
    const hasProjectTotals = /Project total/i.test(text);
    if (hasProjectTotals) {
      allowedLabels = [
        'Project total Assert count',
        'Project total violation (dynamic)',
        'Project total violation (unique)',
        'Project total atomic condition',
        'Project total Condition Coverage %',
        'Project total runtime in seconds'
      ];
    } else {
      allowedLabels = [
        'Properties inserted',
        'Properties violation detected (dynamic)',
        'Properties violation detected (unique)',
        'Total atomic condition',
        'Condition Coverage %',
        'Total runtime in seconds',
        'Total runtime'
      ];
    }
  }

  const metricsToShow = metrics.filter(item => allowedLabels.includes(item.label));
  const isSolidityReport = runLang === 'solidity';
  const errorCount = (text.match(/PARSING ERROR|syntax error|\berror\b|cannot stat|cannot remove|cannot move/gi) || []).length;
  const warningCount = (text.match(/\bWARNING\b|warning/gi) || []).length;
  return { metrics: metricsToShow, errorCount, warningCount, isSolidityReport };
}

function renderAnalyticsInsights() {
  if (!analyticsHealthEl || !analyticsInsightsEl) return;
  const text = getCombinedOutputText();
  if (!text.trim()) {
    analyticsHealthEl.innerHTML = '<div class="m-chip">No output</div>';
    analyticsInsightsEl.innerHTML = '<div class="m-insight-item"><div class="m-insight-k">Status</div><div class="m-insight-v">Run a tool to generate analytics.</div></div>';
    return;
  }
  const runLang = (latestRunResult && latestRunResult.language) || activeRunLang || lang;
  const runTool = latestRunResult && latestRunResult.toolIndex !== undefined ? latestRunResult.toolIndex : (activeRunTool !== null ? activeRunTool : tool);
  const runSub = latestRunResult && latestRunResult.subtoolIndex !== undefined ? latestRunResult.subtoolIndex : (activeRunSub !== null ? activeRunSub : sub);

  const parsed = buildAnalyticsInsights(text, runLang, runTool, runSub);
  analyticsHealthEl.innerHTML = [
    parsed.isSolidityReport ? '<div class="m-chip">Solidity report</div>' : '<div class="m-chip">General report</div>',
    `<div class="m-chip">Metrics ${parsed.metrics.length}</div>`,
    `<div class="m-chip warn">Warnings ${parsed.warningCount}</div>`,
    `<div class="m-chip error">Errors ${parsed.errorCount}</div>`
  ].join('');
  analyticsInsightsEl.innerHTML = parsed.metrics.length
    ? parsed.metrics.map((metric) => `<div class="m-insight-item"><div class="m-insight-k">${metric.label}</div><div class="m-insight-v">${metric.value}</div></div>`).join('')
    : '<div class="m-insight-item"><div class="m-insight-k">Status</div><div class="m-insight-v">No recognizable metrics found in this output.</div></div>';

  renderCharts(runLang, parsed.metrics, runTool);
}

function renderCharts(runLang, metrics, runTool) {

  // console.log('renderCharts called', runLang, metrics);
  // console.log('runLang=', runLang);
  const javaChartsContainer = document.getElementById('m-charts-container');
  const pythonChartsContainer = document.getElementById('python-charts-container');

  if (javaChartsContainer) javaChartsContainer.style.display = 'none';
  if (pythonChartsContainer) pythonChartsContainer.style.display = 'none';

  if (runLang === 'java') {
    if (!javaChartsContainer) return;

    // Clean up existing charts
    if (javaAssertionsChartInstance) javaAssertionsChartInstance.destroy();
    if (javaCoverageChartInstance) javaCoverageChartInstance.destroy();

    let failures = 0;
    let added = 0;
    let coverage = 0;

    metrics.forEach(m => {
      if (m.label === 'Assertion Failures') failures = parseInt(m.value) || 0;
      if (m.label === 'Assertions Added') added = parseInt(m.value) || 0;
      if (m.label === 'Conditional Coverage %') coverage = parseFloat(m.value.replace('%', '')) || 0;
    });

    const passed = Math.max(0, added - failures);

    if (added > 0 || failures > 0 || coverage > 0) {
      javaChartsContainer.style.display = 'grid';

      const ctxAssert = document.getElementById('javaAssertionsChart').getContext('2d');
      javaAssertionsChartInstance = new Chart(ctxAssert, {
        type: 'bar',
        data: {
          labels: ['Passed', 'Failed'],
          datasets: [{
            label: 'Assertions',
            data: [passed, failures],
            backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(249, 115, 22, 0.7)'],
            borderColor: ['rgba(16, 185, 129, 1)', 'rgba(249, 115, 22, 1)'],
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Assertion Results', font: { family: 'Space Mono', size: 10 } }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Space Mono', size: 9 } } },
            x: { ticks: { font: { family: 'Space Mono', size: 9 } } }
          }
        }
      });

      const ctxCov = document.getElementById('javaCoverageChart').getContext('2d');
      javaCoverageChartInstance = new Chart(ctxCov, {
        type: 'doughnut',
        data: {
          labels: ['Covered', 'Uncovered'],
          datasets: [{
            data: [coverage, Math.max(0, 100 - coverage)],
            backgroundColor: ['rgba(124, 58, 237, 0.7)', 'rgba(203, 213, 225, 0.5)'],
            borderColor: ['rgba(124, 58, 237, 1)', 'rgba(203, 213, 225, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Space Mono', size: 9 }, boxWidth: 10 } },
            title: { display: true, text: 'Conditional Coverage (%)', font: { family: 'Space Mono', size: 10 } }
          }
        }
      });
    }
  } else if (runLang === 'python') {
    if (!pythonChartsContainer) return;

    // Clean up existing charts
    if (pythonAssertionsChartInstance) pythonAssertionsChartInstance.destroy();
    if (pythonCoverageChartInstance) pythonCoverageChartInstance.destroy();

    let failures = 0;
    let passed = 0;
    let coverage = 0;

    metrics.forEach(m => {
      if (m.label === 'Failed Assertion') failures = parseInt(m.value) || 0;
      if (m.label === 'Passed Assertions') passed = parseInt(m.value) || 0;
      if (m.label === 'Conditional Coverage %') coverage = parseFloat(m.value.replace('%', '')) || 0;
    });

    if (passed > 0 || failures > 0 || coverage > 0) {
      pythonChartsContainer.style.display = 'grid';

      const ctxAssert = document.getElementById('pythonAssertionsChart').getContext('2d');
      pythonAssertionsChartInstance = new Chart(ctxAssert, {
        type: 'bar',
        data: {
          labels: ['Passed', 'Failed'],
          datasets: [{
            label: 'Assertions',
            data: [passed, failures],
            backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(249, 115, 22, 0.7)'],
            borderColor: ['rgba(16, 185, 129, 1)', 'rgba(249, 115, 22, 1)'],
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Assertion Results', font: { family: 'Space Mono', size: 10 } }
          },
          scales: {
            y: { beginAtZero: true, ticks: { stepSize: 1, font: { family: 'Space Mono', size: 9 } } },
            x: { ticks: { font: { family: 'Space Mono', size: 9 } } }
          }
        }
      });

      const ctxCov = document.getElementById('pythonCoverageChart').getContext('2d');
      pythonCoverageChartInstance = new Chart(ctxCov, {
        type: 'doughnut',
        data: {
          labels: ['Covered', 'Uncovered'],
          datasets: [{
            data: [coverage, Math.max(0, 100 - coverage)],
            backgroundColor: ['rgba(124, 58, 237, 0.7)', 'rgba(203, 213, 225, 0.5)'],
            borderColor: ['rgba(124, 58, 237, 1)', 'rgba(203, 213, 225, 1)'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: { position: 'bottom', labels: { font: { family: 'Space Mono', size: 9 }, boxWidth: 10 } },
            title: { display: true, text: 'Conditional Coverage (%)', font: { family: 'Space Mono', size: 10 } }
          }
        }
      });
    }
  } else if (runLang === 'c' && runTool === 0) {

    if (!javaChartsContainer) return;

    if (javaAssertionsChartInstance) javaAssertionsChartInstance.destroy();
    if (javaCoverageChartInstance) javaCoverageChartInstance.destroy();

    let reachable = 0;
    let unreachable = 0;
    let totalTime = 0;

    metrics.forEach(m => {
      if (m.label === 'Total number of Reachable paths or valid test cases') {
        reachable = parseInt(m.value) || 0;
      }

      if (m.label === 'Total number of Unreachable paths or invalid test cases') {
        unreachable = parseInt(m.value) || 0;
      }

      if (m.label === 'Total time required (sec)') {
        totalTime = parseFloat(m.value) || 0;
      }
    });

    if (reachable > 0 || unreachable > 0) {

      javaChartsContainer.style.display = 'grid';

      // Chart 1 - Reachable vs Unreachable
      const ctxAssert = document
        .getElementById('javaAssertionsChart')
        .getContext('2d');

      javaAssertionsChartInstance = new Chart(ctxAssert, {
        type: 'bar',
        data: {
          labels: ['Reachable', 'Unreachable'],
          datasets: [{
            label: 'Test Cases',
            data: [reachable, unreachable],
            backgroundColor: [
              'rgba(16,185,129,0.7)',
              'rgba(249,115,22,0.7)'
            ],
            borderColor: [
              'rgba(16,185,129,1)',
              'rgba(249,115,22,1)'
            ],
            borderWidth: 1,
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: 'Reachable vs Unreachable Paths',
              font: { family: 'Space Mono', size: 10 }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1,
                font: { family: 'Space Mono', size: 9 }
              }
            },
            x: {
              ticks: {
                font: { family: 'Space Mono', size: 9 }
              }
            }
          }
        }
      });

      // Chart 2 - Reachability Distribution
      const total = reachable + unreachable;

      const ctxCov = document
        .getElementById('javaCoverageChart')
        .getContext('2d');

      javaCoverageChartInstance = new Chart(ctxCov, {
        type: 'doughnut',
        data: {
          labels: ['Reachable', 'Unreachable'],
          datasets: [{
            data: [reachable, unreachable],
            backgroundColor: [
              'rgba(16,185,129,0.7)',
              'rgba(249,115,22,0.7)'
            ],
            borderColor: [
              'rgba(16,185,129,1)',
              'rgba(249,115,22,1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                font: {
                  family: 'Space Mono',
                  size: 9
                },
                boxWidth: 10
              }
            },
            title: {
              display: true,
              text: `Distribution (${total} Total, ${totalTime}s)`,
              font: {
                family: 'Space Mono',
                size: 10
              }
            }
          }
        }
      });
    }
  } else if (runLang === 'c' && runTool === 1) {

    if (!javaChartsContainer) return;

    if (javaAssertionsChartInstance) javaAssertionsChartInstance.destroy();
    if (javaCoverageChartInstance) javaCoverageChartInstance.destroy();

    let alive = 0;
    let killed = 0;
    let reached = 0;
    let dead = 0;
    let mutationScore = 0;
    let totalMutants = 0;

    metrics.forEach(m => {

      if (m.label === 'Total number of Alive Mutants')
        alive = parseInt(m.value) || 0;

      if (m.label === 'Total number of Killed Mutants')
        killed = parseInt(m.value) || 0;

      if (m.label === 'Total number of Reached Mutants')
        reached = parseInt(m.value) || 0;

      if (m.label === 'Total number of Dead Mutants')
        dead = parseInt(m.value) || 0;

      if (m.label === 'Total number of Total Mutants')
        totalMutants = parseInt(m.value) || 0

      if (m.label === 'Mutation Score (Killed/Reached)')
        mutationScore = parseFloat(m.value.replace('%', '')) || 0;
    });

    javaChartsContainer.style.display = 'grid';

    // Chart 1
    const ctxAssert = document
      .getElementById('javaAssertionsChart')
      .getContext('2d');

    javaAssertionsChartInstance = new Chart(ctxAssert, {
      type: 'bar',
      data: {
        labels: ['Alive', 'Killed', 'Reached', 'Total', 'Dead'],
        datasets: [{
          label: 'Mutants',
          data: [alive, killed, reached, totalMutants, dead],
          backgroundColor: [
            'rgba(249,115,22,0.7)',
            'rgba(16,185,129,0.7)',
            'rgba(59,130,246,0.7)',
            'rgba(157, 178, 51, 0.7)',
            'rgba(107,114,128,0.7)'
          ],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Mutation Statistics',
            font: { family: 'Space Mono', size: 10 }
          }
        }
      }
    });

    // Chart 2
    const ctxCov = document
      .getElementById('javaCoverageChart')
      .getContext('2d');

    javaCoverageChartInstance = new Chart(ctxCov, {
      type: 'doughnut',
      data: {
        labels: ['Mutation Score', 'Remaining'],
        datasets: [{
          data: [
            mutationScore,
            Math.max(0, 100 - mutationScore)
          ],
          backgroundColor: [
            'rgba(124,58,237,0.7)',
            'rgba(203,213,225,0.5)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: `Mutation Score (${mutationScore}%)`,
            font: { family: 'Space Mono', size: 10 }
          }
        }
      }
    });
  } else if (runLang === 'c' && (runTool === 2 || runTool === 3)) {

    if (!javaChartsContainer) return;

    if (javaAssertionsChartInstance) javaAssertionsChartInstance.destroy();
    if (javaCoverageChartInstance) javaCoverageChartInstance.destroy();

    let instructions = 0;
    let icount = 0;
    let icov = 0;
    let bcov = 0;
    let tsolver = 0;

    metrics.forEach(m => {

      if (m.label === 'Instructions')
        instructions = parseInt(m.value) || 0;

      if (m.label === 'ICount')
        icount = parseInt(m.value) || 0;

      if (m.label === 'ICov %')
        icov = parseFloat(m.value) || 0;

      if (m.label === 'BCov %')
        bcov = parseFloat(m.value) || 0;

      if (m.label === 'TSolver %')
        tsolver = parseFloat(m.value) || 0;
    });

    javaChartsContainer.style.display = 'grid';

    // BAR CHART
    const ctxAssert = document
      .getElementById('javaAssertionsChart')
      .getContext('2d');

    javaAssertionsChartInstance = new Chart(ctxAssert, {
      type: 'bar',
      data: {
        labels: ['Instructions', 'ICount'],
        datasets: [{
          label: 'Execution Metrics',
          data: [instructions, icount],
          backgroundColor: [
            'rgba(59,130,246,0.7)',
            'rgba(16,185,129,0.7)'
          ],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Execution Metrics',
            font: { family: 'Space Mono', size: 10 }
          }
        }
      }
    });

    // DOUGHNUT CHART
    const ctxCov = document
      .getElementById('javaCoverageChart')
      .getContext('2d');

    javaCoverageChartInstance = new Chart(ctxCov, {
      type: 'doughnut',
      data: {
        labels: ['ICov %', 'BCov %'],
        datasets: [{
          data: [icov, bcov],
          backgroundColor: [
            'rgba(124,58,237,0.7)',
            'rgba(249,115,22,0.7)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: `Coverage (TSolver ${tsolver}%)`,
            font: {
              family: 'Space Mono',
              size: 10
            }
          }
        }
      }
    });
  } else if (runLang === 'c' && runTool === 5) {

    if (!javaChartsContainer) return;

    if (javaAssertionsChartInstance)
      javaAssertionsChartInstance.destroy();

    if (javaCoverageChartInstance)
      javaCoverageChartInstance.destroy();

    let killed = 0;
    let total = 0;
    let score = 0;

    metrics.forEach(m => {

      if (m.label === 'Killed Mutants')
        killed = parseInt(m.value) || 0;

      if (m.label === 'Total Mutants')
        total = parseInt(m.value) || 0;

      if (m.label === 'Mutation Score')
        score = parseFloat(m.value) || 0;

    });

    const survived = Math.max(0, total - killed);

    javaChartsContainer.style.display = 'grid';

    // BAR CHART

    const ctxAssert = document
      .getElementById('javaAssertionsChart')
      .getContext('2d');

    javaAssertionsChartInstance = new Chart(ctxAssert, {
      type: 'bar',
      data: {
        labels: ['Killed', 'Survived'],
        datasets: [{
          label: 'Mutants',
          data: [killed, survived],
          backgroundColor: [
            'rgba(16,185,129,0.7)',
            'rgba(239,68,68,0.7)'
          ],
          borderWidth: 1,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: 'Mutation Statistics',
            font: {
              family: 'Space Mono',
              size: 10
            }
          }
        }
      }
    });

    // DOUGHNUT CHART

    const ctxCov = document
      .getElementById('javaCoverageChart')
      .getContext('2d');

    javaCoverageChartInstance = new Chart(ctxCov, {
      type: 'doughnut',
      data: {
        labels: ['Mutation Score', 'Remaining'],
        datasets: [{
          data: [
            score,
            Math.max(0, 100 - score)
          ],
          backgroundColor: [
            'rgba(124,58,237,0.7)',
            'rgba(203,213,225,0.5)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom'
          },
          title: {
            display: true,
            text: `Mutation Score (${score}%)`,
            font: {
              family: 'Space Mono',
              size: 10
            }
          }
        }
      }
    });
  }
}

function handleOutputAreaWheel(event) {
  if (!outputAreaEl || !terminalEl) return;
  if (analyticsModalEl && analyticsModalEl.classList.contains('open')) return;
  if (event.target === terminalEl || terminalEl.contains(event.target)) return;
  event.preventDefault();
  followTerminalScroll = false;
  terminalEl.scrollTop += event.deltaY;
}

function getSelectedInputPath() { return selectedSource.path; }
function getSelectedInputName() { return selectedSource.name || basenameLike(selectedSource.path || ''); }

function getParamValues() {
  const toolConfig = TOOLS[lang][tool];
  const params = (toolConfig.subtools && sub !== null ? toolConfig.subtools[sub].params : toolConfig.params) || [];
  return params.reduce((accumulator, param) => {
    const input = document.getElementById(param.id);
    accumulator[param.id] = input ? input.value.trim() : '';
    return accumulator;
  }, {});
}

function getSelectedToolLabel() {
  const toolConfig = TOOLS[lang][tool];
  if (toolConfig.subtools && sub !== null) return `${toolConfig.name} - ${toolConfig.subtools[sub].name}`;
  return toolConfig.name;
}

function buildRunPayload() {
  const sourcePath = getSelectedInputPath();
  if (!sourcePath) throw new Error('Please choose an input file or folder first.');
  const toolConfig = TOOLS[lang][tool];
  if (toolConfig.subtools && sub === null) {
    throw new Error('Please select a subtool (e.g., BMC or CHC) before executing.');
  }
  const sourceName = getSelectedInputName();
  const isFolder = selectedSource.kind === 'folder';
  return {
    language: lang,
    toolIndex: tool,
    subtoolIndex: toolConfig.subtools ? sub : null,
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
  if (toolConfig.subtools && sub !== null) params = toolConfig.subtools[sub].params;
  const paramsBody = document.getElementById('params-body');
  const paramsRoot = document.getElementById('params-root');

  if (!params || !params.length) {
    if (paramsRoot) paramsRoot.style.display = 'none';
    paramsBody.innerHTML = '';
    return;
  }

  if (paramsRoot) paramsRoot.style.display = 'block';
  paramsBody.innerHTML = params.map((item) => `<div class="param-block"><label class="param-lbl">${item.l}</label><input class="param-in" id="${item.id}" type="${item.t}" placeholder="${item.ph}"></div>`).join('');
}

function updateAnalyticsModal() {
  const completedRuns = log.filter((entry) => entry.ok && typeof entry.durationMs === 'number');
  const averageDuration = completedRuns.length ? Math.round(completedRuns.reduce((sum, entry) => sum + entry.durationMs, 0) / completedRuns.length / 1000) : null;
  const passRate = log.length ? Math.round((log.filter((entry) => entry.ok).length / log.length) * 100) : null;
  runsCountEl.textContent = String(log.length);
  const statValues = document.querySelectorAll('.m-stat-n');
  if (statValues[0]) statValues[0].textContent = String(log.length);
  if (statValues[1]) statValues[1].textContent = averageDuration === null ? '—' : `${averageDuration}s`;
  if (statValues[2]) statValues[2].textContent = passRate === null ? '—' : `${passRate}%`;

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

  // analyticsListEl.innerHTML = log.length
  //   ? log.map((entry) => `<div class="m-log-row"><span class="m-log-t">${entry.ts}</span><span>${entry.tn}</span><span class="${entry.ok ? 'm-log-ok' : 'm-log-fail'}">${entry.ok ? 'OK' : 'FAIL'}</span></div>`).join('')
  //   : '<div class="m-log-row"><span class="m-log-t">—</span><span>No runs yet</span></div>';
}

function updateSelectedSourceLabels() {
  const fileLabel = document.getElementById('file-selection-label');
  const folderLabel = document.getElementById('folder-selection-label');
  if (selectedSource.kind === 'folder') {
    if (folderLabel) folderLabel.textContent = selectedSource.name || 'Folder';
    if (fileLabel) fileLabel.textContent = 'File not selected';
    return;
  }
  if (fileLabel) fileLabel.textContent = selectedSource.name || 'File';
  if (folderLabel) folderLabel.textContent = 'No folder selected';
}

function setAuthUI(user) {
  if (user) {
    authStatusTextEl.textContent = `Logged in as ${user.name || user.email || 'user'}`;
    authBtnEl.textContent = 'Logout';
    logoutBtnEl.style.display = 'inline-flex';
  } else {
    authStatusTextEl.textContent = 'Not logged in';
    authBtnEl.textContent = 'Login';
    logoutBtnEl.style.display = 'none';
  }
}

function saveAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(data));
}

function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
  } catch {
    return null;
  }
}

function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  currentAuth = null;
  setAuthUI(null);
  setUiUnlocked(false);
}

function isAllowedUser(user) {
  return !!user && (user.isPremium === true || Number(user.trialCount || 0) > 0);
}

function setUiUnlocked(unlocked) {
  appUnlocked = unlocked;
  mainLayout.style.filter = unlocked ? 'none' : 'blur(6px)';
  mainLayout.style.pointerEvents = unlocked ? 'auto' : 'none';
  authWrapEl.classList.toggle('open', !unlocked);
}

function refreshAuthUi() {
  if (!currentAuth || !currentAuth.user) {
    authHeadingTextEl.textContent = 'Sign in to continue. Premium users and trial users can access the full application.';
    authNoteEl.textContent = 'Login to unlock the workspace. If premium access is unavailable, contact the admin team for upgrade support.';
    lockedCardEl.style.display = 'none';
    setAuthUI(null);
    setUiUnlocked(false);
    return;
  }

  const user = currentAuth.user;
  const allowed = isAllowedUser(user);
  setAuthUI(user);

  if (allowed) {
    authHeadingTextEl.textContent = `Welcome back, ${user.name || user.email || 'user'}. Your account is active.`;
    authNoteEl.textContent = `Signed in as ${user.email || 'unknown email'}.`;
    lockedCardEl.style.display = 'none';
    setUiUnlocked(true);
  } else {
    authHeadingTextEl.textContent = `Hello, ${user.name || user.email || 'user'}. Your account cannot access this app yet.`;
    authNoteEl.textContent = 'This account is not premium and has no remaining trial access.';
    lockedCardEl.style.display = 'block';
    lockedCardEl.innerHTML = `
      <div><strong>Upgrade required</strong></div>
      <div>Premium: ${String(!!user.isPremium)}</div>
      <div>Trial count: ${String(user.trialCount ?? 0)}</div>
      <div>Contact admin: ${ADMIN_EMAIL}</div>
    `;
    setUiUnlocked(false);
  }
}

async function doLogin() {
  const emailOrUsername = loginIdentifierEl.value.trim();
  const password = loginPasswordEl.value;

  const loginBtn = document.getElementById('loginBtn');
  const authNote = document.getElementById('authNote');

  try {
    // Loading State
    loginBtn.disabled = true;
    loginBtn.innerHTML = `
      <span class="btn-spinner"></span>
      Logging in...
    `;

    authNote.innerHTML = '';
    setStatus('Logging in...');
    appendLine('▶ Attempting login...', 'var(--ink)');

    const response = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailOrUsername, password })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      throw new Error(
        data?.message ||
        data?.error ||
        'Invalid email/username or password'
      );
    }

    currentAuth = {
      token: data?.data?.token || null,
      user: data?.data?.user || null
    };

    saveAuth(currentAuth);
    refreshAuthUi();

    if (isAllowedUser(currentAuth.user)) {
      authNote.innerHTML = `
        <div class="auth-success">
          ✓ Login successful. Welcome ${currentAuth.user.name || currentAuth.user.email}.
        </div>
      `;

      appendLine(
        `✓ Login successful. Welcome ${currentAuth.user.name || currentAuth.user.email || 'user'}.`,
        'var(--green)'
      );

      setStatus('Authenticated');
    } else {
      authNote.innerHTML = `
        <div class="auth-warning">
          Login successful, but access is restricted.
        </div>
      `;

      setStatus('Access Restricted');
    }

  } catch (error) {
    console.error(error);

    authNote.innerHTML = `
      <div class="auth-error">
        ${error.message || 'Login failed'}
      </div>
    `;

    appendLine(error.message || 'Login failed.', 'var(--orange)');
    setStatus(`❌ ${error.message || 'Login failed'}`);

  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = 'Sign In';
  }
}

function doLogout() {
  clearAuth();
  loginPasswordEl.value = '';
  setStatus('Logged out');
  appendLine('✓ Logged out.', 'var(--green)');
}

function showAuthOverlay() {
  authWrapEl.classList.add('open');
}

function hideAuthOverlay() {
  authWrapEl.classList.remove('open');
}

async function chooseFile() {
  if (!window.electronAPI) {
    appendLine('File picker is only available in Electron mode.', 'var(--orange)');
    return;
  }
  const result = await window.electronAPI.pickInputFile(lang);
  if (result && !result.canceled && result.path) {
    selectedSource = { kind: 'file', path: result.path, name: result.name || basenameLike(result.path) };
    updateSelectedSourceLabels();
    appendLine(`✓ Selected file: ${selectedSource.name}`, 'var(--green)');
  }
}

async function chooseFolder() {
  if (!window.electronAPI) {
    appendLine('Folder picker is only available in Electron mode.', 'var(--orange)');
    return;
  }
  const result = await window.electronAPI.pickInputFolder();
  if (result && !result.canceled && result.path) {
    selectedSource = { kind: 'folder', path: result.path, name: result.name || basenameLike(result.path) };
    updateSelectedSourceLabels();
    appendLine(`✓ Selected folder: ${selectedSource.name}`, 'var(--green)');
  }
}

function closeModal() { analyticsModalEl.classList.remove('open'); }
function bgClose(event) { if (event.target === analyticsModalEl) closeModal(); }

async function doRun() {
  if (!window.electronAPI) {
    appendLine('Electron IPC is unavailable in browser mode.', 'var(--orange)');
    return;
  }
  if (!appUnlocked) {
    showAuthOverlay();
    appendLine('Login required before running tools.', 'var(--orange)');
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
  activeRunLang = payload.language;
  activeRunTool = payload.toolIndex;
  activeRunSub = payload.subtoolIndex;
  setStatus('Starting Docker workflow...');

  ofStatusEl.innerHTML = '<span class="exec-spinner"></span> Executing...';
  ofStatusEl.style.color = 'var(--ink-2)';

  const runBtn = document.querySelector('.ab-run');
  if (runBtn) {
    runBtn.innerHTML = '<span class="exec-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff;"></span> Executing...';
    runBtn.style.pointerEvents = 'none';
  }

  try {
    const result = normalizeRunResult(await window.electronAPI.runTool(payload));
    latestRunResult = {
      ...result,
      language: payload.language,
      toolIndex: payload.toolIndex,
      subtoolIndex: payload.subtoolIndex,
      inputName: payload.inputName,
      params: payload.params
    };
    latestOutputDir = result ? result.outputDir : null;
    runs += 1;
    log.unshift({
      ts: new Date().toLocaleTimeString(),
      tn: (result && result.toolLabel) || payload.toolLabel,
      ok: true,
      durationMs: result && typeof result.durationMs === 'number' ? result.durationMs : null,
      outputDir: result ? result.outputDir || null : null
    });
    appendLine('✓ Execution completed.', 'var(--green)');
    ofStatusEl.textContent = 'Complete';
    ofStatusEl.style.color = '';
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
    ofStatusEl.style.color = 'var(--orange)';
  } finally {
    isRunning = false;
    updateAnalyticsModal();

    const runBtn = document.querySelector('.ab-run');
    if (runBtn) {
      runBtn.innerHTML = '▶ Execute';
      runBtn.style.pointerEvents = 'auto';
    }
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
  if (!appUnlocked) {
    showAuthOverlay();
    appendLine('Login required before compiling.', 'var(--orange)');
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
  activeRunLang = payload.language;
  activeRunTool = 'compile';
  activeRunSub = payload.subtoolIndex;
  setStatus('Starting Docker compilation...');

  ofStatusEl.innerHTML = '<span class="exec-spinner"></span> Compiling...';
  ofStatusEl.style.color = 'var(--ink-2)';

  const compileBtn = document.querySelector('.ab-compile');
  if (compileBtn) {
    compileBtn.innerHTML = '<span class="exec-spinner" style="border-color: rgba(255,255,255,0.3); border-top-color: #fff;"></span> Compiling...';
    compileBtn.style.pointerEvents = 'none';
  }

  try {
    const result = normalizeRunResult(await window.electronAPI.compileTool(payload));
    latestRunResult = {
      ...result,
      language: payload.language,
      toolIndex: payload.toolIndex,
      subtoolIndex: payload.subtoolIndex,
      inputName: payload.inputName,
      params: payload.params
    };
    latestOutputDir = result ? result.outputDir : null;
    runs += 1;
    log.unshift({
      ts: new Date().toLocaleTimeString(),
      tn: 'Compile',
      ok: true,
      durationMs: result && typeof result.durationMs === 'number' ? result.durationMs : null,
      outputDir: result ? result.outputDir || null : null
    });
    appendLine('✓ Compilation and Run completed.', 'var(--green)');
    ofStatusEl.textContent = 'Complete';
    ofStatusEl.style.color = '';
    setStatus('Completed Compilation');
  } catch (error) {
    log.unshift({
      ts: new Date().toLocaleTimeString(),
      tn: 'Compile',
      ok: false,
      durationMs: typeof error.durationMs === 'number' ? error.durationMs : null,
      outputDir: error && error.outputDir ? error.outputDir : null
    });
    appendLine(error.message || 'Docker compilation failed.', 'var(--orange)');
    ofStatusEl.textContent = 'Failed';
    ofStatusEl.style.color = 'var(--orange)';
  } finally {
    isRunning = false;
    updateAnalyticsModal();

    if (compileBtn) {
      compileBtn.innerHTML = 'Compile';
      compileBtn.style.pointerEvents = 'auto';
    }
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
    appendLine('Please check your Downloads/Trustinn folder for results.', 'var(--orange)');
    return;
  }
  if (!window.electronAPI) {
    appendLine('Output folders can only be opened in Electron.', 'var(--orange)');
    return;
  }
  const result = await window.electronAPI.openOutputFolder(latestOutputDir);
  if (result.success) appendLine(`✓ Opened ${latestOutputDir}`, 'var(--green)');
  else appendLine(result.message || 'Could not open output folder.', 'var(--orange)');
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
  if (window.innerWidth <= 720) return;
  isDragging = true;
  splitter.classList.add('dragging');
  document.body.style.userSelect = 'none';
}
function handlePointerMove(event) {
  if (!isDragging || window.innerWidth <= 720) return;
  const mainRect = mainLayout.getBoundingClientRect();
  setSidebarWidth(event.clientX - mainRect.left);
}
function handlePointerUp() {
  if (!isDragging) return;
  isDragging = false;
  splitter.classList.remove('dragging');
  document.body.style.userSelect = '';
}

splitter.addEventListener('pointerdown', handlePointerDown);
window.addEventListener('pointermove', handlePointerMove);
window.addEventListener('pointerup', handlePointerUp);
window.addEventListener('pointercancel', handlePointerUp);

splitter.addEventListener('keydown', (event) => {
  if (window.innerWidth <= 720) return;
  const current = parseInt(getComputedStyle(root).getPropertyValue('--sidebar-width'), 10) || 280;
  if (event.key === 'ArrowLeft') { event.preventDefault(); setSidebarWidth(current - 16); }
  if (event.key === 'ArrowRight') { event.preventDefault(); setSidebarWidth(current + 16); }
  if (event.key === 'Home') { event.preventDefault(); setSidebarWidth(MIN_SIDEBAR); }
  if (event.key === 'End') { event.preventDefault(); setSidebarWidth(MAX_SIDEBAR); }
});

window.addEventListener('resize', () => {
  if (window.innerWidth <= 720) return;
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
    // console.log('[UI] Update status:', message);
    setStatus(message);
    if (message.includes('Downloading')) {
      progressBar.style.display = 'block';
      setRestartButtonVisible(false);
      const match = message.match(/(\d+)%/);
      if (match) progressFill.style.width = match[1] + '%';
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
    if (!normalized) return;
    latestRunResult = {
      ...normalized,
      language: activeRunLang || lang,
      toolIndex: activeRunTool !== null ? activeRunTool : tool,
      subtoolIndex: activeRunSub !== null ? activeRunSub : sub,
      inputName: getSelectedInputName(),
      params: getParamValues()
    };
    latestOutputDir = normalized.outputDir || null;
    if (normalized.toolLabel) setStatus(`Completed ${normalized.toolLabel}`);
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
if (fileButton) fileButton.addEventListener('click', chooseFile);

const folderButton = document.getElementById('fb2');
if (folderButton) folderButton.addEventListener('click', chooseFolder);

window.setLang = function setLang(language, button) {
  lang = language;
  tool = 0;
  sub = null;
  resetRunOutput();
  document.querySelectorAll('.lang-card').forEach((card) => card.classList.remove('active'));
  if (button && button.classList) button.classList.add('active');
  else {
    const activeCard = Array.from(document.querySelectorAll('.lang-card')).find((card) => card.getAttribute('onclick')?.includes(`setLang('${language}'`));
    if (activeCard) activeCard.classList.add('active');
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

async function openSamplesModal() {
  if (!window.electronAPI || !window.electronAPI.listSamples) {
    appendLine('Samples are only available in Electron mode.', 'var(--orange)');
    return;
  }

  samplesListEl.innerHTML = '<div style="text-align:center; padding: 20px; font-family: var(--mono); font-size: 11px; color: var(--ink-3);">Loading samples...</div>';
  samplesModalWrapEl.classList.add('open');

  try {
    const res = await window.electronAPI.listSamples({ language: lang, toolIndex: tool });
    if (!res.success) {
      samplesListEl.innerHTML = `<div style="color: var(--orange); padding: 10px; font-family: var(--mono); font-size: 11px;">Error: ${res.message}</div>`;
      return;
    }

    if (!res.files || !res.files.length) {
      samplesListEl.innerHTML = '<div style="text-align:center; padding: 20px; font-family: var(--mono); font-size: 11px; color: var(--ink-3);">No samples found for this tool.</div>';
      return;
    }

    samplesListEl.innerHTML = res.files.map(file => {
      const icon = file.kind === 'folder' ? '📁' : '📄';
      const safePath = file.path.replace(/\\/g, '/');
      return `
        <button class="file-btn" style="padding: 10px; min-height: auto;" onclick="selectSampleFile('${safePath}', '${file.name}', '${file.kind}')">
          <div class="file-icon" style="width: 24px; height: 24px; font-size: 12px;">${icon}</div>
          <div class="file-text-wrap">
            <div class="file-main" style="font-size: 11px;">${file.name}</div>
          </div>
        </button>
      `;
    }).join('');
  } catch (error) {
    samplesListEl.innerHTML = `<div style="color: var(--orange); padding: 10px; font-family: var(--mono); font-size: 11px;">Failed to load samples.</div>`;
  }
}

function closeSamplesModal() {
  samplesModalWrapEl.classList.remove('open');
}

function samplesBgClose(event) {
  if (event.target === samplesModalWrapEl) closeSamplesModal();
}

function selectSampleFile(path, name, kind) {
  selectedSource = { kind, path, name };
  updateSelectedSourceLabels();
  appendLine(`✓ Selected sample: ${name}`, 'var(--green)');
  closeSamplesModal();
}

window.openSamplesModal = openSamplesModal;
window.closeSamplesModal = closeSamplesModal;
window.samplesBgClose = samplesBgClose;
window.selectSampleFile = selectSampleFile;

const outputActions = document.querySelector('.out-actions');

if (outputActions && !document.getElementById('view-output-btn')) {
  const viewButton = document.createElement('button');
  viewButton.id = 'view-output-btn';
  viewButton.className = 'oa-btn';
  viewButton.textContent = 'result';
  viewButton.onclick = viewOutput;

  // Toast function
  function showToast() {
    let toast = document.getElementById('download-toast');

    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'download-toast';
      toast.textContent =
        'Please check your Downloads/Trustinn folder for results.';
      document.body.appendChild(toast);

      Object.assign(toast.style, {
        position: 'fixed',
        top: '130px',
        right: '40px',
        background: '#333',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: '6px',
        fontSize: '14px',
        zIndex: '9999',
        opacity: '0',
        transition: 'opacity 0.3s ease'
      });
    }

    toast.style.opacity = '1';

    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => {
      toast.style.opacity = '0';
    }, 3000);
  }

  // Show on hover
  viewButton.addEventListener('mouseenter', showToast);

  // Show on click
  viewButton.addEventListener('click', showToast);

  outputActions.insertBefore(viewButton, outputActions.children[1] || null);
}

authBtnEl.addEventListener('click', () => {
  if (appUnlocked) doLogout();
  else authWrapEl.classList.add('open');
});
loginBtnEl.addEventListener('click', doLogin);
logoutBtnEl.addEventListener('click', doLogout);
loginPasswordEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
loginIdentifierEl.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && authWrapEl.classList.contains('open') && appUnlocked) {
    authWrapEl.classList.remove('open');
  }
});

render();
updateSelectedSourceLabels();

currentAuth = loadAuth();
refreshAuthUi();