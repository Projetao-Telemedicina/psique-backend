import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const args = process.argv.slice(2);
let envFile;

if (args[0]?.startsWith('--env-file=')) {
  envFile = args.shift().slice('--env-file='.length);
} else if (args[0] === '--env-file') {
  envFile = args[1];
  args.splice(0, 2);
}

if (envFile) {
  const resolvedEnvFile = resolve(process.cwd(), envFile);

  if (!existsSync(resolvedEnvFile)) {
    console.error(`Arquivo de ambiente nao encontrado: ${envFile}`);
    process.exit(1);
  }

  loadDotenv({
    path: resolvedEnvFile,
    override: true,
  });
}

const result = spawnSync(
  process.execPath,
  ['./node_modules/prisma/build/index.js', ...args],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: false,
    env: process.env,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
