import request from 'supertest';
import { Role } from '@prisma/client';
import { E2eAppContext, createE2eApp, resetDatabase } from './e2e-helpers.js';

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

  it('PATCH /patient/:userId/profile updates the patient profile', async () => {
    const patient = await createPatientUser();

    const response = await request(context.app.getHttpServer())
      .patch(`/patient/${patient.id}/profile`)
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

  it('PATCH /patient/:userId/profile returns 404 for a missing profile', async () => {
    await request(context.app.getHttpServer())
      .patch('/patient/0f0d6a8f-25fc-457e-a8fa-c3a43e3c8da1/profile')
      .send({
        emergencyContactName: 'Novo Contato',
      })
      .expect(404);
  });
});
