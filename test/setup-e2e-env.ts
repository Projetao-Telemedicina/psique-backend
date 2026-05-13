import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envPath = resolve(__dirname, '..', '.env.test');

if (existsSync(envPath)) {
  process.env.DOTENV_CONFIG_PATH = envPath;
  loadDotenv({
    path: envPath,
    override: true,
    quiet: true,
  });
}
