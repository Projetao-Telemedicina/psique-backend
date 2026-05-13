import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';

let environmentLoaded = false;

function loadEnvironmentForAuth(): void {
  if (environmentLoaded) {
    return;
  }

  const envPath = process.env.DOTENV_CONFIG_PATH ?? join(process.cwd(), '.env');

  if (existsSync(envPath)) {
    Object.assign(process.env, parseEnv(readFileSync(envPath, 'utf8')));
  }

  environmentLoaded = true;
}

export function getRequiredEnv(
  name: 'JWT_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  loadEnvironmentForAuth();

  const value = process.env[name];

  if (!value) {
    throw new Error(
      `env var ${name} not defined. Define ${name} before starting the application.`,
    );
  }

  return value;
}
