import { Injectable, OnModuleDestroy } from '@nestjs/common';

type PrismaClientInstance = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
};

function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL nao foi definida no ambiente.');
  }

  return databaseUrl;
}

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private clientPromise?: Promise<PrismaClientInstance>;

  async getClient(): Promise<PrismaClientInstance> {
    this.clientPromise ??= this.createClient();

    return this.clientPromise;
  }

  private async createClient(): Promise<PrismaClientInstance> {
    const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
      import('@prisma/adapter-pg'),
      import('../generated/prisma/client.js'),
    ]);

    const client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: getDatabaseUrl(),
      }),
    });

    await client.$connect();

    return client;
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.clientPromise) {
      return;
    }

    const client = await this.clientPromise;

    await client.$disconnect();
  }
}
