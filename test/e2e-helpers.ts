import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AppModule } from './../src/app.module.js';

export type E2eAppContext = {
  app: INestApplication;
  prisma: PrismaService;
};

export async function createE2eApp(): Promise<E2eAppContext> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app: INestApplication = moduleFixture.createNestApplication();
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const userId = req.headers['x-user-id'];
    const userRole = req.headers['x-user-role'];

    if (typeof userId === 'string' && typeof userRole === 'string') {
      (req as Request & { user?: { id: string; role: Role } }).user = {
        id: userId,
        role: userRole as Role,
      };
    }

    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  return {
    app,
    prisma: app.get<PrismaService>(PrismaService),
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.appointment.deleteMany();
  await prisma.professionalProfile.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.user.deleteMany();
}
