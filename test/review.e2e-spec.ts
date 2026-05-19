import { AppointmentStatus, Role } from '@prisma/client';
import request from 'supertest';
import {
    E2eAppContext,
    createAuthToken,
    createE2eApp,
    createPatientUser,
    createProfessionalUser,
    resetDatabase,
} from './e2e-helpers';

describe('ReviewController (e2e)', () => {
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

  async function setupUsers() {
    const patient = await createPatientUser(context.prisma);
    const professional = await createProfessionalUser(context.prisma);
    const otherPatient = await createPatientUser(context.prisma);

    const patientToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    const professionalToken = await createAuthToken(context.app, context.prisma, {
      id: professional.id,
      role: Role.PROFESSIONAL,
    });

    const otherPatientToken = await createAuthToken(context.app, context.prisma, {
      id: otherPatient.id,
      role: Role.PATIENT,
    });

    return {
      patient,
      professional,
      otherPatient,
      patientToken,
      professionalToken,
      otherPatientToken,
    };
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
  // POST /appointments/:id/review
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /appointments/:id/review', () => {
    it('deve criar avaliacao quando consulta esta concluida', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      });

      const response = await request(context.app.getHttpServer())
        .post(`/appointments/${appointment.id}/review`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          rating: 4,
          comment: 'Atendimento excelente.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        appointmentId: appointment.id,
        patientId: patient.id,
        professionalId: professional.id,
        rating: 4,
        comment: 'Atendimento excelente.',
      });

      const updatedProfessional = await context.prisma.professionalProfile.findUnique({
        where: { userId: professional.id },
        select: { scoreAvg: true, reviewCount: true },
      });

      expect(updatedProfessional?.reviewCount).toBe(1);
      expect(Number(updatedProfessional?.scoreAvg)).toBeCloseTo(4, 5);
    });

    it('deve retornar 400 quando consulta nao esta concluida', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.SCHEDULED,
      });

      await request(context.app.getHttpServer())
        .post(`/appointments/${appointment.id}/review`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ rating: 5 })
        .expect(400);
    });

    it('deve retornar 403 quando paciente nao e o dono da consulta', async () => {
      const { patient, professional, otherPatientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      });

      await request(context.app.getHttpServer())
        .post(`/appointments/${appointment.id}/review`)
        .set('Authorization', `Bearer ${otherPatientToken}`)
        .send({ rating: 5 })
        .expect(403);
    });

    it('deve retornar 404 quando consulta nao existe', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post(`/appointments/${NON_EXISTENT_UUID}/review`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ rating: 5 })
        .expect(404);
    });

    it('deve retornar 401 quando nao autenticado', async () => {
      await request(context.app.getHttpServer())
        .post(`/appointments/${NON_EXISTENT_UUID}/review`)
        .send({ rating: 5 })
        .expect(401);
    });

    it('deve retornar 403 quando profissional tenta avaliar', async () => {
      const { professionalToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .post(`/appointments/${NON_EXISTENT_UUID}/review`)
        .set('Authorization', `Bearer ${professionalToken}`)
        .send({ rating: 5 })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /professionals/me/reviews
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /professionals/me/reviews', () => {
    it('deve retornar as avaliacoes do profissional autenticado', async () => {
      const { patient, professional, patientToken, professionalToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      });

      await request(context.app.getHttpServer())
        .post(`/appointments/${appointment.id}/review`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ rating: 5, comment: 'Otimo atendimento.' })
        .expect(201);

      const response = await request(context.app.getHttpServer())
        .get('/professionals/me/reviews')
        .set('Authorization', `Bearer ${professionalToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        professionalId: professional.id,
        appointmentId: appointment.id,
        rating: 5,
      });
    });

    it('deve retornar 403 para paciente', async () => {
      const { patientToken } = await setupUsers();

      await request(context.app.getHttpServer())
        .get('/professionals/me/reviews')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);
    });

    it('deve retornar 401 quando nao autenticado', async () => {
      await request(context.app.getHttpServer())
        .get('/professionals/me/reviews')
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /professionals/:userId/reviews
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /professionals/:userId/reviews', () => {
    it('deve retornar lista publica de avaliacoes do profissional', async () => {
      const { patient, professional, patientToken } = await setupUsers();
      const appointment = await createAppointmentInDb(patient.id, professional.id, {
        status: AppointmentStatus.COMPLETED,
        completedAt: new Date(),
      });

      await request(context.app.getHttpServer())
        .post(`/appointments/${appointment.id}/review`)
        .set('Authorization', `Bearer ${patientToken}`)
        .send({ rating: 4 })
        .expect(201);

      const response = await request(context.app.getHttpServer())
        .get(`/professionals/${professional.id}/reviews`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        professionalId: professional.id,
        appointmentId: appointment.id,
        rating: 4,
      });
    });
  });
});
