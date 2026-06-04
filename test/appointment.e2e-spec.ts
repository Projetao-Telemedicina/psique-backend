import { AppointmentCanceledBy, AppointmentStatus, Role } from '@prisma/client';
import request from 'supertest';
import {
    E2eAppContext,
    createAdminUser,
    createAuthToken,
    createE2eApp,
    createPatientUser,
    createProfessionalUser,
    mockGoogleCalendarService,
    resetDatabase,
} from './e2e-helpers';

describe('AppointmentController (e2e)', () => {
  let context: E2eAppContext;
  const NON_EXISTENT_UUID = '11111111-1111-4111-8111-111111111111';

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await context.app.close();
  });

  // ─── Helpers locais ─────────────────────────────────────────────────────────

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

  /** ISO string relativa ao momento atual */
  function futureDate(hoursFromNow: number): string {
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
  }

  /** Cria appointment diretamente no banco, sem chamar a API */
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
  // POST /appointments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /appointments', () => {
    it('deve criar consulta com meetLink e googleCalendarEventId', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
          priceCents: 15000,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        patientId: patient.id,
        professionalId: professional.id,
        status: AppointmentStatus.SCHEDULED,
        priceCents: 15000,
        meetLink: 'https://meet.google.com/test-abc-def',
        googleCalendarEventId: 'google-event-id-123',
      });

      expect(mockGoogleCalendarService.createAppointmentEvent).toHaveBeenCalledTimes(1);
      expect(mockGoogleCalendarService.createAppointmentEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          patientEmail: patient.email,
          professionalEmail: professional.email,
        }),
      );
    });

    it('deve criar consulta com priceCents zero quando omitido', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(201);

      expect(response.body.priceCents).toBe(0);
    });

    it('deve retornar 400 quando patientId está ausente', async () => {
      const { professional, patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(400);
    });

    it('deve retornar 400 quando endsAt é anterior a startsAt', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(49),
          endsAt: futureDate(48),
        })
        .expect(400);
    });

    it('deve retornar 400 quando endsAt é igual a startsAt', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const sameTime = futureDate(48);

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: sameTime,
          endsAt: sameTime,
        })
        .expect(400);
    });

    it('deve retornar 400 quando priceCents é negativo', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
          priceCents: -100,
        })
        .expect(400);
    });

    it('deve retornar 409 quando profissional tem conflito de horário', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      // consulta existente no mesmo horário
      await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(409);
    });

    it('deve retornar 409 quando paciente já tem consulta no mesmo horário com outro profissional', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const otherProfessional = await createProfessionalUser(context.prisma);

      await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: otherProfessional.id,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(409);
    });

    it('deve retornar 409 quando nova consulta se sobrepõe parcialmente', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 50 * 60 * 60 * 1000),
      });

      // começa antes e termina no meio
      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(47),
          endsAt: futureDate(49),
        })
        .expect(409);
    });

    it('deve retornar 404 quando paciente não existe', async () => {
      const { professional, patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: NON_EXISTENT_UUID,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(404);
    });

    it('deve retornar 404 quando profissional não existe', async () => {
      const { patient, patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: NON_EXISTENT_UUID,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(404);
    });

    it('deve retornar 401 quando não autenticado', async () => {
      const { patient, professional } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/appointments')
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(401);
    });

    it('não deve colidir com consultas canceladas no mesmo horário', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.CANCELED,
      });

      await request(context.app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          patientId: patient.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
        })
        .expect(201);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /appointments
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /appointments', () => {
    it('deve retornar todas as consultas para admin', async () => {
      const { patient, professional, adminToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id);
      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 73 * 60 * 60 * 1000),
      });

      const response = await request(context.app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('deve filtrar consultas por status', async () => {
      const { patient, professional, adminToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id);
      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 73 * 60 * 60 * 1000),
        status: AppointmentStatus.CANCELED,
      });

      const response = await request(context.app.getHttpServer())
        .get('/appointments?status=SCHEDULED')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe(AppointmentStatus.SCHEDULED);
    });

    it('deve retornar 403 para não-admin', async () => {
      const { patientToken, professionalToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      await request(context.app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });

    it('deve retornar lista vazia quando não há consultas', async () => {
      const { adminToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /appointments/me/upcoming
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /appointments/me/upcoming', () => {
    it('deve retornar consultas futuras do paciente com dados do profissional', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/upcoming')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].patientId).toBe(patient.id);
      expect(response.body[0].professional).toBeDefined();
      expect(response.body[0].professional.user.name).toBeDefined();
    });

    it('deve retornar consultas futuras do profissional com dados do paciente', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/upcoming')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].professionalId).toBe(professional.id);
      expect(response.body[0].patient).toBeDefined();
    });

    it('não deve retornar consultas passadas em upcoming', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
      });

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/upcoming')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('não deve retornar consultas canceladas em upcoming', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.CANCELED,
      });

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/upcoming')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('deve incluir consultas com status RESCHEDULE_REQUESTED em upcoming', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/upcoming')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('deve retornar lista vazia quando não há consultas futuras', async () => {
      const { patientToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/upcoming')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /appointments/me/history
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /appointments/me/history', () => {
    it('deve retornar histórico de consultas concluídas do paciente', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
      });

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/history')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe(AppointmentStatus.COMPLETED);
    });

    it('deve incluir consultas CANCELED e NO_SHOW no histórico', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        status: AppointmentStatus.CANCELED,
      });
      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        status: AppointmentStatus.NO_SHOW,
      });

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/history')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
    });

    it('deve paginar o histórico corretamente', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      for (let i = 1; i <= 3; i++) {
        await createAppointmentInDb(patient.id, professional.id, {
          startsAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
          endsAt: new Date(Date.now() - i * 60 * 60 * 1000),
          status: AppointmentStatus.COMPLETED,
        });
      }

      const page1 = await request(context.app.getHttpServer())
        .get('/appointments/me/history?page=1&limit=2')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      const page2 = await request(context.app.getHttpServer())
        .get('/appointments/me/history?page=2&limit=2')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(page1.body).toHaveLength(2);
      expect(page2.body).toHaveLength(1);

      // IDs devem ser distintos entre páginas
      const ids1 = page1.body.map((a: { id: string }) => a.id);
      const ids2 = page2.body.map((a: { id: string }) => a.id);
      expect(ids1).not.toEqual(expect.arrayContaining(ids2));
    });

    it('não deve incluir consultas SCHEDULED no histórico', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .get('/appointments/me/history')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /appointments/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /appointments/:id', () => {
    it('deve retornar a consulta pelo id', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .get(`/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.id).toBe(appointment.id);
      expect(response.body.meetLink).toBe('https://meet.google.com/test-abc-def');
    });

    it('deve retornar 404 quando consulta não existe', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get(`/appointments/${NON_EXISTENT_UUID}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('deve retornar 400 para UUID inválido', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get('/appointments/nao-e-um-uuid')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /appointments/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /appointments/:id', () => {
    it('deve atualizar campos da consulta', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          startsAt: futureDate(72),
          endsAt: futureDate(73),
          priceCents: 20000,
        })
        .expect(200);

      expect(response.body.priceCents).toBe(20000);
    });

    it('deve retornar 404 quando consulta não existe', async () => {
      const { adminToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .patch(`/appointments/${NON_EXISTENT_UUID}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ priceCents: 20000 })
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /appointments/:id/status
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /appointments/:id/status', () => {
    it('deve permitir admin atualizar o status', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: AppointmentStatus.COMPLETED })
        .expect(200);

      expect(response.body.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('deve retornar 400 para status inválido', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'INVALID_STATUS' })
        .expect(400);
    });

    it('deve retornar 403 para paciente e profissional', async () => {
      const { patient, professional, patientToken, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ status: AppointmentStatus.COMPLETED })
        .expect(403);

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ status: AppointmentStatus.COMPLETED })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /appointments/:id/complete
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /appointments/:id/complete', () => {
    it('deve marcar consulta como concluída pelo profissional', async () => {
      const { patient, professional, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/complete`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(response.body.status).toBe(AppointmentStatus.COMPLETED);
      expect(response.body.completedAt).toBeTruthy();
    });

    it('deve permitir admin marcar como concluída', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/complete`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.status).toBe(AppointmentStatus.COMPLETED);
    });

    it('deve retornar 400 quando status não é SCHEDULED', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      for (const status of [AppointmentStatus.CANCELED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW]) {
        const appointment = await createAppointmentInDb(patient.id, professional.id, { status });

        await request(context.app.getHttpServer())
          .patch(`/appointments/${appointment.id}/complete`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .expect(400);
      }
    });

    it('deve retornar 403 para paciente', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/complete`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /appointments/:id/no-show
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /appointments/:id/no-show', () => {
    it('deve marcar como no-show quando a consulta já encerrou', async () => {
      const { patient, professional, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/no-show`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(response.body.status).toBe(AppointmentStatus.NO_SHOW);
    });

    it('deve retornar 400 quando a consulta ainda não terminou', async () => {
      const { patient, professional, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/no-show`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(400);
    });

    it('deve retornar 400 quando status não é SCHEDULED', async () => {
      const { patient, professional, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        status: AppointmentStatus.CANCELED,
      });

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/no-show`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(400);
    });

    it('deve retornar 403 para paciente', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      });

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/no-show`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /appointments/:id/cancel
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /appointments/:id/cancel', () => {
    it('deve permitir paciente cancelar com mais de 24h de antecedência', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          canceledBy: AppointmentCanceledBy.PATIENT,
          cancellationReason: 'Motivo de teste',
        })
        .expect(200);

      expect(response.body.status).toBe(AppointmentStatus.CANCELED);
      expect(response.body.canceledBy).toBe(AppointmentCanceledBy.PATIENT);
      expect(response.body.cancellationReason).toBe('Motivo de teste');
      expect(response.body.canceledAt).toBeTruthy();
    });

    it('deve retornar 400 quando paciente cancela com menos de 24h', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 13 * 60 * 60 * 1000),
      });

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ canceledBy: AppointmentCanceledBy.PATIENT })
        .expect(400);
    });

    it('deve permitir profissional cancelar em qualquer momento', async () => {
      const { patient, professional, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 12 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 13 * 60 * 60 * 1000),
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ canceledBy: AppointmentCanceledBy.PROFESSIONAL })
        .expect(200);

      expect(response.body.status).toBe(AppointmentStatus.CANCELED);
      expect(response.body.canceledBy).toBe(AppointmentCanceledBy.PROFESSIONAL);
    });

    it('deve permitir admin cancelar em qualquer momento', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canceledBy: AppointmentCanceledBy.ADMIN })
        .expect(200);

      expect(response.body.status).toBe(AppointmentStatus.CANCELED);
    });

    it('deve retornar 400 quando consulta já está concluída', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.COMPLETED,
      });

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canceledBy: AppointmentCanceledBy.ADMIN })
        .expect(400);
    });

    it('deve retornar 400 quando consulta já está cancelada', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.CANCELED,
      });

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canceledBy: AppointmentCanceledBy.ADMIN })
        .expect(400);
    });

    it('deve chamar deleteAppointmentEvent com o eventId correto', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        googleCalendarEventId: 'specific-event-id',
      });

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canceledBy: AppointmentCanceledBy.ADMIN })
        .expect(200);

      expect(mockGoogleCalendarService.deleteAppointmentEvent).toHaveBeenCalledTimes(1);
      expect(mockGoogleCalendarService.deleteAppointmentEvent).toHaveBeenCalledWith(
        'specific-event-id',
      );
    });

    it('não deve chamar deleteAppointmentEvent quando não há googleCalendarEventId', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        googleCalendarEventId: null,
      });

      await request(context.app.getHttpServer())
        .patch(`/appointments/${appointment.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canceledBy: AppointmentCanceledBy.ADMIN })
        .expect(200);

      expect(mockGoogleCalendarService.deleteAppointmentEvent).not.toHaveBeenCalled();
    });

    it('deve retornar 404 quando consulta não existe', async () => {
      const { adminToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .patch(`/appointments/${NON_EXISTENT_UUID}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ canceledBy: AppointmentCanceledBy.ADMIN })
        .expect(404);
    });
  });
});