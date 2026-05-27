import { Prisma, PrismaClient } from '@prisma/client';

export type PrismaClientLike = Prisma.TransactionClient | PrismaClient;
