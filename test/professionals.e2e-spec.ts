import request from 'supertest';
import {
  OnlineStatus,
  ProfessionalApprovalStatus,
  Role,
} from '@prisma/client';
import { E2eAppContext, createE2eApp, resetDatabase } from './e2e-helpers.js';

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

  it('PATCH /professionals/:userId updates the professional profile', async () => {
    const professional = await createProfessionalUser();

    const response = await request(context.app.getHttpServer())
      .patch(`/professionals/${professional.id}`)
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

  it('GET /professionals/:userId returns 404 for a missing profile', async () => {
    await request(context.app.getHttpServer())
      .get('/professionals/0f0d6a8f-25fc-457e-a8fa-c3a43e3c8da1')
      .expect(404);
  });
});
