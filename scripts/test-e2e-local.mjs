import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const jestArgs = process.argv.slice(2);
const envFile = resolve(process.cwd(), '.env.test');

if (!existsSync(envFile)) {
  throw new Error('Arquivo .env.test nao encontrado.');
}

process.env.DOTENV_CONFIG_PATH = envFile;
loadDotenv({
  path: envFile,
  override: true,
  quiet: true,
});

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} falhou com status ${result.status ?? 1}.`);
  }
}

function tryRun(command, args) {
  try {
    run(command, args);
  } catch (error) {
    console.warn(
      `Aviso ao executar ${command} ${args.join(' ')}: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

try {
  run(process.execPath, ['./scripts/docker-compose.mjs', 'up', 'test']);
  run(process.execPath, ['./scripts/prisma.mjs', '--env-file=.env.test', 'generate']);
  run(process.execPath, ['./scripts/prisma.mjs', '--env-file=.env.test', 'migrate', 'deploy']);
  run(process.execPath, [
    './node_modules/jest/bin/jest.js',
    '--config',
    './test/jest-e2e.json',
    ...jestArgs,
  ]);
} finally {
  tryRun(process.execPath, ['./scripts/docker-compose.mjs', 'down', 'test']);
}
