import request from 'supertest';
import {
  OnlineStatus,
  ProfessionalApprovalStatus,
  Role,
} from '@prisma/client';
import { E2eAppContext, createE2eApp, resetDatabase } from '../e2e-helpers';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

describe('ProfessionalsController (e2e)', () => {
  let context: E2eAppContext;
  let sequence = 0;

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
          approvalStatus: ProfessionalApprovalStatus.PENDING,
          onlineStatus: OnlineStatus.OFFLINE,
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
        approvalStatus: ProfessionalApprovalStatus.APPROVED,
        onlineStatus: OnlineStatus.ONLINE,
        availableForEmergency: true,
        autoAbsenceMessage: 'Em atendimento no momento',
        gapBetweenAppointmentsMinutes: 30,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: professional.id,
      specialty: 'Terapia Cognitivo-Comportamental',
      approvalStatus: ProfessionalApprovalStatus.APPROVED,
      onlineStatus: OnlineStatus.ONLINE,
      availableForEmergency: true,
      autoAbsenceMessage: 'Em atendimento no momento',
      gapBetweenAppointmentsMinutes: 30,
    });
  });

  it('PATCH /professionals/admin/:userId lets an admin update any professional profile', async () => {
    const professional = await createProfessionalUser();
    const admin = await createAdminUser();
    const adminTokens = await login(admin.email);

    const response = await request(context.app.getHttpServer())
      .patch(`/professionals/admin/${professional.id}`)
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

  it('PATCH /professionals/admin/:userId forbids a professional from updating another professional profile', async () => {
    const firstProfessional = await createProfessionalUser();
    const secondProfessional = await createProfessionalUser();
    const secondTokens = await login(secondProfessional.email);

    await request(context.app.getHttpServer())
      .patch(`/professionals/admin/${firstProfessional.id}`)
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

  it('PATCH /professionals/admin/:userId/online-mode lets an admin update any professional status', async () => {
    const professional = await createProfessionalUser();
    const admin = await createAdminUser();
    const adminTokens = await login(admin.email);

    const response = await request(context.app.getHttpServer())
      .patch(`/professionals/admin/${professional.id}/online-mode`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ onlineMode: OnlineStatus.ONLINE })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: professional.id,
      onlineStatus: OnlineStatus.ONLINE,
    });
  });

  it('PATCH /professionals/admin/:userId/online-mode forbids a professional from updating another professional status', async () => {
    const firstProfessional = await createProfessionalUser();
    const secondProfessional = await createProfessionalUser();
    const secondTokens = await login(secondProfessional.email);

    await request(context.app.getHttpServer())
      .patch(`/professionals/admin/${firstProfessional.id}/online-mode`)
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
});
