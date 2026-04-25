import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';

const envPath = resolve(process.cwd(), '.env.test');

if (existsSync(envPath)) {
  loadDotenv({
    path: envPath,
    override: false,
  });
}
