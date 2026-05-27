import { OnlineStatus, Role } from '@prisma/client';
import request from 'supertest';
import { PanicButtonService } from '../src/emergency/panic-button.service';
import {
  E2eAppContext,
  createAuthToken,
  createE2eApp,
  createPatientUser,
  createProfessionalUser,
  resetDatabase,
} from './e2e-helpers';

process.env.PANIC_OFFER_TIMEOUT_MS = '120';
process.env.PANIC_REQUEST_TIMEOUT_MS = '700';

describe('PanicButtonController (e2e)', () => {
  let context: E2eAppContext;
  let panicButtonService: PanicButtonService;

  beforeAll(async () => {
    context = await createE2eApp();
    panicButtonService = context.app.get(PanicButtonService);
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function createPatientSession() {
    const patient = await createPatientUser(context.prisma);
    const token = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    return { patient, token };
  }

  async function createProfessionalSession(overrides?: {
    onlineStatus?: OnlineStatus;
    availableForEmergency?: boolean;
  }) {
    const professional = await createProfessionalUser(context.prisma);
    const token = await createAuthToken(context.app, context.prisma, {
      id: professional.id,
      role: Role.PROFESSIONAL,
    });

    const updatedProfile = await context.prisma.professionalProfile.update({
      where: { userId: professional.id },
      data: {
        onlineStatus: overrides?.onlineStatus ?? OnlineStatus.ONLINE,
        availableForEmergency: overrides?.availableForEmergency ?? true,
      },
    });

    return {
      professional,
      token,
      profile: updatedProfile,
    };
  }

  async function sleep(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function waitForRequestState(
    requestId: string,
    predicate: (
      request: Awaited<ReturnType<PanicButtonService['getRequestById']>>,
    ) => boolean,
    timeoutMs = 1000,
    intervalMs = 25,
  ) {
    const deadline = Date.now() + timeoutMs;
    let lastRequest = await panicButtonService.getRequestById(requestId);

    while (Date.now() < deadline) {
      if (predicate(lastRequest)) {
        return lastRequest;
      }

      await sleep(intervalMs);
      lastRequest = await panicButtonService.getRequestById(requestId);
    }

    return lastRequest;
  }

  it('POST /panic cria acionamento e envia oferta para o primeiro profissional elegível', async () => {
    const { token: patientToken } = await createPatientSession();
    const { professional } = await createProfessionalSession();

    const response = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        notes: 'Crise intensa de ansiedade.',
      })
      .expect(201);

    const persistedRequest = await waitForRequestState(
      response.body.id,
      (request) => request.status === 'OFFER_PENDING' && request.offers.length === 1,
    );

    expect(persistedRequest).toMatchObject({
      status: 'OFFER_PENDING',
      notes: 'Crise intensa de ansiedade.',
    });
    expect(persistedRequest.offers).toHaveLength(1);
    expect(persistedRequest.offers[0]).toMatchObject({
      professionalId: professional.id,
      status: 'PENDING',
      attemptNumber: 1,
    });
  });

  it('GET /panic/me/active retorna o acionamento ativo do paciente', async () => {
    const { token: patientToken } = await createPatientSession();
    await createProfessionalSession();

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    const persistedRequest = await waitForRequestState(
      created.body.id,
      (request) => request.status === 'OFFER_PENDING' && request.offers.length === 1,
    );

    const response = await request(context.app.getHttpServer())
      .get('/panic/me/active')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: created.body.id,
      status: persistedRequest.status,
    });
    expect(persistedRequest.status).toBe('OFFER_PENDING');
  });

  it('POST /panic/offers/:offerId/accept conclui o match e marca o profissional como ocupado', async () => {
    const { token: patientToken } = await createPatientSession();
    const { professional, token: professionalToken } =
      await createProfessionalSession();

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    const initialRequest = await waitForRequestState(
      created.body.id,
      (request) => request.offers.length === 1,
    );
    const offerId = initialRequest.offers[0]?.id;

    const response = await request(context.app.getHttpServer())
      .post(`/panic/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .send()
      .expect(201);

    expect(response.body).toMatchObject({
      id: offerId,
      professionalId: professional.id,
      status: 'ACCEPTED',
    });

    const persistedRequest = await waitForRequestState(
      created.body.id,
      (request) => request.status === 'MATCHED',
    );
    expect(persistedRequest.status).toBe('MATCHED');
    expect(persistedRequest.matchedProfessionalId).toBe(professional.id);

    const persistedProfessional =
      await context.prisma.professionalProfile.findUniqueOrThrow({
        where: { userId: professional.id },
        select: { availableForEmergency: true, activeEmergencyOfferId: true },
      });

    expect(persistedProfessional.availableForEmergency).toBe(false);
    expect(persistedProfessional.activeEmergencyOfferId).toBeNull();
  });

  it('POST /panic/offers/:offerId/reject tenta automaticamente o próximo profissional', async () => {
    const { token: patientToken } = await createPatientSession();
    const firstProfessional = await createProfessionalSession();
    const secondProfessional = await createProfessionalSession();

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    const initialRequest = await waitForRequestState(
      created.body.id,
      (request) => request.offers.length === 1,
    );
    const firstOfferId = initialRequest.offers[0]?.id;

    await request(context.app.getHttpServer())
      .post(`/panic/offers/${firstOfferId}/reject`)
      .set('Authorization', `Bearer ${firstProfessional.token}`)
      .send({
        reason: 'Nao consigo assumir agora.',
      })
      .expect(201);

    const persistedRequest = await waitForRequestState(
      created.body.id,
      (request) =>
        request.status === 'OFFER_PENDING' &&
        request.offers.length === 2 &&
        request.offers[1]?.status === 'PENDING',
    );

    expect(persistedRequest.status).toBe('OFFER_PENDING');
    expect(persistedRequest.offers).toHaveLength(2);
    expect(persistedRequest.offers[0]).toMatchObject({
      id: firstOfferId,
      professionalId: firstProfessional.professional.id,
      status: 'REJECTED',
      rejectionReason: 'Nao consigo assumir agora.',
    });
    expect(persistedRequest.offers[1]).toMatchObject({
      professionalId: secondProfessional.professional.id,
      status: 'PENDING',
      attemptNumber: 2,
    });
  });

  it('mantem o acionamento em SEARCHING quando nao ha profissional disponivel', async () => {
    const { token: patientToken } = await createPatientSession();

    const response = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'SEARCHING',
    });
    expect(response.body.offers).toHaveLength(0);
  });

  it('retoma automaticamente o match quando um profissional fica disponivel', async () => {
    const { token: patientToken } = await createPatientSession();
    const { professional, token: professionalToken } =
      await createProfessionalSession({
        onlineStatus: OnlineStatus.OFFLINE,
        availableForEmergency: false,
      });

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    expect(created.body.status).toBe('SEARCHING');

    await request(context.app.getHttpServer())
      .patch('/professionals/me')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        availableForEmergency: true,
      })
      .expect(200);

    await request(context.app.getHttpServer())
      .patch('/professionals/me/online-mode')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send({
        onlineMode: OnlineStatus.ONLINE,
      })
      .expect(200);

    const persistedRequest = await waitForRequestState(
      created.body.id,
      (request) => request.status === 'OFFER_PENDING' && request.offers.length === 1,
    );
    expect(persistedRequest.status).toBe('OFFER_PENDING');
    expect(persistedRequest.offers).toHaveLength(1);
    expect(persistedRequest.offers[0]?.professionalId).toBe(professional.id);
  });

  it('expira a oferta pendente e tenta automaticamente o proximo profissional', async () => {
    const { token: patientToken } = await createPatientSession();
    const firstProfessional = await createProfessionalSession();
    const secondProfessional = await createProfessionalSession();

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    await waitForRequestState(
      created.body.id,
      (request) => request.offers.length === 1 && request.offers[0]?.status === 'PENDING',
    );

    const persistedRequest = await waitForRequestState(
      created.body.id,
      (request) =>
        request.offers.length === 2 &&
        request.offers[0]?.status === 'EXPIRED' &&
        request.offers[1]?.status === 'PENDING',
      1200,
    );

    expect(persistedRequest.offers).toHaveLength(2);
    expect(persistedRequest.offers[0]).toMatchObject({
      professionalId: firstProfessional.professional.id,
      status: 'EXPIRED',
    });
    expect(persistedRequest.offers[1]).toMatchObject({
      professionalId: secondProfessional.professional.id,
      status: 'PENDING',
    });
  });

  it('expira o acionamento quando o tempo total termina sem profissional disponivel', async () => {
    const { token: patientToken } = await createPatientSession();

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    const persistedRequest = await waitForRequestState(
      created.body.id,
      (request) => request.status === 'EXPIRED',
      1500,
    );
    expect(persistedRequest.status).toBe('EXPIRED');
  });

  it('POST /panic/:requestId/cancel cancela o acionamento pendente', async () => {
    const { token: patientToken } = await createPatientSession();
    await createProfessionalSession();

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    const response = await request(context.app.getHttpServer())
      .post(`/panic/${created.body.id}/cancel`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        reason: 'Paciente estabilizado.',
      })
      .expect(201);

    expect(response.body.status).toBe('CANCELLED');

    const persistedRequest = await panicButtonService.getRequestById(created.body.id);
    expect(persistedRequest.status).toBe('CANCELLED');
  });

  it('nao permite aceitar oferta de outro profissional', async () => {
    const { token: patientToken } = await createPatientSession();
    await createProfessionalSession();
    const secondProfessional = await createProfessionalSession();

    const created = await request(context.app.getHttpServer())
      .post('/panic')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({})
      .expect(201);

    const initialRequest = await waitForRequestState(
      created.body.id,
      (request) => request.offers.length === 1,
    );
    const offerId = initialRequest.offers[0]?.id;

    await request(context.app.getHttpServer())
      .post(`/panic/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${secondProfessional.token}`)
      .send()
      .expect(404);

    const requestAfterAttempt = await panicButtonService.getRequestById(created.body.id);
    expect(requestAfterAttempt.status).toBe('OFFER_PENDING');
    expect(requestAfterAttempt.offers[0]?.status).toBe('PENDING');
  });
});
