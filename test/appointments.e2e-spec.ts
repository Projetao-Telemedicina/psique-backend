import {
    AppointmentCanceledBy,
    AppointmentStatus,
    OnlineStatus,
    ProfessionalApprovalStatus,
    Role,
} from '@prisma/client';
import request from 'supertest';
import { E2eAppContext, createE2eApp, resetDatabase } from './e2e-helpers.js';

describe('AppointmentsController (e2e)', () => {
  let context: E2eAppContext;
  let sequence = 0;

  const nextEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${++sequence}@example.com`;
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

  async function createPatientUser() {
    const response = await request(context.app.getHttpServer())
      .post('/users')
      .send({
        name: 'Paciente Teste',
        email: nextEmail('patient'),
        password: 'Password123',
        role: Role.PATIENT,
        patientProfile: {
          emergencyContactName: 'Contato',
          emergencyContactPhone: '85999999999',
          shareDiaryWithProfessionals: false,
        },
      })
      .expect(201);

    return response.body;
  }

  async function createProfessionalUser() {
    const response = await request(context.app.getHttpServer())
      .post('/users')
      .send({
        name: 'Profissional Teste',
        email: nextEmail('professional'),
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

  async function createAppointment(
    patientId: string,
    professionalId: string,
    startsAt: string,
    endsAt: string,
  ) {
    const response = await request(context.app.getHttpServer())
      .post('/appointments')
      .send({
        patientId,
        professionalId,
        startsAt,
        endsAt,
        priceCents: 15000,
      })
      .expect(201);

    return response.body;
  }

  it('POST /appointments creates an appointment', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();

    const startsAt = '2026-05-10T10:00:00.000Z';
    const endsAt = '2026-05-10T11:00:00.000Z';

    const response = await request(context.app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: patient.id,
        professionalId: professional.id,
        startsAt,
        endsAt,
        priceCents: 15000,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      patientId: patient.id,
      professionalId: professional.id,
      status: AppointmentStatus.SCHEDULED,
      priceCents: 15000,
    });
    expect(response.body.startsAt).toContain('2026-05-10T10:00:00.000Z');
    expect(response.body.endsAt).toContain('2026-05-10T11:00:00.000Z');
  });

  it('POST /appointments returns 409 for schedule conflict', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();

    await createAppointment(
      patient.id,
      professional.id,
      '2026-05-10T10:00:00.000Z',
      '2026-05-10T11:00:00.000Z',
    );

    await request(context.app.getHttpServer())
      .post('/appointments')
      .send({
        patientId: patient.id,
        professionalId: professional.id,
        startsAt: '2026-05-10T10:30:00.000Z',
        endsAt: '2026-05-10T11:30:00.000Z',
        priceCents: 12000,
      })
      .expect(409);
  });

  it('GET /appointments?status=SCHEDULED returns only scheduled appointments', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();

    const scheduled = await createAppointment(
      patient.id,
      professional.id,
      '2026-05-11T09:00:00.000Z',
      '2026-05-11T10:00:00.000Z',
    );

    const canceled = await createAppointment(
      patient.id,
      professional.id,
      '2026-05-11T11:00:00.000Z',
      '2026-05-11T12:00:00.000Z',
    );

    await request(context.app.getHttpServer())
      .post(`/appointments/${canceled.id}/cancel`)
      .send({
        canceledBy: AppointmentCanceledBy.PROFESSIONAL,
        cancellationReason: 'agenda cheia',
      })
      .expect(200);

    const response = await request(context.app.getHttpServer())
      .get('/appointments?status=SCHEDULED')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(scheduled.id);
    expect(response.body[0].status).toBe(AppointmentStatus.SCHEDULED);
  });

  it('GET /appointments/:id returns 404 for missing appointment', async () => {
    await request(context.app.getHttpServer())
      .get('/appointments/0f0d6a8f-25fc-457e-a8fa-c3a43e3c8da1')
      .expect(404);
  });

  it('PATCH /appointments/:id updates appointment data', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();
    const appointment = await createAppointment(
      patient.id,
      professional.id,
      '2026-05-12T09:00:00.000Z',
      '2026-05-12T10:00:00.000Z',
    );

    const response = await request(context.app.getHttpServer())
      .patch(`/appointments/${appointment.id}`)
      .send({
        priceCents: 9000,
        startsAt: '2026-05-12T10:00:00.000Z',
        endsAt: '2026-05-12T11:00:00.000Z',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      priceCents: 9000,
    });
    expect(response.body.startsAt).toContain('2026-05-12T10:00:00.000Z');
    expect(response.body.endsAt).toContain('2026-05-12T11:00:00.000Z');
  });

  it('PATCH /appointments/:id/status updates appointment status', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();
    const appointment = await createAppointment(
      patient.id,
      professional.id,
      '2026-05-13T09:00:00.000Z',
      '2026-05-13T10:00:00.000Z',
    );

    const response = await request(context.app.getHttpServer())
      .patch(`/appointments/${appointment.id}/status`)
      .send({ status: AppointmentStatus.RESCHEDULE_REQUESTED })
      .expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      status: AppointmentStatus.RESCHEDULE_REQUESTED,
    });
  });

  it('PATCH /appointments/:id/complete marks appointment as completed', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();
    const appointment = await createAppointment(
      patient.id,
      professional.id,
      '2026-05-14T09:00:00.000Z',
      '2026-05-14T10:00:00.000Z',
    );

    const response = await request(context.app.getHttpServer())
      .patch(`/appointments/${appointment.id}/complete`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      status: AppointmentStatus.COMPLETED,
    });
    expect(response.body.completedAt).toBeTruthy();
  });

  it('PATCH /appointments/:id/no-show marks appointment as no-show', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();

    const appointment = await createAppointment(
      patient.id,
      professional.id,
      '2026-05-01T09:00:00.000Z',
      '2026-05-01T10:00:00.000Z',
    );

    const response = await request(context.app.getHttpServer())
      .patch(`/appointments/${appointment.id}/no-show`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      status: AppointmentStatus.NO_SHOW,
    });
  });

  it('POST /appointments/:id/cancel cancels appointment', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();
    const appointment = await createAppointment(
      patient.id,
      professional.id,
      '2026-05-15T09:00:00.000Z',
      '2026-05-15T10:00:00.000Z',
    );

    const response = await request(context.app.getHttpServer())
      .post(`/appointments/${appointment.id}/cancel`)
      .send({
        canceledBy: AppointmentCanceledBy.PROFESSIONAL,
        cancellationReason: 'imprevisto',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: appointment.id,
      status: AppointmentStatus.CANCELED,
      canceledBy: AppointmentCanceledBy.PROFESSIONAL,
      cancellationReason: 'imprevisto',
    });
    expect(response.body.canceledAt).toBeTruthy();
  });

  it('GET /appointments/upcoming returns future appointments for the patient', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();

    const upcoming = await createAppointment(
      patient.id,
      professional.id,
      '2027-01-10T10:00:00.000Z',
      '2027-01-10T11:00:00.000Z',
    );

    await createAppointment(
      patient.id,
      professional.id,
      '2025-01-10T10:00:00.000Z',
      '2025-01-10T11:00:00.000Z',
    );

    const response = await request(context.app.getHttpServer())
      .get('/appointments/upcoming')
      .set('x-user-id', patient.id)
      .set('x-user-role', Role.PATIENT)
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0].id).toBe(upcoming.id);
    expect(response.body[0].status).toBe(AppointmentStatus.SCHEDULED);
  });

  it('GET /appointments/history returns completed/canceled/no-show appointments for the patient', async () => {
    const patient = await createPatientUser();
    const professional = await createProfessionalUser();

    const completed = await createAppointment(
      patient.id,
      professional.id,
      '2025-02-10T09:00:00.000Z',
      '2025-02-10T10:00:00.000Z',
    );

    const canceled = await createAppointment(
      patient.id,
      professional.id,
      '2025-03-10T09:00:00.000Z',
      '2025-03-10T10:00:00.000Z',
    );

    const noShow = await createAppointment(
      patient.id,
      professional.id,
      '2025-04-10T09:00:00.000Z',
      '2025-04-10T10:00:00.000Z',
    );

    await request(context.app.getHttpServer())
      .patch(`/appointments/${completed.id}/complete`)
      .expect(200);

    await request(context.app.getHttpServer())
      .post(`/appointments/${canceled.id}/cancel`)
      .send({
        canceledBy: AppointmentCanceledBy.PROFESSIONAL,
        cancellationReason: 'agenda cheia',
      })
      .expect(200);

    await request(context.app.getHttpServer())
      .patch(`/appointments/${noShow.id}/no-show`)
      .expect(200);

    const response = await request(context.app.getHttpServer())
      .get('/appointments/history?page=1&limit=10')
      .set('x-user-id', patient.id)
      .set('x-user-role', Role.PATIENT)
      .expect(200);

    const statuses = response.body.map((item: { status: AppointmentStatus }) => item.status);

    expect(response.body).toHaveLength(3);
    expect(statuses).toEqual(
      expect.arrayContaining([
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELED,
        AppointmentStatus.NO_SHOW,
      ]),
    );
  });
});
