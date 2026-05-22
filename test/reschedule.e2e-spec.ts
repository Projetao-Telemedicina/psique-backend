import {
    AppointmentCanceledBy,
    AppointmentStatus,
    RescheduleRequestStatus,
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
    mockGoogleCalendarService,
    resetDatabase,
} from './e2e-helpers';

describe('RescheduleController (e2e)', () => {
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
    const otherPatient = await createPatientUser(context.prisma);

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
    const otherToken = await createAuthToken(context.app, context.prisma, {
      id: otherPatient.id,
      role: Role.PATIENT,
    });

    return {
      patient,
      professional,
      admin,
      otherPatient,
      patientToken,
      professionalToken,
      adminToken,
      otherToken,
    };
  }

  function futureDate(hoursFromNow: number): string {
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
  }

  /** Cria appointment diretamente no banco */
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

  /** Cria reschedule request diretamente no banco */
  async function createRescheduleRequestInDb(
    appointmentId: string,
    requestedBy: string,
    overrides: Record<string, unknown> = {},
  ) {
    return context.prisma.appointmentRescheduleRequest.create({
      data: {
        appointmentId,
        requestedBy,
        status: RescheduleRequestStatus.PENDING,
        suggestedStartsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        suggestedEndsAt: new Date(Date.now() + 73 * 60 * 60 * 1000),
        patientConfirmed: true,
        professionalConfirmed: null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ...overrides,
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /reschedules
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /reschedules', () => {
    it('deve criar solicitação de reagendamento pelo paciente', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointmentId: appointment.id,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
        })
        .expect(201);

      expect(response.body).toMatchObject({
        appointmentId: appointment.id,
        requestedBy: patient.id,
        status: RescheduleRequestStatus.PENDING,
        patientConfirmed: true,
        professionalConfirmed: null,
      });

      // Consulta deve mudar para RESCHEDULE_REQUESTED
      const updated = await context.prisma.appointment.findUnique({
        where: { id: appointment.id },
      });
      expect(updated?.status).toBe(AppointmentStatus.RESCHEDULE_REQUESTED);
    });

    it('deve criar solicitação de reagendamento pelo profissional', async () => {
      const { patient, professional, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({
          appointmentId: appointment.id,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
        })
        .expect(201);

      expect(response.body).toMatchObject({
        professionalConfirmed: true,
        patientConfirmed: null,
      });
    });

    it('deve usar expiresAt customizado quando fornecido', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);
      const customExpiry = futureDate(12);

      const response = await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointmentId: appointment.id,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
          expiresAt: customExpiry,
        })
        .expect(201);

      expect(new Date(response.body.expiresAt).toISOString()).toBe(
        new Date(customExpiry).toISOString(),
      );
    });

    it('deve retornar 403 quando terceiro tenta reagendar', async () => {
      const { patient, professional, otherToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${otherToken}`)
        .send({
          appointmentId: appointment.id,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
        })
        .expect(403);
    });

    it('deve retornar 400 quando consulta não está SCHEDULED', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      for (const status of [AppointmentStatus.CANCELED, AppointmentStatus.COMPLETED, AppointmentStatus.RESCHEDULE_REQUESTED]) {
        const appointment = await createAppointmentInDb(patient.id, professional.id, { status });

        await request(context.app.getHttpServer())
          .post('/reschedules')
          .set('Authorization', `Bearer ${patientToken}`)
          .send({
            appointmentId: appointment.id,
            suggestedStartsAt: futureDate(72),
            suggestedEndsAt: futureDate(73),
          })
          .expect(400);
      }
    });

    it('deve retornar 400 quando faltam menos de 8 horas para a consulta', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 5 * 60 * 60 * 1000),
      });

      await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointmentId: appointment.id,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
        })
        .expect(400);
    });

    it('deve retornar 400 quando suggestedEndsAt é anterior a suggestedStartsAt', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointmentId: appointment.id,
          suggestedStartsAt: futureDate(73),
          suggestedEndsAt: futureDate(72),
        })
        .expect(400);
    });

    it('deve retornar 409 quando profissional já tem consulta no horário sugerido', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      // Outra consulta no horário sugerido
      await createAppointmentInDb(patient.id, professional.id, {
        startsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 73 * 60 * 60 * 1000),
      });

      await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointmentId: appointment.id,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
        })
        .expect(409);
    });

    it('deve retornar 404 quando consulta não existe', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/reschedules')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          appointmentId: NON_EXISTENT_UUID,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
        })
        .expect(404);
    });

    it('deve retornar 401 quando não autenticado', async () => {
      await request(context.app.getHttpServer())
        .post('/reschedules')
        .send({
          appointmentId: NON_EXISTENT_UUID,
          suggestedStartsAt: futureDate(72),
          suggestedEndsAt: futureDate(73),
        })
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /reschedules
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /reschedules', () => {
    it('deve retornar todas as solicitações para admin', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      await createRescheduleRequestInDb(appointment.id, patient.id);

      const response = await request(context.app.getHttpServer())
        .get('/reschedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('deve retornar 403 para paciente', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get('/reschedules')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('deve retornar 403 para profissional', async () => {
      const { professionalToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get('/reschedules')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });

    it('deve retornar lista vazia quando não há solicitações', async () => {
      const { adminToken } = await setupUsers();

      const response = await request(context.app.getHttpServer())
        .get('/reschedules')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /reschedules/me
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /reschedules/me', () => {
    it('deve retornar solicitações do paciente autenticado', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      await createRescheduleRequestInDb(appointment.id, patient.id);

      const response = await request(context.app.getHttpServer())
        .get('/reschedules/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].appointment).toBeDefined();
      expect(response.body[0].appointment.status).toBeDefined();
    });

    it('deve retornar solicitações do profissional autenticado', async () => {
      const { patient, professional, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      await createRescheduleRequestInDb(appointment.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .get('/reschedules/me')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
    });

    it('não deve retornar solicitações de outros usuários', async () => {
      const { patient, professional, otherToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      await createRescheduleRequestInDb(appointment.id, patient.id);

      const response = await request(context.app.getHttpServer())
        .get('/reschedules/me')
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /reschedules/appointment/:appointmentId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /reschedules/appointment/:appointmentId', () => {
    it('deve retornar solicitações vinculadas à consulta', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      await createRescheduleRequestInDb(appointment.id, patient.id);

      const response = await request(context.app.getHttpServer())
        .get(`/reschedules/appointment/${appointment.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].appointmentId).toBe(appointment.id);
    });

    it('deve retornar 404 quando consulta não existe', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get(`/reschedules/appointment/${NON_EXISTENT_UUID}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('deve retornar lista vazia quando não há solicitações para a consulta', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);

      const response = await request(context.app.getHttpServer())
        .get(`/reschedules/appointment/${appointment.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /reschedules/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /reschedules/:id', () => {
    it('deve retornar solicitação pelo id', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id);

      const response = await request(context.app.getHttpServer())
        .get(`/reschedules/${reschedule.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.id).toBe(reschedule.id);
    });

    it('deve retornar 404 quando solicitação não existe', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get(`/reschedules/${NON_EXISTENT_UUID}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(404);
    });

    it('deve retornar 400 para UUID inválido', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get('/reschedules/nao-e-uuid')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /reschedules/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /reschedules/:id', () => {
    it('deve permitir admin atualizar campos da solicitação', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id);

      const newStartsAt = futureDate(96);
      const newEndsAt = futureDate(97);

      const response = await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ suggestedStartsAt: newStartsAt, suggestedEndsAt: newEndsAt })
        .expect(200);

      expect(new Date(response.body.suggestedStartsAt).toISOString()).toBe(
        new Date(newStartsAt).toISOString(),
      );
    });

    it('deve retornar 403 para não-admin', async () => {
      const { patient, professional, patientToken, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id);

      await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ suggestedStartsAt: futureDate(96) })
        .expect(403);

      await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ suggestedStartsAt: futureDate(96) })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /reschedules/:id/confirm
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /reschedules/:id/confirm', () => {
    it('deve aceitar reagendamento quando ambos confirmam e atualizar o Calendar', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      // Paciente já confirmou, profissional precisa confirmar
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id, {
        patientConfirmed: true,
        professionalConfirmed: null,
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}/confirm`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ confirmed: true })
        .expect(200);

      expect(response.body.message).toBe('Reagendamento confirmado com sucesso.');

      // Valida estado no banco
      const updatedReschedule = await context.prisma.appointmentRescheduleRequest.findUnique({
        where: { id: reschedule.id },
      });
      expect(updatedReschedule?.status).toBe(RescheduleRequestStatus.ACCEPTED);

      const updatedAppointment = await context.prisma.appointment.findUnique({
        where: { id: appointment.id },
      });
      expect(updatedAppointment?.status).toBe(AppointmentStatus.SCHEDULED);
      expect(updatedAppointment?.startsAt).toEqual(reschedule.suggestedStartsAt);
      expect(updatedAppointment?.endsAt).toEqual(reschedule.suggestedEndsAt);

      // Calendar deve ser atualizado
      expect(mockGoogleCalendarService.updateAppointmentEvent).toHaveBeenCalledTimes(1);
      expect(mockGoogleCalendarService.updateAppointmentEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: 'google-event-id-123',
          startsAt: reschedule.suggestedStartsAt,
          endsAt: reschedule.suggestedEndsAt,
        }),
      );
    });

    it('deve rejeitar quando paciente recusa e restaurar status original', async () => {
      const { patient, professional, patientToken } = await setupUsers();

      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      const reschedule = await createRescheduleRequestInDb(appointment.id, professional.id, {
        patientConfirmed: null,
        professionalConfirmed: true,
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}/confirm`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ confirmed: false })
        .expect(200);

      expect(response.body.message).toContain('Reagendamento recusado');

      const updatedReschedule = await context.prisma.appointmentRescheduleRequest.findUnique({
        where: { id: reschedule.id },
      });
      expect(updatedReschedule?.status).toBe(RescheduleRequestStatus.REJECTED);

      const updatedAppointment = await context.prisma.appointment.findUnique({
        where: { id: appointment.id },
      });
      expect(updatedAppointment?.status).toBe(AppointmentStatus.SCHEDULED);

      // Calendar NÃO deve ser atualizado em caso de rejeição
      expect(mockGoogleCalendarService.updateAppointmentEvent).not.toHaveBeenCalled();
    });

    it('deve rejeitar quando profissional recusa', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id, {
        patientConfirmed: true,
        professionalConfirmed: null,
      });

      const response = await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}/confirm`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ confirmed: false })
        .expect(200);

      expect(response.body.message).toContain('Reagendamento recusado');
    });

    it('não deve atualizar Calendar quando há googleCalendarEventId nulo e ambos confirmam', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
        googleCalendarEventId: null,
      });
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id, {
        patientConfirmed: true,
        professionalConfirmed: null,
      });

      await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}/confirm`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ confirmed: true })
        .expect(200);

      expect(mockGoogleCalendarService.updateAppointmentEvent).not.toHaveBeenCalled();
    });

    it('deve retornar 400 quando solicitação não está PENDING', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      const appointment = await createAppointmentInDb(patient.id, professional.id);

      for (const status of [RescheduleRequestStatus.ACCEPTED, RescheduleRequestStatus.REJECTED, RescheduleRequestStatus.EXPIRED]) {
        const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id, { status });

        await request(context.app.getHttpServer())
          .patch(`/reschedules/${reschedule.id}/confirm`)
          .set('Authorization', `Bearer ${professionalToken}`)
          .send({ confirmed: true })
          .expect(400);
      }
    });

    it('deve retornar 400 quando solicitação já expirou', async () => {
      const { patient, professional, professionalToken } = await setupUsers();

      const appointment = await createAppointmentInDb(patient.id, professional.id);
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id, {
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // expirou 1h atrás
      });

      await request(context.app.getHttpServer())
        .patch(`/reschedules/${reschedule.id}/confirm`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ confirmed: true })
        .expect(400);
    });

    it('deve retornar 404 quando solicitação não existe', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .patch(`/reschedules/${NON_EXISTENT_UUID}/confirm`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ confirmed: true })
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /reschedules/expire
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /reschedules/expire', () => {
    it('deve expirar solicitações vencidas, cancelar consultas e deletar eventos do Calendar', async () => {
      const { patient, professional, adminToken } = await setupUsers();

      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id, {
        expiresAt: new Date(Date.now() - 1 * 60 * 60 * 1000), // expirado
      });

      await request(context.app.getHttpServer())
        .post('/reschedules/expire')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const updatedReschedule = await context.prisma.appointmentRescheduleRequest.findUnique({
        where: { id: reschedule.id },
      });
      expect(updatedReschedule?.status).toBe(RescheduleRequestStatus.EXPIRED);

      const updatedAppointment = await context.prisma.appointment.findUnique({
        where: { id: appointment.id },
      });
      expect(updatedAppointment?.status).toBe(AppointmentStatus.CANCELED);
      expect(updatedAppointment?.canceledBy).toBe(AppointmentCanceledBy.SYSTEM);
      expect(updatedAppointment?.canceledAt).toBeTruthy();
      expect(updatedAppointment?.cancellationReason).toBeTruthy();

      expect(mockGoogleCalendarService.deleteAppointmentEvent).toHaveBeenCalledTimes(1);
      expect(mockGoogleCalendarService.deleteAppointmentEvent).toHaveBeenCalledWith(
        'google-event-id-123',
      );
    });

    it('não deve afetar solicitações ainda válidas', async () => {
      const { patient, professional, adminToken } = await setupUsers();

      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.RESCHEDULE_REQUESTED,
      });
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id, {
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // expira no futuro
      });

      await request(context.app.getHttpServer())
        .post('/reschedules/expire')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      const unchanged = await context.prisma.appointmentRescheduleRequest.findUnique({
        where: { id: reschedule.id },
      });
      expect(unchanged?.status).toBe(RescheduleRequestStatus.PENDING);
      expect(mockGoogleCalendarService.deleteAppointmentEvent).not.toHaveBeenCalled();
    });

    it('deve processar múltiplas solicitações expiradas de uma vez', async () => {
      const { patient, professional, adminToken } = await setupUsers();

      for (let i = 0; i < 3; i++) {
        const appointment = await createAppointmentInDb(patient.id, professional.id, {
          startsAt: new Date(Date.now() + (48 + i) * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + (49 + i) * 60 * 60 * 1000),
          status: AppointmentStatus.RESCHEDULE_REQUESTED,
        });
        await createRescheduleRequestInDb(appointment.id, patient.id, {
          expiresAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000),
        });
      }

      await request(context.app.getHttpServer())
        .post('/reschedules/expire')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(201);

      expect(mockGoogleCalendarService.deleteAppointmentEvent).toHaveBeenCalledTimes(3);
    });

    it('deve retornar 403 para não-admin', async () => {
      const { patientToken, professionalToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post('/reschedules/expire')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      await request(context.app.getHttpServer())
        .post('/reschedules/expire')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /reschedules/:id
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /reschedules/:id', () => {
    it('deve deletar solicitação de reagendamento', async () => {
      const { patient, professional, adminToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id);

      await request(context.app.getHttpServer())
        .delete(`/reschedules/${reschedule.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const deleted = await context.prisma.appointmentRescheduleRequest.findUnique({
        where: { id: reschedule.id },
      });
      expect(deleted).toBeNull();
    });

    it('deve retornar 404 quando solicitação não existe', async () => {
      const { adminToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .delete('/reschedules/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('deve retornar 403 para não-admin', async () => {
      const { patient, professional, patientToken, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id);
      const reschedule = await createRescheduleRequestInDb(appointment.id, patient.id);

      await request(context.app.getHttpServer())
        .delete(`/reschedules/${reschedule.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      await request(context.app.getHttpServer())
        .delete(`/reschedules/${reschedule.id}`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(403);
    });
  });
});