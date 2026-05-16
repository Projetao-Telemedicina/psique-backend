import {
    AppointmentStatus,
    DiaryFeeling,
    DiarySleepQuality,
    Role,
} from '@prisma/client';
import request from 'supertest';
import {
    E2eAppContext,
    createAdminUser,
    createAuthToken,
    createE2eApp,
    createPatientUser,
    createProfessionalUser,
    resetDatabase,
} from './e2e-helpers';

describe('DiaryController (e2e)', () => {
  let context: E2eAppContext;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function setupUsers() {
    const patient = await createPatientUser(context.prisma);
    const professional = await createProfessionalUser(context.prisma);
    const admin = await createAdminUser(context.prisma);

    const patientToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });
    const professionalToken = await createAuthToken(context.app, context.prisma, {
      id: professional.id,
      role: Role.PROFESSIONAL,
    });
    const adminToken = await createAuthToken(context.app, context.prisma, {
      id: admin.id,
      role: Role.ADMIN,
    });

    return { patient, professional, admin, patientToken, professionalToken, adminToken };
  }

  async function createDiaryEntryInDb(
    patientId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return context.prisma.diaryEntry.create({
      data: {
        patientId,
        feeling: DiaryFeeling.CALM,
        sleepQuality: DiarySleepQuality.SIX_TO_EIGHT,
        symptom: 'Ansiedade leve',
        content: 'Registro de teste.',
        ...overrides,
      },
    });
  }

  async function createAppointmentInDb(
    patientId: string,
    professionalId: string,
    overrides: Record<string, unknown> = {},
  ) {
    return context.prisma.appointment.create({
      data: {
        patientId,
        professionalId,
        startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 49 * 60 * 60 * 1000),
        priceCents: 10000,
        googleCalendarEventId: 'google-event-id-123',
        meetLink: 'https://meet.google.com/test-abc-def',
        status: AppointmentStatus.SCHEDULED,
        ...overrides,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /diaries
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /diaries', () => {
    it('deve criar um registro de diario para o paciente', async () => {
      const { patientToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .post('/diaries')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          feeling: DiaryFeeling.HAPPY,
          sleepQuality: DiarySleepQuality.EIGHT_OR_MORE,
          symptom: 'Sem sintomas',
          content: 'Dia tranquilo.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        feeling: DiaryFeeling.HAPPY,
        sleepQuality: DiarySleepQuality.EIGHT_OR_MORE,
        symptom: 'Sem sintomas',
        content: 'Dia tranquilo.',
      });
      expect(response.body.id).toBeDefined();
    });

    it('deve retornar 401 quando nao autenticado', async () => {
      await request(context.app.getHttpServer())
        .post('/diaries')
        .send({ feeling: DiaryFeeling.CALM })
        .expect(401);
    });

    it('deve retornar 403 para profissional', async () => {
      const { professionalToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/diaries')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ feeling: DiaryFeeling.CALM })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /diaries
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /diaries', () => {
    it('deve retornar todos os registros para admin', async () => {
      const { patient, adminToken } = await setupUsers();

      await createDiaryEntryInDb(patient.id);
      await createDiaryEntryInDb(patient.id, { feeling: DiaryFeeling.SAD });

      const response = await request(context.app.getHttpServer())
        .get('/diaries')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('deve retornar 403 para nao-admin', async () => {
      const { patientToken, professionalToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get('/diaries')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      await request(context.app.getHttpServer())
        .get('/diaries')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });

    it('deve retornar lista vazia quando nao ha registros', async () => {
      const { adminToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .get('/diaries')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /diaries/me
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /diaries/me', () => {
    it('deve retornar registros do paciente autenticado', async () => {
      const { patient, patientToken } = await setupUsers();
      const otherPatient = await createPatientUser(context.prisma);

      await createDiaryEntryInDb(patient.id, { feeling: DiaryFeeling.ANXIOUS });
      await createDiaryEntryInDb(otherPatient.id, { feeling: DiaryFeeling.SAD });

      const response = await request(context.app.getHttpServer())
        .get('/diaries/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].patientId).toBe(patient.id);
    });

    it('deve filtrar por feeling', async () => {
      const { patient, patientToken } = await setupUsers();

      await createDiaryEntryInDb(patient.id, { feeling: DiaryFeeling.HAPPY });
      await createDiaryEntryInDb(patient.id, { feeling: DiaryFeeling.SAD });

      const response = await request(context.app.getHttpServer())
        .get('/diaries/me?feeling=HAPPY')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].feeling).toBe(DiaryFeeling.HAPPY);
    });

    it('deve filtrar por sleepQuality', async () => {
      const { patient, patientToken } = await setupUsers();

      await createDiaryEntryInDb(patient.id, {
        sleepQuality: DiarySleepQuality.EIGHT_OR_MORE,
      });
      await createDiaryEntryInDb(patient.id, {
        sleepQuality: DiarySleepQuality.LESS_THAN_FOUR,
      });

      const response = await request(context.app.getHttpServer())
        .get('/diaries/me?sleepQuality=LESS_THAN_FOUR')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].sleepQuality).toBe(
        DiarySleepQuality.LESS_THAN_FOUR,
      );
    });

    it('deve filtrar por periodo', async () => {
      const { patient, patientToken } = await setupUsers();

      const olderDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      await createDiaryEntryInDb(patient.id, { createdAt: olderDate });
      await createDiaryEntryInDb(patient.id, { createdAt: recentDate });

      const startDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
      const endDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

      const response = await request(context.app.getHttpServer())
        .get(
          `/diaries/me?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        )
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(new Date(response.body[0].createdAt).toISOString()).toBe(
        recentDate.toISOString(),
      );
    });

    it('deve retornar 401 quando nao autenticado', async () => {
      await request(context.app.getHttpServer()).get('/diaries/me').expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /diaries/patient/:patientId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /diaries/patient/:patientId', () => {
    it('deve retornar registros compartilhados quando ha vinculo', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      await context.prisma.patientProfile.update({
        where: { userId: patient.id },
        data: { shareDiaryWithProfessionals: true },
      });

      await createAppointmentInDb(patient.id, professional.id);
      await createDiaryEntryInDb(patient.id, { feeling: DiaryFeeling.HOPEFUL });

      const response = await request(context.app.getHttpServer())
        .get(`/diaries/patient/${patient.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].feeling).toBe(DiaryFeeling.HOPEFUL);
    });

    it('deve retornar 403 quando paciente nao compartilha', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .get(`/diaries/patient/${patient.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });

    it('deve retornar 403 quando nao ha vinculo de consulta', async () => {
      const { patient, professionalToken } = await setupUsers();

      await context.prisma.patientProfile.update({
        where: { userId: patient.id },
        data: { shareDiaryWithProfessionals: true },
      });

      await request(context.app.getHttpServer())
        .get(`/diaries/patient/${patient.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /diaries/sharing
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /diaries/sharing', () => {
    it('deve atualizar o compartilhamento do diario', async () => {
      const { patientToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .patch('/diaries/sharing')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ shareDiaryWithProfessionals: true })
        .expect(200);

      expect(response.body.shareDiaryWithProfessionals).toBe(true);
    });

    it('deve retornar 403 para profissional', async () => {
      const { professionalToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .patch('/diaries/sharing')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ shareDiaryWithProfessionals: true })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /diaries/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /diaries/:id', () => {
    it('deve retornar registro por id para admin', async () => {
      const { patient, adminToken } = await setupUsers();
      const diary = await createDiaryEntryInDb(patient.id);

      const response = await request(context.app.getHttpServer())
        .get(`/diaries/${diary.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.id).toBe(diary.id);
    });

    it('deve retornar 403 para paciente', async () => {
      const { patient, patientToken } = await setupUsers();
      const diary = await createDiaryEntryInDb(patient.id);

      await request(context.app.getHttpServer())
        .get(`/diaries/${diary.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /diaries/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /diaries/:id', () => {
    it('deve atualizar registro do paciente autenticado', async () => {
      const { patient, patientToken } = await setupUsers();
      const diary = await createDiaryEntryInDb(patient.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/diaries/${diary.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          feeling: DiaryFeeling.HOPEFUL,
          symptom: 'Sem sintomas',
        })
        .expect(200);

      expect(response.body.feeling).toBe(DiaryFeeling.HOPEFUL);
      expect(response.body.symptom).toBe('Sem sintomas');
    });

    it('deve retornar 403 para profissional', async () => {
      const { patient, professionalToken } = await setupUsers();
      const diary = await createDiaryEntryInDb(patient.id);

      await request(context.app.getHttpServer())
        .patch(`/diaries/${diary.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ feeling: DiaryFeeling.SAD })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /diaries/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /diaries/:id', () => {
    it('deve remover registro do paciente autenticado', async () => {
      const { patient, patientToken } = await setupUsers();
      const diary = await createDiaryEntryInDb(patient.id);

      await request(context.app.getHttpServer())
        .delete(`/diaries/${diary.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      const deleted = await context.prisma.diaryEntry.findUnique({
        where: { id: diary.id },
      });
      expect(deleted).toBeNull();
    });

    it('deve retornar 403 para profissional', async () => {
      const { patient, professionalToken } = await setupUsers();
      const diary = await createDiaryEntryInDb(patient.id);

      await request(context.app.getHttpServer())
        .delete(`/diaries/${diary.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });
  });
});
