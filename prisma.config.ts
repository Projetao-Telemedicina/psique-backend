import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { defineConfig, env } from 'prisma/config';

type Env = {
  DATABASE_URL: string;
};

const envFile =
  process.env.DOTENV_CONFIG_PATH ??
  ['.env', '.env.test'].find((candidate) =>
    existsSync(resolve(process.cwd(), candidate)),
  );

if (envFile) {
  loadDotenv({
    path: resolve(process.cwd(), envFile),
    override: false,
  });
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env<Env>('DATABASE_URL'),
  },
});
