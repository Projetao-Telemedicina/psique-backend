import {
    OnlineStatus,
    ProfessionalApprovalStatus,
    ProfessionalRequestStatus,
    RecurrenceType,
    Role,
    UserStatus,
} from '@prisma/client';
import request from 'supertest';
import { E2eAppContext, createE2eApp, resetDatabase } from '../e2e-helpers';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

describe('ProfessionalsController (e2e)', () => {
  let context: E2eAppContext;
  let sequence = 0;
  const pngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jx7sAAAAASUVORK5CYII=',
    'base64',
  );
  const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

  const nextEmail = () => `professional-${Date.now()}-${++sequence}@example.com`;
  const nextCrp = () => `CRP-${Date.now()}-${sequence}`;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function createProfessionalUser() {
    const response = await request(context.app.getHttpServer())
      .post('/users')
      .send({
        name: 'Dra. Paula',
        email: nextEmail(),
        password: 'Password123',
        role: Role.PROFESSIONAL,
        professionalProfile: {
          crp: nextCrp(),
          specialty: 'Psicologia Clinica',
          availableForEmergency: false,
          gapBetweenAppointmentsMinutes: 15,
        },
      })
      .expect(201);

    return response.body;
  }

  async function createApprovedProfessional(name: string, scoreAvg: number) {
    return context.prisma.user.create({
      data: {
        name,
        email: nextEmail(),
        passwordHash: 'hashed_password',
        role: Role.PROFESSIONAL,
        status: UserStatus.ACTIVE,
        professionalProfile: {
          create: {
            crp: nextCrp(),
            specialty: 'Psicologia Clinica',
            approvalStatus: ProfessionalApprovalStatus.APPROVED,
            scoreAvg,
            reviewCount: scoreAvg > 0 ? 1 : 0,
            onlineStatus: OnlineStatus.OFFLINE,
          },
        },
      },
      include: {
        professionalProfile: true,
      },
    });
  }

  async function promoteProfessional(
    professionalId: string,
    overrides: Partial<{
      durationDays: number;
    }> = {},
  ) {
    const now = new Date('2026-06-16T10:35:00.000Z');
    const endsAt = new Date(now);
    endsAt.setUTCDate(endsAt.getUTCDate() + (overrides.durationDays ?? 7));

    const promotionPlan = await context.prisma.promotionPlan.create({
      data: {
        name: 'Impulsionamento teste',
        description: 'Plano usado para validar a vitrine pública.',
        priceCents: 2990,
        durationDays: overrides.durationDays ?? 7,
      },
    });

    await context.prisma.professionalPromotion.create({
      data: {
        professionalId,
        promotionPlanId: promotionPlan.id,
        status: 'ACTIVE',
        startsAt: now,
        endsAt,
      },
    });

    await context.prisma.professionalProfile.update({
      where: { userId: professionalId },
      data: {
        isPromoted: true,
        promotionEndsAt: endsAt,
      },
    });
  }

  async function createAdminUser() {
    const response = await request(context.app.getHttpServer())
      .post('/users')
      .send({
        name: 'Admin User',
        email: `admin-${Date.now()}-${++sequence}@example.com`,
        password: 'Password123',
        role: Role.ADMIN,
      })
      .expect(201);

    return response.body;
  }

  async function login(email: string, password = 'Password123'): Promise<AuthTokens> {
    const response = await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body as AuthTokens;
  }

  function submitValidationRequest(accessToken: string) {
    return request(context.app.getHttpServer())
      .post('/professionals/me/validation-request')
      .set('Authorization', `Bearer ${accessToken}`)
      .attach('document', pdfBuffer, {
        filename: 'rg.pdf',
        contentType: 'application/pdf',
      });
  }

  it('GET /professionals/:userId returns the professional profile with user data', async () => {
    const professional = await createProfessionalUser();

    const response = await request(context.app.getHttpServer())
      .get(`/professionals/${professional.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      userId: professional.id,
      specialty: 'Psicologia Clinica',
      approvalStatus: ProfessionalApprovalStatus.PENDING,
      onlineStatus: OnlineStatus.OFFLINE,
      availableForEmergency: false,
      gapBetweenAppointmentsMinutes: 15,
      user: {
        name: 'Dra. Paula',
        email: professional.email,
        role: Role.PROFESSIONAL,
      },
    });
  });

  it('GET /professionals lists approved professionals prioritizing promoted profiles', async () => {
    const lowerScore = await createApprovedProfessional('Dra. Clara', 3.5);
    const higherScore = await createApprovedProfessional('Dr. Hugo', 4.8);
    await promoteProfessional(lowerScore.id);

    await context.prisma.user.create({
      data: {
        name: 'Dra. Pending',
        email: nextEmail(),
        passwordHash: 'hashed_password',
        role: Role.PROFESSIONAL,
        status: UserStatus.ACTIVE,
        professionalProfile: {
          create: {
            crp: nextCrp(),
            specialty: 'Psicologia Clinica',
            approvalStatus: ProfessionalApprovalStatus.PENDING,
            scoreAvg: 5,
            reviewCount: 1,
            onlineStatus: OnlineStatus.OFFLINE,
          },
        },
      },
    });

    const response = await request(context.app.getHttpServer())
      .get('/professionals')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      userId: lowerScore.id,
      isPromoted: true,
    });
    expect(response.body[1]).toMatchObject({
      userId: higherScore.id,
      isPromoted: false,
    });
    expect(response.body[0].promotionEndsAt).not.toBeNull();
    expect(Number(response.body[0].scoreAvg)).toBeCloseTo(3.5, 5);
    expect(Number(response.body[1].scoreAvg)).toBeCloseTo(4.8, 5);
  });

  it('PATCH /professionals/me lets a professional update their own profile', async () => {
    const professional = await createProfessionalUser();
    const tokens = await login(professional.email);

    const response = await request(context.app.getHttpServer())
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({
        specialty: 'Terapia Cognitivo-Comportamental',
        availableForEmergency: true,
        autoAbsenceMessage: 'Em atendimento no momento',
        gapBetweenAppointmentsMinutes: 30,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: professional.id,
      specialty: 'Terapia Cognitivo-Comportamental',
      approvalStatus: ProfessionalApprovalStatus.PENDING,
      onlineStatus: OnlineStatus.OFFLINE,
      availableForEmergency: true,
      autoAbsenceMessage: 'Em atendimento no momento',
      gapBetweenAppointmentsMinutes: 30,
    });
  });

  it('PATCH /admin/professionals/:userId lets an admin update any professional profile', async () => {
    const professional = await createProfessionalUser();
    const admin = await createAdminUser();
    const adminTokens = await login(admin.email);

    const response = await request(context.app.getHttpServer())
      .patch(`/admin/professionals/${professional.id}`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({
        specialty: 'Psicologia Hospitalar',
        availableForEmergency: true,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: professional.id,
      specialty: 'Psicologia Hospitalar',
      availableForEmergency: true,
    });
  });

  it('PATCH /admin/professionals/:userId forbids a professional from updating another professional profile', async () => {
    const firstProfessional = await createProfessionalUser();
    const secondProfessional = await createProfessionalUser();
    const secondTokens = await login(secondProfessional.email);

    await request(context.app.getHttpServer())
      .patch(`/admin/professionals/${firstProfessional.id}`)
      .set('Authorization', `Bearer ${secondTokens.accessToken}`)
      .send({
        specialty: 'Tentativa Indevida',
      })
      .expect(403);

    const persistedProfile = await request(context.app.getHttpServer())
      .get(`/professionals/${firstProfessional.id}`)
      .expect(200);

    expect(persistedProfile.body).toMatchObject({
      userId: firstProfessional.id,
      specialty: 'Psicologia Clinica',
      approvalStatus: ProfessionalApprovalStatus.PENDING,
      onlineStatus: OnlineStatus.OFFLINE,
      availableForEmergency: false,
      gapBetweenAppointmentsMinutes: 15,
    });
  });

  it('GET /professionals/:userId returns 404 for a missing profile', async () => {
    await request(context.app.getHttpServer())
      .get('/professionals/0f0d6a8f-25fc-457e-a8fa-c3a43e3c8da1')
      .expect(404);
  });

  it('PATCH /professionals/me/online-mode lets a professional update their own status', async () => {
    const professional = await createProfessionalUser();
    const tokens = await login(professional.email);

    const response = await request(context.app.getHttpServer())
      .patch('/professionals/me/online-mode')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({ onlineMode: OnlineStatus.ONLINE })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: professional.id,
      onlineStatus: OnlineStatus.ONLINE,
    });
  });

  it('PATCH /admin/professionals/:userId/online-mode lets an admin update any professional status', async () => {
    const professional = await createProfessionalUser();
    const admin = await createAdminUser();
    const adminTokens = await login(admin.email);

    const response = await request(context.app.getHttpServer())
      .patch(`/admin/professionals/${professional.id}/online-mode`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ onlineMode: OnlineStatus.ONLINE })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: professional.id,
      onlineStatus: OnlineStatus.ONLINE,
    });
  });

  it('PATCH /admin/professionals/:userId/online-mode forbids a professional from updating another professional status', async () => {
    const firstProfessional = await createProfessionalUser();
    const secondProfessional = await createProfessionalUser();
    const secondTokens = await login(secondProfessional.email);

    await request(context.app.getHttpServer())
      .patch(`/admin/professionals/${firstProfessional.id}/online-mode`)
      .set('Authorization', `Bearer ${secondTokens.accessToken}`)
      .send({ onlineMode: OnlineStatus.ONLINE })
      .expect(403);

    const persistedProfile = await request(context.app.getHttpServer())
      .get(`/professionals/${firstProfessional.id}`)
      .expect(200);

    expect(persistedProfile.body).toMatchObject({
      userId: firstProfessional.id,
      onlineStatus: OnlineStatus.OFFLINE,
    });
  });

  it('POST /professionals/me/validation-request lets a professional submit RG for review', async () => {
    const professional = await createProfessionalUser();
    const tokens = await login(professional.email);

    const response = await submitValidationRequest(tokens.accessToken).expect(201);

    expect(response.body).toMatchObject({
      professionalId: professional.id,
      status: ProfessionalRequestStatus.PENDING,
      userStatus: UserStatus.INACTIVE,
      approvalStatus: ProfessionalApprovalStatus.PENDING,
    });

    const persisted = await context.prisma.professionalRequest.findUniqueOrThrow({
      where: { id: response.body.id },
      include: {
        documents: true,
        professional: {
          include: {
            user: true,
          },
        },
      },
    });

    expect(persisted.documents).toHaveLength(1);
    expect(persisted.documents[0]?.documentType).toBe('RG');
    expect(persisted.documents[0]?.fileName).toBe('rg.pdf');
    expect(persisted.documents[0]?.mimeType).toBe('application/pdf');
    expect(persisted.documents[0]?.sizeBytes).toBe(pdfBuffer.length);
    expect(Buffer.from(persisted.documents[0]?.fileData ?? [])).toEqual(pdfBuffer);
    expect(persisted.professional.crp).toBe(professional.professionalProfile.crp);
    expect(persisted.professional.approvalStatus).toBe(
      ProfessionalApprovalStatus.PENDING,
    );
    expect(persisted.professional.user.status).toBe(UserStatus.INACTIVE);
  });

  it('GET /professionals/me/validation-request returns only the authenticated professional latest request', async () => {
    const firstProfessional = await createProfessionalUser();
    const secondProfessional = await createProfessionalUser();
    const firstTokens = await login(firstProfessional.email);
    const secondTokens = await login(secondProfessional.email);

    const firstRequest = await submitValidationRequest(firstTokens.accessToken).expect(
      201,
    );
    await submitValidationRequest(secondTokens.accessToken).expect(201);

    const response = await request(context.app.getHttpServer())
      .get('/professionals/me/validation-request')
      .set('Authorization', `Bearer ${firstTokens.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: firstRequest.body.id,
      professionalId: firstProfessional.id,
      status: ProfessionalRequestStatus.PENDING,
    });
  });

  it('GET /professionals/me/validation-requests returns the authenticated professional history only', async () => {
    const firstProfessional = await createProfessionalUser();
    const secondProfessional = await createProfessionalUser();
    const firstTokens = await login(firstProfessional.email);
    const secondTokens = await login(secondProfessional.email);

    const firstRequest = await submitValidationRequest(firstTokens.accessToken).expect(
      201,
    );
    await submitValidationRequest(secondTokens.accessToken).expect(201);

    const response = await request(context.app.getHttpServer())
      .get('/professionals/me/validation-requests')
      .set('Authorization', `Bearer ${firstTokens.accessToken}`)
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        id: firstRequest.body.id,
        professionalId: firstProfessional.id,
        status: ProfessionalRequestStatus.PENDING,
      }),
    ]);
  });

  it('POST /professionals/me/validation-request blocks a second pending request for the same professional', async () => {
    const professional = await createProfessionalUser();
    const tokens = await login(professional.email);

    await submitValidationRequest(tokens.accessToken).expect(201);
    await submitValidationRequest(tokens.accessToken).expect(409);
  });

  it('POST /professionals/me/validation-request rejects invalid file types and spoofed content', async () => {
    const professional = await createProfessionalUser();
    const tokens = await login(professional.email);

    await request(context.app.getHttpServer())
      .post('/professionals/me/validation-request')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .attach('document', Buffer.from('MZ fake executable'), {
        filename: 'rg.exe',
        contentType: 'application/x-msdownload',
      })
      .expect(400);

    await request(context.app.getHttpServer())
      .post('/professionals/me/validation-request')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .attach('document', Buffer.from('console.log("not a pdf");'), {
        filename: 'rg.pdf',
        contentType: 'application/pdf',
      })
      .expect(400);
  });

  it('POST /professionals/me/validation-request forbids patients from using the professional validation route', async () => {
    const patientResponse = await request(context.app.getHttpServer())
      .post('/users')
      .send({
        name: 'Paciente',
        email: `patient-${Date.now()}-${++sequence}@example.com`,
        password: 'Password123',
        role: Role.PATIENT,
      })
      .expect(201);

    const patientTokens = await login(patientResponse.body.email);

    await request(context.app.getHttpServer())
      .post('/professionals/me/validation-request')
      .set('Authorization', `Bearer ${patientTokens.accessToken}`)
      .attach('document', pngBuffer, {
        filename: 'rg.png',
        contentType: 'image/png',
      })
      .expect(403);
  });

  it('GET /admin/professionals/validation-requests lets an admin filter requests by id, name and date', async () => {
    const firstProfessional = await createProfessionalUser();
    const secondProfessional = await createProfessionalUser();
    const admin = await createAdminUser();
    const firstTokens = await login(firstProfessional.email);
    const secondTokens = await login(secondProfessional.email);
    const adminTokens = await login(admin.email);

    const firstRequest = await submitValidationRequest(firstTokens.accessToken).expect(
      201,
    );
    await submitValidationRequest(secondTokens.accessToken).expect(201);

    const response = await request(context.app.getHttpServer())
      .get('/admin/professionals/validation-requests')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .query({
        requestId: firstRequest.body.id,
        professionalId: firstProfessional.id,
        professionalName: 'Paula',
        status: ProfessionalRequestStatus.PENDING,
        submittedFrom: '2026-01-01T00:00:00.000Z',
      })
      .expect(200);

    expect(response.body).toEqual([
      expect.objectContaining({
        id: firstRequest.body.id,
        professionalId: firstProfessional.id,
        status: ProfessionalRequestStatus.PENDING,
        professional: {
          crp: firstProfessional.professionalProfile.crp,
          user: {
            name: 'Dra. Paula',
            email: firstProfessional.email,
            status: UserStatus.INACTIVE,
          },
        },
      }),
    ]);
  });

  it('PATCH /admin/professionals/validation-requests/:requestId/approve activates the professional', async () => {
    const professional = await createProfessionalUser();
    const admin = await createAdminUser();
    const professionalTokens = await login(professional.email);
    const adminTokens = await login(admin.email);
    const validationRequest = await submitValidationRequest(
      professionalTokens.accessToken,
    ).expect(201);

    const response = await request(context.app.getHttpServer())
      .patch(`/admin/professionals/validation-requests/${validationRequest.body.id}/approve`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: validationRequest.body.id,
      professionalId: professional.id,
      status: ProfessionalRequestStatus.APPROVED,
      userStatus: UserStatus.ACTIVE,
      approvalStatus: ProfessionalApprovalStatus.APPROVED,
    });

    const persistedUser = await context.prisma.user.findUniqueOrThrow({
      where: { id: professional.id },
      include: {
        professionalProfile: true,
      },
    });

    expect(persistedUser.status).toBe(UserStatus.ACTIVE);
    expect(persistedUser.professionalProfile?.approvalStatus).toBe(
      ProfessionalApprovalStatus.APPROVED,
    );
  });

  it('PATCH /admin/professionals/validation-requests/:requestId/reject rejects the request and keeps the professional inactive', async () => {
    const professional = await createProfessionalUser();
    const admin = await createAdminUser();
    const professionalTokens = await login(professional.email);
    const adminTokens = await login(admin.email);
    const validationRequest = await submitValidationRequest(
      professionalTokens.accessToken,
    ).expect(201);

    const response = await request(context.app.getHttpServer())
      .patch(`/admin/professionals/validation-requests/${validationRequest.body.id}/reject`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({
        rejectionReason: 'Documento ilegivel',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: validationRequest.body.id,
      professionalId: professional.id,
      status: ProfessionalRequestStatus.REJECTED,
      rejectionReason: 'Documento ilegivel',
      userStatus: UserStatus.INACTIVE,
      approvalStatus: ProfessionalApprovalStatus.REJECTED,
    });
  });

  it('PATCH /admin/professionals/validation-requests/:requestId/approve forbids non-admin access', async () => {
    const professional = await createProfessionalUser();
    const otherProfessional = await createProfessionalUser();
    const professionalTokens = await login(professional.email);
    const otherTokens = await login(otherProfessional.email);
    const validationRequest = await submitValidationRequest(
      professionalTokens.accessToken,
    ).expect(201);

    await request(context.app.getHttpServer())
      .patch(`/admin/professionals/validation-requests/${validationRequest.body.id}/approve`)
      .set('Authorization', `Bearer ${otherTokens.accessToken}`)
      .expect(403);

    const persistedRequest = await context.prisma.professionalRequest.findUniqueOrThrow({
      where: { id: validationRequest.body.id },
    });

    expect(persistedRequest.status).toBe(ProfessionalRequestStatus.PENDING);
  });

  it('GET /admin/professionals/validation-requests forbids non-admin access', async () => {
    const professional = await createProfessionalUser();
    const tokens = await login(professional.email);

    await request(context.app.getHttpServer())
      .get('/admin/professionals/validation-requests')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(403);
  });

  describe('Availabilities', () => {
    it('POST /professionals/me/availabilities creates a new availability', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      const response = await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 1,
          startTime: '08:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
          slotDurationMinutes: 50,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        professionalId: professional.id,
        weekday: 1,
        startTime: '08:00',
        endTime: '12:00',
        recurrence: RecurrenceType.WEEKLY,
        slotDurationMinutes: 50,
        isActive: true,
      });
      expect(response.body).toHaveProperty('id');
    });

    it('POST /professionals/me/availabilities returns 400 for endTime <= startTime', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 2,
          startTime: '14:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(400);
    });

    it('POST /professionals/me/availabilities returns 409 for overlapping availability', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 3,
          startTime: '08:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 3,
          startTime: '10:00',
          endTime: '14:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(409);
    });

    it('GET /professionals/me/availabilities lists own availabilities', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 4,
          startTime: '09:00',
          endTime: '17:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(201);

      const response = await request(context.app.getHttpServer())
        .get('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        weekday: 4,
        startTime: '09:00',
        endTime: '17:00',
        isActive: true,
      });
    });

    it('GET /professionals/:userId/availabilities returns public availabilities', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 5,
          startTime: '08:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(201);

      const response = await request(context.app.getHttpServer())
        .get(`/professionals/${professional.id}/availabilities`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        professionalId: professional.id,
        weekday: 5,
        isActive: true,
      });
    });

    it('GET /professionals/:userId/available-slots returns computed slots for a future date', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 1,
          startTime: '08:00',
          endTime: '09:00',
          recurrence: RecurrenceType.WEEKLY,
          slotDurationMinutes: 30,
        })
        .expect(201);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + ((1 + 7 - futureDate.getDay()) % 7 || 7));
      const dateStr = futureDate.toISOString().slice(0, 10);

      const response = await request(context.app.getHttpServer())
        .get(`/professionals/${professional.id}/available-slots`)
        .query({ date: dateStr })
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      for (const slot of response.body) {
        expect(slot).toHaveProperty('startsAt');
        expect(slot).toHaveProperty('endsAt');
        expect(new Date(slot.startsAt) < new Date(slot.endsAt)).toBe(true);
      }
    });

    it('GET /professionals/:userId/available-slots returns 400 for a past date', async () => {
      const professional = await createProfessionalUser();

      await request(context.app.getHttpServer())
        .get(`/professionals/${professional.id}/available-slots`)
        .query({ date: '2020-01-01' })
        .expect(400);
    });

    it('GET /professionals/:userId/available-slots returns 400 for an invalid date', async () => {
      const professional = await createProfessionalUser();

      await request(context.app.getHttpServer())
        .get(`/professionals/${professional.id}/available-slots`)
        .query({ date: 'not-a-date' })
        .expect(400);
    });

    it('PATCH /professionals/me/availabilities/:id updates an availability', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      const created = await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 3,
          startTime: '08:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(201);

      const response = await request(context.app.getHttpServer())
        .patch(`/professionals/me/availabilities/${created.body.id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          startTime: '09:00',
          endTime: '13:00',
          slotDurationMinutes: 60,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        startTime: '09:00',
        endTime: '13:00',
        slotDurationMinutes: 60,
      });
    });

    it('PATCH /professionals/me/availabilities/:id returns 403 for non-owner', async () => {
      const firstProfessional = await createProfessionalUser();
      const secondProfessional = await createProfessionalUser();
      const firstTokens = await login(firstProfessional.email);
      const secondTokens = await login(secondProfessional.email);

      const created = await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${firstTokens.accessToken}`)
        .send({
          weekday: 3,
          startTime: '08:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .patch(`/professionals/me/availabilities/${created.body.id}`)
        .set('Authorization', `Bearer ${secondTokens.accessToken}`)
        .send({ startTime: '10:00' })
        .expect(403);
    });

    it('DELETE /professionals/me/availabilities/:id soft-deletes an availability', async () => {
      const professional = await createProfessionalUser();
      const tokens = await login(professional.email);

      const created = await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({
          weekday: 4,
          startTime: '08:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(201);

      const response = await request(context.app.getHttpServer())
        .delete(`/professionals/me/availabilities/${created.body.id}`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: created.body.id,
        isActive: false,
      });
    });

    it('DELETE /professionals/me/availabilities/:id returns 403 for non-owner', async () => {
      const firstProfessional = await createProfessionalUser();
      const secondProfessional = await createProfessionalUser();
      const firstTokens = await login(firstProfessional.email);
      const secondTokens = await login(secondProfessional.email);

      const created = await request(context.app.getHttpServer())
        .post('/professionals/me/availabilities')
        .set('Authorization', `Bearer ${firstTokens.accessToken}`)
        .send({
          weekday: 5,
          startTime: '08:00',
          endTime: '12:00',
          recurrence: RecurrenceType.WEEKLY,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .delete(`/professionals/me/availabilities/${created.body.id}`)
        .set('Authorization', `Bearer ${secondTokens.accessToken}`)
        .expect(403);
    });
  });
});
