import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { ProfessionalApprovalStatus, Role, UserStatus } from '@prisma/client';
import { AppModule } from '../src/app.module';
import { GoogleCalendarService } from '../src/google-calendar/google-calendar.service';
import { StripeService } from '../src/payments/stripe/stripe.service';
import { PrismaService } from '../src/prisma/prisma.service';

export type E2eAppContext = {
  app: INestApplication;
  prisma: PrismaService;
};

export const mockGoogleCalendarService = {
  createAppointmentEvent: jest.fn().mockResolvedValue({
    eventId: 'google-event-id-123',
    meetLink: 'https://meet.google.com/test-abc-def',
    htmlLink: 'https://calendar.google.com/event?eid=test',
  }),
  updateAppointmentEvent: jest.fn().mockResolvedValue(undefined),
  deleteAppointmentEvent: jest.fn().mockResolvedValue(undefined),
};

export const mockStripeService = {
  createCustomer: jest.fn().mockImplementation(({ email }: { email: string }) => ({
    id: `cus_${email.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12)}`,
  })),
  createSetupIntent: jest.fn().mockResolvedValue({
    id: 'seti_test_123',
    clientSecret: 'seti_test_123_secret',
  }),
  attachPaymentMethod: jest.fn().mockResolvedValue(undefined),
  detachPaymentMethod: jest.fn().mockResolvedValue(undefined),
  getCardPaymentMethodDetails: jest.fn().mockImplementation((paymentMethodId: string) => ({
    id: paymentMethodId,
    brand: 'visa',
    last4: '4242',
    expMonth: 12,
    expYear: 2030,
    holderName: 'Patient Test',
  })),
  updateDefaultPaymentMethod: jest.fn().mockResolvedValue(undefined),
  createAndConfirmPaymentIntent: jest.fn().mockResolvedValue({
    id: 'pi_test_123',
    status: 'succeeded',
    clientSecret: 'pi_test_123_secret',
  }),
  constructWebhookEvent: jest
    .fn()
    .mockImplementation((payload: Buffer): Record<string, unknown> => {
      return JSON.parse(payload.toString('utf8')) as Record<string, unknown>;
    }),
};

export async function createE2eApp(): Promise<E2eAppContext> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GoogleCalendarService)
    .useValue(mockGoogleCalendarService)
    .overrideProvider(StripeService)
    .useValue(mockStripeService)
    .compile();

  const app = moduleFixture.createNestApplication({ rawBody: true });

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
    prisma: app.get(PrismaService),
  };
}

export async function resetDatabase(prisma: PrismaService): Promise<void> {
  await prisma.payment.deleteMany();
  await prisma.paymentMethod.deleteMany();
  await prisma.messageAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.emergencyOffer.deleteMany();
  await prisma.appointmentRescheduleRequest.deleteMany();
  await prisma.review.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.emergencyRequest.deleteMany();
  await prisma.professionalRequestDocument.deleteMany();
  await prisma.professionalRequest.deleteMany();
  await prisma.token.deleteMany();
  await prisma.userCoupon.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();
}

let seq = 0;
const uid = () => `${Date.now()}-${++seq}`;

export async function createPatientUser(prisma: PrismaService) {
  return prisma.user.create({
    data: {
      name: 'Patient Test',
      email: `patient-${uid()}@test.com`,
      passwordHash: 'hashed_password',
      role: Role.PATIENT,
      status: UserStatus.ACTIVE,
      patientProfile: { create: {} },
    },
    include: { patientProfile: true },
  });
}

export async function createProfessionalUser(prisma: PrismaService) {
  return prisma.user.create({
    data: {
      name: 'Professional Test',
      email: `professional-${uid()}@test.com`,
      passwordHash: 'hashed_password',
      role: Role.PROFESSIONAL,
      status: UserStatus.ACTIVE,
      professionalProfile: {
        create: {
          crp: `07-${uid()}`,
          approvalStatus: ProfessionalApprovalStatus.APPROVED,
        },
      },
    },
    include: { professionalProfile: true },
  });
}

export async function createAppointmentForChat(
  prisma: PrismaService,
  input: {
    patientId: string;
    professionalId: string;
  },
) {
  return prisma.appointment.create({
    data: {
      patientId: input.patientId,
      professionalId: input.professionalId,
      status: 'SCHEDULED',
      startsAt: new Date('2026-06-10T14:00:00.000Z'),
      endsAt: new Date('2026-06-10T14:50:00.000Z'),
      priceCents: 15000,
    },
  });
}

export async function createAdminUser(prisma: PrismaService) {
  return prisma.user.create({
    data: {
      name: 'Admin Test',
      email: `admin-${uid()}@test.com`,
      passwordHash: 'hashed_password',
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });
}

export async function createAuthToken(
  app: INestApplication,
  prisma: PrismaService,
  user: { id: string; role: Role },
): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!jwtSecret || !jwtRefreshSecret) {
    throw new Error('JWT secrets not configured for e2e tests.');
  }

  const jwtService = app.get(JwtService);
  const jwt = jwtService.sign(
    { sub: user.id, role: user.role },
    { secret: jwtSecret },
  );
  const refreshJwt = jwtService.sign(
    { sub: user.id },
    { expiresIn: '7d', secret: jwtRefreshSecret },
  );

  await prisma.token.upsert({
    where: { userId: user.id },
    update: { jwt, refreshJwt },
    create: { userId: user.id, jwt, refreshJwt },
  });

  return jwt;
}
