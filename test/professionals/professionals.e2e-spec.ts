import request from 'supertest';
import {
  OnlineStatus,
  ProfessionalApprovalStatus,
  ProfessionalRequestStatus,
  Role,
  UserStatus,
} from '@prisma/client';
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
});
