import { spawnSync } from 'node:child_process';

const [, , action, target] = process.argv;

const composeFiles = {
  dev: 'docker-compose.yml',
  test: 'docker-compose.test.yml',
};

if (!action || !target || !(target in composeFiles)) {
  console.error('Uso: node ./scripts/docker-compose.mjs <up|down> <dev|test>');
  process.exit(1);
}

const args = ['compose', '-f', composeFiles[target]];

if (action === 'up') {
  args.push('up', '-d', '--wait');
} else if (action === 'down') {
  args.push('down', '--remove-orphans');

  if (target === 'test') {
    args.push('--volumes');
  }
} else {
  console.error('Acao invalida. Use "up" ou "down".');
  process.exit(1);
}

const result = spawnSync('docker', args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
