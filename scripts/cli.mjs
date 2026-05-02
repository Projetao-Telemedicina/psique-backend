import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { stdin as input, stdout as output, exit } from 'node:process';
import { createInterface } from 'node:readline/promises';

const projectRoot = process.cwd();
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const jestBin = './node_modules/jest/bin/jest.js';
const unitJestBaseArgs = ['--experimental-vm-modules', jestBin];
const e2eJestBaseArgs = [
  '--experimental-vm-modules',
  jestBin,
  '--config',
  './test/jest-e2e.json',
];

const rl = createInterface({ input, output });
let isRlClosed = false;

const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

function paint(text, ...styles) {
  return `${styles.join('')}${text}${color.reset}`;
}

function closeRl() {
  if (isRlClosed) {
    return;
  }

  rl.close();
  isRlClosed = true;
}

function printBanner() {
  output.write(
    `\n${paint('========================================', color.cyan)}\n` +
      `${paint('         Psique Backend CLI', color.bold, color.cyan)}\n` +
      `${paint('========================================', color.cyan)}\n`,
  );
}

function printSection(title) {
  output.write(
    `\n${paint('----------------------------------------', color.blue)}\n` +
      `${paint(title, color.bold, color.blue)}\n` +
      `${paint('----------------------------------------', color.blue)}\n`,
  );
}

function printInfo(message) {
  output.write(`${paint('>', color.cyan)} ${message}\n`);
}

function printSuccess(message) {
  output.write(`${paint('[OK]', color.green, color.bold)} ${paint(message, color.green)}\n`);
}

function printWarning(message) {
  output.write(`${paint('[!]', color.yellow, color.bold)} ${paint(message, color.yellow)}\n`);
}

function listFilesRecursive(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(directory)) {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      files.push(...listFilesRecursive(fullPath));
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseTestCases(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const testCasePattern = /\b(?:it|test)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  const testCases = [];
  let match;

  while ((match = testCasePattern.exec(content)) !== null) {
    testCases.push(match[1]);
  }

  return testCases;
}

function inferModuleName(filePath) {
  const relativePath = relative(projectRoot, filePath);
  const normalized = relativePath.split(sep);

  if (normalized[0] === 'src') {
    const withoutRoot = normalized.slice(1);

    if (withoutRoot[0] === 'generated') {
      return null;
    }

    if (withoutRoot.length > 1) {
      return withoutRoot[0];
    }

    return basename(filePath).split('.')[0];
  }

  if (normalized[0] === 'test') {
    const fileName = basename(filePath);

    if (fileName.startsWith('app.')) {
      return 'app';
    }

    if (normalized.length > 2) {
      return normalized[1];
    }

    return 'general';
  }

  return 'general';
}

function discoverTests(kind) {
  const rootDirectory = kind === 'unit' ? 'src' : 'test';
  const suffix = kind === 'unit' ? '.spec.ts' : '.e2e-spec.ts';
  const files = listFilesRecursive(resolve(projectRoot, rootDirectory))
    .filter((filePath) => filePath.endsWith(suffix))
    .filter((filePath) => !filePath.includes(`${sep}generated${sep}`));

  const modules = new Map();

  for (const filePath of files) {
    const moduleName = inferModuleName(filePath) ?? 'general';
    const testEntry = {
      relativePath: relative(projectRoot, filePath),
      cases: parseTestCases(filePath),
    };

    if (!modules.has(moduleName)) {
      modules.set(moduleName, []);
    }

    modules.get(moduleName).push(testEntry);
  }

  return Array.from(modules.entries())
    .map(([moduleName, tests]) => ({
      moduleName,
      tests: tests.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
    }))
    .sort((left, right) => left.moduleName.localeCompare(right.moduleName));
}

async function askChoice(title, options, config = {}) {
  const { allowBack = true, backLabel = 'Back' } = config;

  while (true) {
    printSection(title);

    options.forEach((option, index) => {
      output.write(
        `${paint(String(index + 1).padStart(2, ' '), color.magenta, color.bold)} ${option.label}\n`,
      );
    });

    if (allowBack) {
      output.write(`${paint(' 0', color.gray, color.bold)} ${paint(backLabel, color.gray)}\n`);
    }

    const answer = (
      await rl.question(`\n${paint('Select an option', color.bold, color.cyan)} ${paint('>', color.cyan)} `)
    ).trim();
    const parsed = Number(answer);

    if (allowBack && parsed === 0) {
      return null;
    }

    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= options.length) {
      return options[parsed - 1].value;
    }

    printWarning('Invalid option. Please try again.');
  }
}

