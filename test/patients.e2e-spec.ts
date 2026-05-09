import request from 'supertest';
import { Role } from '@prisma/client';
import { E2eAppContext, createE2eApp, resetDatabase } from './e2e-helpers';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

describe('PatientsController (e2e)', () => {
  let context: E2eAppContext;
  let sequence = 0;

  const nextEmail = () => `patient-${Date.now()}-${++sequence}@example.com`;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function createPatientUser() {
    const response = await request(context.app.getHttpServer())
      .post('/users')
      .send({
        name: 'Marina Costa',
        email: nextEmail(),
        password: 'Password123',
        role: Role.PATIENT,
        patientProfile: {
          emergencyContactName: 'Pedro Costa',
          emergencyContactPhone: '85977776666',
          shareDiaryWithProfessionals: false,
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

  it('GET /patient/:userId/profile returns the patient profile with user data', async () => {
    const patient = await createPatientUser();

    const response = await request(context.app.getHttpServer())
      .get(`/patient/${patient.id}/profile`)
      .expect(200);

    expect(response.body).toMatchObject({
      userId: patient.id,
      emergencyContactName: 'Pedro Costa',
      emergencyContactPhone: '85977776666',
      shareDiaryWithProfessionals: false,
      user: {
        name: 'Marina Costa',
        email: patient.email,
        role: Role.PATIENT,
      },
    });
  });

  it('PATCH /patient/me/profile lets a patient update their own profile', async () => {
    const patient = await createPatientUser();
    const tokens = await login(patient.email);

    const response = await request(context.app.getHttpServer())
      .patch('/patient/me/profile')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({
        emergencyContactName: 'Larissa Costa',
        emergencyContactPhone: '85966665555',
        shareDiaryWithProfessionals: true,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: patient.id,
      emergencyContactName: 'Larissa Costa',
      emergencyContactPhone: '85966665555',
      shareDiaryWithProfessionals: true,
    });
  });

  it('PATCH /patient/admin/:userId/profile lets an admin update any patient profile', async () => {
    const patient = await createPatientUser();
    const admin = await createAdminUser();
    const adminTokens = await login(admin.email);

    const response = await request(context.app.getHttpServer())
      .patch(`/patient/admin/${patient.id}/profile`)
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({
        emergencyContactName: 'Contato Admin',
        shareDiaryWithProfessionals: true,
      })
      .expect(200);

    expect(response.body).toMatchObject({
      userId: patient.id,
      emergencyContactName: 'Contato Admin',
      shareDiaryWithProfessionals: true,
    });
  });

  it('PATCH /patient/admin/:userId/profile forbids a patient from updating another patient profile', async () => {
    const firstPatient = await createPatientUser();
    const secondPatient = await createPatientUser();
    const secondTokens = await login(secondPatient.email);

    await request(context.app.getHttpServer())
      .patch(`/patient/admin/${firstPatient.id}/profile`)
      .set('Authorization', `Bearer ${secondTokens.accessToken}`)
      .send({
        emergencyContactName: 'Tentativa Indevida',
      })
      .expect(403);

    const persistedProfile = await request(context.app.getHttpServer())
      .get(`/patient/${firstPatient.id}/profile`)
      .expect(200);

    expect(persistedProfile.body).toMatchObject({
      userId: firstPatient.id,
      emergencyContactName: 'Pedro Costa',
      emergencyContactPhone: '85977776666',
      shareDiaryWithProfessionals: false,
    });
  });

  it('PATCH /patient/admin/:userId/profile returns 404 for a missing profile', async () => {
    const admin = await createAdminUser();
    const tokens = await login(admin.email);

    await request(context.app.getHttpServer())
      .patch('/patient/admin/0f0d6a8f-25fc-457e-a8fa-c3a43e3c8da1/profile')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .send({
        emergencyContactName: 'Novo Contato',
      })
      .expect(404);
  });
});

