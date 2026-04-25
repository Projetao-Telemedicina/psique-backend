import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, extname, join, relative, resolve, sep } from 'node:path';
import { stdin as input, stdout as output, exit } from 'node:process';
import { createInterface } from 'node:readline/promises';

const projectRoot = process.cwd();
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

function closeRl() {
  if (isRlClosed) {
    return;
  }

  rl.close();
  isRlClosed = true;
}

function printSection(title) {
  output.write(`\n=== ${title} ===\n`);
}

function printInfo(message) {
  output.write(`${message}\n`);
}

function quoteWindowsArg(value) {
  if (/^[a-zA-Z0-9_./:=\\-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '\\"')}"`;
}

function getSpawnCommand(command, args) {
  if (process.platform !== 'win32') {
    return {
      command,
      args,
      options: {
        cwd: projectRoot,
        stdio: 'inherit',
        shell: false,
      },
    };
  }

  const commandLine = [command, ...args].map(quoteWindowsArg).join(' ');

  return {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', commandLine],
    options: {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: false,
      windowsVerbatimArguments: true,
    },
  };
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
      output.write(`${index + 1}. ${option.label}\n`);
    });

    if (allowBack) {
      output.write(`0. ${backLabel}\n`);
    }

    const answer = (await rl.question('\nSelect an option: ')).trim();
    const parsed = Number(answer);

    if (allowBack && parsed === 0) {
      return null;
    }

    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= options.length) {
      return options[parsed - 1].value;
    }

    printInfo('Invalid option. Please try again.');
  }
}

function runCommand(command, args, label) {
  return new Promise((resolvePromise, rejectPromise) => {
    printSection(label);

    const spawnData = getSpawnCommand(command, args);
    const child = spawn(spawnData.command, spawnData.args, spawnData.options);

    child.on('error', rejectPromise);
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(new Error(`${label} failed with status ${code ?? 1}.`));
    });
  });
}

async function ensureDevelopmentSetup() {
  await runCommand('npm', ['run', 'db:dev:up'], 'Starting development database');

  const generatedClientPath = resolve(projectRoot, 'src/generated/prisma/client.ts');

  if (!existsSync(generatedClientPath)) {
    await runCommand('npm', ['run', 'prisma:generate'], 'Generating Prisma Client');
  } else {
    printInfo('\nPrisma Client already exists. Skipping generate.');
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
    { label: 'Start production build', value: 'start-prod' },
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

  const scope = await askChoice('Execution mode', [
    { label: 'Run all', value: 'all' },
    { label: 'Choose individual tests', value: 'individual' },
  ]);

  if (!scope) {
    return;
  }

  if (scope === 'all') {
    closeRl();

    if (kind === 'unit') {
      await runCommand('npm', ['run', 'test'], 'Running all unit tests');
      return;
    }

    await runCommand('npm', ['run', 'test:e2e:local'], 'Running all E2E tests');
    return;
  }

  const modules = discoverTests(kind);

  if (modules.length === 0) {
    printInfo('\nNo tests were found for this category.');
    return;
  }

  const selectedModuleName = await askChoice(
    `${kind === 'unit' ? 'Unit' : 'E2E'} test modules`,
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
    printInfo('\nModule not found.');
    return;
  }

  await runIndividualTest(kind, moduleEntry);
}

function printHelp() {
  output.write(`
================================
 Psique Backend CLI
================================

1. Run Project
   Full setup:
   Starts the development database, generates Prisma Client if needed,
   applies pending migrations, and starts the app in watch mode.

   Quick modes:
   Start only in watch mode, debug mode, or production mode.

2. Run Tests
   Unit tests:
   Run everything or pick a specific module, file, and test case.

   E2E tests:
   Run everything locally with an isolated disposable database,
   or choose a specific module, file, and test case.

3. Help
   Shows this help screen.
`);
}

async function main() {
  if (process.argv[2] === 'help') {
    printHelp();
    closeRl();
    return;
  }

  const action = await askChoice(
    'Psique Backend CLI',
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
    output.write(`\nError: ${error instanceof Error ? error.message : 'unexpected failure'}\n`);
    closeRl();
    exit(1);
  })
  .finally(() => {
    closeRl();
  });
