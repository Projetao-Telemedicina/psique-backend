import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const envFile = resolve(process.cwd(), '.env');

if (!existsSync(envFile)) {
  throw new Error('Arquivo .env não encontrado.');
}

loadDotenv({
  path: envFile,
  override: true,
  quiet: true,
});

if (!process.env.DATABASE_URL) {
  throw new Error('A variável DATABASE_URL não está configurada no arquivo .env.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

async function main() {
  const [documents, requests, tokens, professionals, patients, users] =
    await prisma.$transaction([
      prisma.professionalRequestDocument.deleteMany(),
      prisma.professionalRequest.deleteMany(),
      prisma.token.deleteMany(),
      prisma.professionalProfile.deleteMany(),
      prisma.patientProfile.deleteMany(),
      prisma.user.deleteMany(),
    ]);

  console.log('\nDevelopment database cleared successfully.\n');
  console.log(`Professional request documents removed: ${documents.count}`);
  console.log(`Professional requests removed: ${requests.count}`);
  console.log(`Tokens removed: ${tokens.count}`);
  console.log(`Professional profiles removed: ${professionals.count}`);
  console.log(`Patient profiles removed: ${patients.count}`);
  console.log(`Users removed: ${users.count}\n`);
}

main()
  .catch((error) => {
    console.error(
      `Failed to clear the development database: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
