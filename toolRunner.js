const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const TRUSTINN_IMAGE = 'nitminer/trustinn:1.0';
const TRUSTINN_PLATFORM = 'linux/amd64';
const CONTAINER_WORKSPACE = '/workspace/trustinn';
const HOST_INPUT_DIR = '/host-input';
const HOST_OUTPUT_DIR = '/host-output';
const STAGING_DIR_NAME = '__trustinn_input__';

let activeDockerChild = null;
let activeDockerRunId = null;

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'"'"'`)}'`;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function stripExtension(fileName) {
  return path.basename(fileName, path.extname(fileName));
}

function quoteDockerArgs(value) {
  return shellEscape(value);
}

function createRunId() {
  return `trustinn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getToolConfig(language, toolIndex, subtoolIndex) {
  const configs = {
    c: [
      {
        label: 'CC Bounded Model Checker',
        toolDir: 'CC-BOUNDED MODEL CHECKER',
        buildCommand: ({ inputRef, params }) => `bash cbmc_script.sh ${quoteDockerArgs(inputRef)} ${quoteDockerArgs(params.p1 || '10')}`
      },
      {
        label: 'DSE Mutation Analyzer',
        toolDir: 'DSE_MUTATION_ANALYSER',
        inputAliases: ['even.c'],
        buildCommand: ({ inputRef, params }) => `bash KLEEMA.sh ${quoteDockerArgs(inputRef)} ${quoteDockerArgs(params.p2 || '1')}`
      },
      {
        label: 'Dynamic Symbolic Execution',
        toolDir: 'DYNAMIC_SYMBOLIC_EXECUTION',
        inputAliases: ['even.c'],
        buildCommand: ({ inputRef }) => `bash KLEE.sh ${quoteDockerArgs(inputRef)}`
      },
      {
        label: 'DSE with Pruning',
        toolDir: 'DSE_WITH_PRUNING',
        inputAliases: ['even.c'],
        buildCommand: ({ inputRef }) => `bash tx.sh ${quoteDockerArgs(inputRef)}`
      },
      {
        label: 'Adv. Coverage Profiler',
        toolDir: 'ADVANCE_CODE_COVERAGE_PROFILER',
        buildCommand: ({ inputBaseName, params }) => `bash main-gProfiler.sh ${quoteDockerArgs(stripExtension(inputBaseName))} ${quoteDockerArgs(params.p3 || '4')} ${quoteDockerArgs(params.p4 || '3600')}`
      },
      {
        label: 'Mutation Testing Profiler',
        toolDir: 'MUTATION_TESTING_PROFILER',
        buildCommand: ({ inputBaseName, params }) => `bash main-gProfiler.sh ${quoteDockerArgs(inputBaseName)} ${quoteDockerArgs(params.p5 || '4')} ${quoteDockerArgs(params.p6 || '3600')}`
      }
    ],
    java: [
      {
        label: 'Java Bounded Model Checker',
        toolDir: 'JAVA',
        inputAliases: ['Demo.java'],
        buildCommand: ({ inputRef }) => `bash shellsc.sh ${quoteDockerArgs(inputRef)}`
      }
    ],
    python: [
      {
        label: 'Condition Coverage Fuzzing',
        toolDir: 'PYTHON',
        inputAliases: ['SAMPLES/cricket_scorer.py'],
        buildCommand: ({ inputRef }) => `bash shellpy.sh ${quoteDockerArgs(inputRef)}`
      }
    ],
    solidity: [
      {
        label: 'Smart Contract Verifier',
        toolDir: 'SOLIDITY',
        subtools: [
          {
            label: 'BMC',
            buildCommand: ({ inputRef }) => `bash latest.sh ${quoteDockerArgs(inputRef)} bmc`
          },
          {
            label: 'CHC',
            buildCommand: ({ inputRef }) => `bash latest.sh ${quoteDockerArgs(inputRef)} chc`
          }
        ]
      }
    ]
  };

  const languageTools = configs[language];
  if (!languageTools || !languageTools[toolIndex]) {
    throw new Error(`Unknown tool selection: ${language}/${toolIndex}`);
  }

  const tool = languageTools[toolIndex];
  if (tool.subtools) {
    const selectedSubtoolIndex = typeof subtoolIndex === 'number' ? subtoolIndex : 0;
    if (!tool.subtools[selectedSubtoolIndex]) {
      throw new Error(`Unknown subtool selection: ${language}/${toolIndex}/${selectedSubtoolIndex}`);
    }
    return {
      ...tool,
      subtool: tool.subtools[selectedSubtoolIndex],
      selectedSubtoolIndex,
      outputLabel: `${tool.label} - ${tool.subtools[selectedSubtoolIndex].label}`,
      buildCommand: tool.subtools[selectedSubtoolIndex].buildCommand
    };
  }

  return {
    ...tool,
    outputLabel: tool.label,
    selectedSubtoolIndex: null
  };
}

function getSourceSelection(payload) {
  const sourcePath = payload.sourcePath;
  if (!sourcePath) {
    throw new Error('No input file or folder was selected.');
  }

  const sourceBaseName = path.basename(sourcePath);
  const isFolder = Boolean(payload.isFolder);
  return {
    sourcePath,
    sourceBaseName,
    isFolder
  };
}

async function ensureDockerReady(onStatus) {
  const runCommand = (command, args, options = {}) => new Promise((resolve, reject) => {
    const child = spawn(command, args, { ...options, shell: false });
    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(stderr || stdout || `${command} exited with code ${code}`);
        err.code = code;
        reject(err);
      }
    });
  });

  const checkDocker = async () => {
    await runCommand('docker', ['info']);
  };

  try {
    onStatus('Checking Docker daemon...');
    await checkDocker();
    return true;
  } catch (initialError) {
    if (process.platform === 'darwin') {
      onStatus('Docker is not running. Starting Docker Desktop...');
      try {
        await runCommand('open', ['-a', 'Docker']);
      } catch (openError) {
        throw new Error(`Docker is not running and Docker Desktop could not be started automatically: ${openError.message}`);
      }

      const deadline = Date.now() + 120000;
      while (Date.now() < deadline) {
        try {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await checkDocker();
          return true;
        } catch (retryError) {
          // Keep waiting for the daemon to become ready.
        }
      }

      throw new Error(`Docker Desktop did not become ready in time: ${initialError.message}`);
    }

    throw new Error(`Docker daemon is not running: ${initialError.message}`);
  }
}

async function ensureImagePulled(onStatus) {
  const inspect = await new Promise((resolve, reject) => {
    const child = spawn('docker', ['image', 'inspect', TRUSTINN_IMAGE], { shell: false });
    let stderr = '';

    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });

  if (inspect) {
    onStatus(`Docker image ready: ${TRUSTINN_IMAGE}`);
    return;
  }

  onStatus(`Pulling Docker image ${TRUSTINN_IMAGE}...`);
  await new Promise((resolve, reject) => {
    const child = spawn('docker', ['pull', '--platform', TRUSTINN_PLATFORM, TRUSTINN_IMAGE], { shell: false });
    child.stdout?.on('data', () => {});
    child.stderr?.on('data', () => {});
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`Failed to pull ${TRUSTINN_IMAGE} (exit code ${code})`));
      }
    });
  });
}

function collectFiles(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) {
    return results;
  }

  const stack = [rootDir];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (entry.isFile()) {
        results.push(path.relative(rootDir, fullPath));
      }
    }
  }
  return results.sort();
}

async function asarSafeCopy(src, dest) {
  const stats = await fsp.stat(src);
  if (stats.isDirectory()) {
    await fsp.mkdir(dest, { recursive: true });
    const entries = await fsp.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
      await asarSafeCopy(path.join(src, entry.name), path.join(dest, entry.name));
    }
  } else {
    const data = await fsp.readFile(src);
    await fsp.writeFile(dest, data);
  }
}

async function prepareHostInput(payload, runId) {
  const source = getSourceSelection(payload);
  const tempRoot = path.join(os.tmpdir(), 'trustinn-inputs', runId);
  await fsp.mkdir(tempRoot, { recursive: true });

  const sourceTarget = path.join(tempRoot, source.sourceBaseName);
  await asarSafeCopy(source.sourcePath, sourceTarget);

  return {
    ...source,
    tempRoot,
    sourceTarget
  };
}

async function cleanupDir(dirPath) {
  try {
    await fsp.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    // Best effort cleanup.
  }
}

function buildContainerScript({ toolConfig, inputName, outputFolderName, params, isFolder }) {
  const inputRef = inputName;
  const inputBaseName = path.parse(inputName).name;

  const command = toolConfig.buildCommand({
    inputRef,
    inputName,
    inputBaseName,
    params
  });

  const outputPath = `${HOST_OUTPUT_DIR}/${outputFolderName}`;
  const escapedOutputPath = shellEscape(outputPath);
  const escapedInputPath = shellEscape(`${HOST_INPUT_DIR}/${inputName}`);

  const aliases = !isFolder && Array.isArray(toolConfig.inputAliases)
    ? toolConfig.inputAliases
    : [];

  const aliasCommands = aliases
    .filter(alias => alias && alias !== inputName)
    .map(alias => [
      `mkdir -p ${shellEscape(path.dirname(alias))}`,
      `cp ${shellEscape(inputName)} ${shellEscape(alias)}`
    ].join('\n'))
    .join('\n');

  const bcShimPython = [
    'import math',
    'import re',
    'import sys',
    '',
    'source = sys.stdin.read().strip()',
    'if not source:',
    '    sys.exit(0)',
    '',
    'scale = None',
    'match = re.match(r"\\s*scale\\s*=\\s*([0-9]+)\\s*;\\s*(.*)$", source, flags=re.S)',
    'if match:',
    '    scale = int(match.group(1))',
    '    source = match.group(2)',
    '',
    'allowed = {"abs": abs, "sqrt": math.sqrt, "pow": pow, "min": min, "max": max}',
    '',
    'def safe_eval(expr):',
    '    expr = expr.replace("^", "**")',
    '    value = eval(expr, {"__builtins__": {}}, allowed)',
    '    if isinstance(value, bool):',
    '        return 1 if value else 0',
    '    return value',
    '',
    'result = 0',
    'parts = [part.strip() for part in re.split(r";|\\n", source) if part.strip()]',
    'for part in parts:',
    '    result = safe_eval(part)',
    '',
    'def to_plain_float(value):',
    '    text = f"{float(value):.15f}".rstrip("0").rstrip(".")',
    '    return text if text and text != "-0" else "0"',
    '',
    'if isinstance(result, (int, float)):',
    '    if scale is not None:',
    '        if scale == 0:',
    '            print(int(result))',
    '        else:',
    '            print(f"{result:.{scale}f}")',
    '    elif isinstance(result, float):',
    '        if result.is_integer():',
    '            print(int(result))',
    '        else:',
    '            print(to_plain_float(result))',
    '    else:',
    '        print(result)',
    'else:',
    '    print(result)'
  ].join('\n');

  const bcShimScript = `
if ! command -v bc >/dev/null 2>&1; then
  bc() {
    python3 -c ${shellEscape(bcShimPython)}
  }
  export -f bc
fi`;

  return `set -e

cd ${shellEscape(`${CONTAINER_WORKSPACE}/${toolConfig.toolDir}`)}

# Copy uploaded file/folder into tool directory
cp -R ${escapedInputPath} ./

# Legacy tools expect the file in Programs/GCOV
mkdir -p Programs/GCOV

if [ -f ${shellEscape(inputName)} ]; then
  cp ${shellEscape(inputName)} Programs/GCOV/${shellEscape(inputName)}
fi

${aliasCommands}

${bcShimScript}

# Inject mock definitions for CBMC to avoid GCC implicit declaration errors
find . -type f -name "*.c" | while read -r f; do
  if grep -q "nondet_int" "$f" && ! grep -q "int nondet_int" "$f"; then
    echo "Injecting mock definitions into $f"
    cat << 'EOF' > trustinn_stubs.tmp
#ifndef __CPROVER
int nondet_int() { return 0; }
void __CPROVER_input(const char* name, int val) {}
void __CPROVER_assume(int cond) {}
#endif
EOF
    cat "$f" >> trustinn_stubs.tmp
    mv trustinn_stubs.tmp "$f"
    # Also update the copy in Programs/GCOV if it exists
    base=$(basename "$f")
    if [ "$f" != "./Programs/GCOV/$base" ] && [ -f "Programs/GCOV/$base" ]; then
      cp "$f" "Programs/GCOV/$base"
    fi
  fi
done

marker=$(mktemp)
touch "$marker"


pwd
ls -la
if [ -f "${inputName}" ]; then
  echo "---------- first 20 lines ----------"
  head -20 "${inputName}"
  echo "---------- nondet search ----------"
  grep -n "nondet_int" "${inputName}" || true
  grep -n "__CPROVER_input" "${inputName}" || true
else
  echo "---------- target is a folder ----------"
fi


${command}

output_path=${escapedOutputPath}
mkdir -p "$output_path"

find . -type f -newer "$marker" ! -path "./${STAGING_DIR_NAME}/*" -print0 | while IFS= read -r -d '' file; do
  dest="$output_path/$file"
  mkdir -p "$(dirname "$dest")"
  cp "$file" "$dest"
done

`;
}

async function runDockerTool(payload, hooks = {}) {
  const runId = createRunId();
  const notifyStatus = typeof hooks.onStatus === 'function' ? hooks.onStatus : () => {};
  const notifyOutput = typeof hooks.onOutput === 'function' ? hooks.onOutput : () => {};
  const toolConfig = getToolConfig(payload.language, payload.toolIndex, payload.subtoolIndex);
  const input = await prepareHostInput(payload, runId);
  const outputFolderName = `${slugify(toolConfig.outputLabel)}-${slugify(input.sourceBaseName)}`;
  const hostOutputRoot = path.join(os.homedir(), 'Downloads', 'Trustinn');
  const hostOutputDir = path.join(hostOutputRoot, outputFolderName);
  await fsp.mkdir(hostOutputDir, { recursive: true });

  await ensureDockerReady(notifyStatus);
  await ensureImagePulled(notifyStatus);

  notifyStatus(`Running ${toolConfig.outputLabel} on ${input.sourceBaseName}...`);

  const script = buildContainerScript({
    toolConfig,
    inputName: input.sourceBaseName,
    outputFolderName,
    params: payload.params || {},
    isFolder: input.isFolder
  });

console.log('================================');
console.log('SOURCE PATH:', input.sourcePath);
console.log('SOURCE BASE:', input.sourceBaseName);
console.log('TEMP ROOT:', input.tempRoot);
console.log('SOURCE TARGET:', input.sourceTarget);
console.log('================================');
console.log("========== DOCKER SCRIPT ==========");
console.log(script);
console.log("===================================");

  const dockerArgs = [
    'run',
    '--platform', TRUSTINN_PLATFORM,
    '--name', `trustinn-${runId}`,
    '--rm',
    '-v', `${input.tempRoot}:${HOST_INPUT_DIR}`,
    '-v', `${hostOutputRoot}:${HOST_OUTPUT_DIR}`,
    TRUSTINN_IMAGE,
    'bash',
    '-lc',
    script
  ];

  let stdout = '';
  let stderr = '';
  const startedAt = Date.now();

  await new Promise((resolve, reject) => {
    const child = spawn('docker', dockerArgs, { shell: false });
    activeDockerChild = child;
    activeDockerRunId = runId;
    let settled = false;

    const finish = (err, result) => {
      if (settled) {
        return;
      }
      settled = true;
      activeDockerChild = null;
      activeDockerRunId = null;
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    };

    child.stdout?.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      notifyOutput(text);
    });

    child.stderr?.on('data', (chunk) => {
      const text = chunk.toString();
      stderr += text;
      notifyOutput(text);
    });

    child.on('error', (err) => {
      finish(err);
    });

    child.on('close', async (code) => {
      try {
        const runDurationMs = Date.now() - startedAt;
        // await fsp.writeFile(path.join(hostOutputDir, 'stdout.txt'), stdout || '', 'utf8');
        // await fsp.writeFile(path.join(hostOutputDir, 'stderr.txt'), stderr || '', 'utf8');
        const outputFiles = collectFiles(hostOutputDir);
        // await fsp.writeFile(path.join(hostOutputDir, 'run-summary.json'), JSON.stringify({
        //   runId,
        //   language: payload.language,
        //   toolIndex: payload.toolIndex,
        //   subtoolIndex: payload.subtoolIndex ?? null,
        //   toolLabel: toolConfig.outputLabel,
        //   inputName: input.sourceBaseName,
        //   inputPath: input.sourcePath,
        //   outputFolderName,
        //   outputDir: hostOutputDir,
        //   outputFiles,
        //   exitCode: code,
        //   durationMs: runDurationMs,
        //   success: code === 0,
        //   startedAt: new Date(startedAt).toISOString(),
        //   finishedAt: new Date().toISOString()
        // }, null, 2), 'utf8');

        if (code === 0) {
          notifyStatus(`Completed ${toolConfig.outputLabel}. Output saved to Downloads/Trustinn/${outputFolderName}`);
          finish(null, {
            runId,
            toolLabel: toolConfig.outputLabel,
            outputFolderName,
            outputDir: hostOutputDir,
            outputFiles,
            exitCode: code,
            durationMs: runDurationMs,
            stdout,
            stderr
          });
        } else {
          const error = new Error(stderr.trim() || stdout.trim() || `Docker run failed with exit code ${code}`);
          error.exitCode = code;
          error.outputDir = hostOutputDir;
          error.outputFiles = outputFiles;
          finish(error);
        }
      } catch (err) {
        finish(err);
      }
    });
  }).finally(async () => {
    await cleanupDir(input.tempRoot);
  });
}

async function validateTool(payload, hooks = {}) {
  const notifyStatus = typeof hooks.onStatus === 'function' ? hooks.onStatus : () => {};
  const toolConfig = getToolConfig(payload.language, payload.toolIndex, payload.subtoolIndex);
  const input = getSourceSelection(payload);
  const outputFolderName = `${slugify(toolConfig.outputLabel)}-${slugify(input.sourceBaseName)}`;

  notifyStatus('Checking Docker daemon...');
  await ensureDockerReady(notifyStatus);
  await ensureImagePulled(notifyStatus);

  return {
    toolLabel: toolConfig.outputLabel,
    outputFolderName,
    outputDir: path.join(os.homedir(), 'Downloads', 'Trustinn', outputFolderName),
    inputName: input.sourceBaseName,
    inputPath: input.sourcePath
  };
}

function stopActiveRun() {
  if (!activeDockerChild) {
    return false;
  }

  try {
    activeDockerChild.kill('SIGTERM');
    setTimeout(() => {
      if (activeDockerChild) {
        try {
          activeDockerChild.kill('SIGKILL');
        } catch (error) {
          // Ignore follow-up kill errors.
        }
      }
    }, 5000);
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = {
  TRUSTINN_IMAGE,
  collectFiles,
  ensureDockerReady,
  ensureImagePulled,
  getToolConfig,
  runDockerTool,
  stopActiveRun,
  validateTool,
  slugify,
  stripExtension
};