function runCommand(command, args, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    printSection(label);

    const resolvedCommand = command === 'npm' ? npmCommand : command;
    const child = spawn(resolvedCommand, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: process.platform === 'win32' && resolvedCommand.endsWith('.cmd'),
    });

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        printSuccess(label);
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${label} failed with status ${code ?? 1}.`));
    });
  });
}

async function ensureDevelopmentSetup() {
  await runCommand('npm', ['run', 'db:dev:up'], 'Starting development database');

  const generatedClientPath = resolve(projectRoot, 'node_modules/.prisma/client/index.js');

  if (!existsSync(generatedClientPath)) {
    await runCommand('npm', ['run', 'prisma:generate'], 'Generating Prisma Client');
  } else {
    output.write('\n');
    printInfo('Prisma Client already exists. Skipping generate.');
  }

  await runCommand(
    process.execPath,
    ['./scripts/prisma.mjs', '--env-file=.env', 'migrate', 'deploy'],
    'Applying pending development migrations',
  );
}

async function ensureTestSetup() {
  await runCommand('npm', ['run', 'db:test:up'], 'Starting test database');
  await runCommand(
    process.execPath,
    ['./scripts/prisma.mjs', '--env-file=.env.test', 'generate'],
    'Generating Prisma Client for tests',
  );
  await runCommand('npm', ['run', 'prisma:migrate:test'], 'Applying test database migrations');
}

async function cleanupTestSetup() {
  await runCommand('npm', ['run', 'db:test:down'], 'Stopping test database');
}

async function runProjectMenu() {
  const action = await askChoice('Run Project', [
    { label: 'Full setup and start in watch mode', value: 'setup-dev' },
    { label: 'Start only with npm run start:dev', value: 'start-dev' },
    { label: 'Start in debug mode', value: 'start-debug' },
    { label: 'Build and start in production mode', value: 'start-prod' },
  ]);

  if (!action) {
    return;
  }

  closeRl();

  if (action === 'setup-dev') {
    await ensureDevelopmentSetup();
    await runCommand('npm', ['run', 'start:dev'], 'Starting project in watch mode');
    return;
  }

  if (action === 'start-dev') {
    await runCommand('npm', ['run', 'start:dev'], 'Starting project in watch mode');
    return;
  }

  if (action === 'start-debug') {
    await runCommand('npm', ['run', 'start:debug'], 'Starting project in debug mode');
    return;
  }

  await runCommand('npm', ['run', 'build'], 'Building project');
  await runCommand('npm', ['run', 'start:prod'], 'Starting project in production mode');
}

async function runIndividualTest(kind, moduleEntry) {
  const fileChoice = await askChoice(
    `Tests in module "${moduleEntry.moduleName}"`,
    [
      {
        label: `Run all tests in module ${moduleEntry.moduleName}`,
        value: { type: 'module-all' },
      },
      ...moduleEntry.tests.map((testEntry) => ({
        label: testEntry.relativePath,
        value: { type: 'file', testEntry },
      })),
    ],
  );

  if (!fileChoice) {
    return;
  }

  if (fileChoice.type === 'module-all') {
    const paths = moduleEntry.tests.map((testEntry) => testEntry.relativePath);
    const args = kind === 'unit' ? [...unitJestBaseArgs] : [...e2eJestBaseArgs];
    args.push('--runTestsByPath', ...paths);

    closeRl();

    if (kind === 'e2e') {
      try {
        await ensureTestSetup();
        await runCommand(
          process.execPath,
          args,
          `Running all tests in module ${moduleEntry.moduleName}`,
        );
      } finally {
        await cleanupTestSetup();
      }

      return;
    }

    await runCommand(
      process.execPath,
      args,
      `Running all tests in module ${moduleEntry.moduleName}`,
    );
    return;
  }

  const { testEntry } = fileChoice;
  const caseOptions = [
    {
      label: `Run full file (${testEntry.relativePath})`,
      value: { type: 'file-all' },
    },
    ...testEntry.cases.map((testCase) => ({
      label: testCase,
      value: { type: 'single-case', testCase },
    })),
  ];

  const caseChoice = await askChoice(`Pick a test in ${testEntry.relativePath}`, caseOptions);

  if (!caseChoice) {
    return;
  }

  const args = kind === 'unit' ? [...unitJestBaseArgs] : [...e2eJestBaseArgs];
  args.push('--runTestsByPath', testEntry.relativePath);

  let label = `Running ${testEntry.relativePath}`;

  if (caseChoice.type === 'single-case') {
    args.push('--testNamePattern', escapeRegExp(caseChoice.testCase));
    label = `Running test "${caseChoice.testCase}"`;
  }

  closeRl();

  if (kind === 'e2e') {
    try {
      await ensureTestSetup();
      await runCommand(process.execPath, args, label);
    } finally {
      await cleanupTestSetup();
    }

    return;
  }

  await runCommand(process.execPath, args, label);
}

async function runTestsMenu() {
  const kind = await askChoice('Run Tests', [
    { label: 'Unit tests', value: 'unit' },
    { label: 'E2E tests', value: 'e2e' },
  ]);

  if (!kind) {
    return;
  }

  const scope = await askChoice('Execution Mode', [
    { label: 'Run all', value: 'all' },
    { label: 'Choose individual tests', value: 'individual' },
  ]);

  if (!scope) {
    return;
  }

  if (scope === 'all') {
    closeRl();

    if (kind === 'unit') {
      await runCommand(
        process.execPath,
        [...unitJestBaseArgs, '--runInBand'],
        'Running all unit tests',
      );
      return;
    }

    await runCommand('npm', ['run', 'test:e2e:local'], 'Running all E2E tests');
    return;
  }

  const modules = discoverTests(kind);

  if (modules.length === 0) {
    output.write('\n');
    printWarning('No tests were found for this category.');
    return;
  }

  const selectedModuleName = await askChoice(
    `${kind === 'unit' ? 'Unit' : 'E2E'} Test Modules`,
    modules.map((moduleEntry) => ({
      label: `${moduleEntry.moduleName} (${moduleEntry.tests.length} file(s))`,
      value: moduleEntry.moduleName,
    })),
  );

  if (!selectedModuleName) {
    return;
  }

  const moduleEntry = modules.find((entry) => entry.moduleName === selectedModuleName);

  if (!moduleEntry) {
    output.write('\n');
    printWarning('Module not found.');
    return;
  }

  await runIndividualTest(kind, moduleEntry);
}

function printHelp() {
  output.write(
    `${paint('1. Run Project', color.bold, color.green)}\n` +
      `   ${paint('Full setup', color.yellow)}\n` +
      `   Starts the development database, generates Prisma Client if needed,\n` +
      `   applies pending migrations, and starts the app in watch mode.\n\n` +
      `   ${paint('Quick modes', color.yellow)}\n` +
      `   Start only in watch mode, debug mode, or production mode.\n\n` +
      `${paint('2. Run Tests', color.bold, color.green)}\n` +
      `   ${paint('Unit tests', color.yellow)}\n` +
      `   Run everything or pick a specific module, file, and test case.\n\n` +
      `   ${paint('E2E tests', color.yellow)}\n` +
      `   Run everything locally with an isolated disposable database,\n` +
      `   or choose a specific module, file, and test case.\n\n` +
      `${paint('3. Help', color.bold, color.green)}\n` +
      `   Shows this help screen.\n`,
  );
}

async function main() {
  printBanner();

  if (process.argv[2] === 'help') {
    printHelp();
    closeRl();
    return;
  }

  const action = await askChoice(
    'Main Menu',
    [
      { label: 'Run project', value: 'run-project' },
      { label: 'Run tests', value: 'run-tests' },
      { label: 'Help', value: 'help' },
    ],
    { allowBack: false },
  );

  if (action === 'run-project') {
    await runProjectMenu();
    return;
  }

  if (action === 'run-tests') {
    await runTestsMenu();
    return;
  }

  printHelp();
  closeRl();
}

main()
  .catch((error) => {
    const message = error instanceof Error ? error.message : 'unexpected failure';

    output.write(`\n${paint('Error:', color.red, color.bold)} ${message}\n`);

    if (message.includes('docker_engine') || message.includes('Acesso negado')) {
      output.write(
        `${paint('Hint:', color.yellow, color.bold)} Docker may require elevated permissions in this terminal.\n`,
      );
    }

    closeRl();
    exit(1);
  })
  .finally(() => {
    closeRl();
  });
