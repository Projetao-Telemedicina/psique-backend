import { spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

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

try {
  run(npmCommand, ['run', 'db:test:up']);
  run(process.execPath, ['./scripts/prisma.mjs', '--env-file=.env.test', 'generate']);
  run(npmCommand, ['run', 'prisma:migrate:test']);
  run(npmCommand, ['run', 'test:e2e:ci']);
} finally {
  run(npmCommand, ['run', 'db:test:down']);
}
