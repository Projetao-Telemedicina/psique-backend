import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { Role } from '@prisma/client';
import request from 'supertest';
import {
  E2eAppContext,
  createAuthToken,
  createE2eApp,
  createPatientUser,
  createProfessionalUser,
  resetDatabase,
} from './e2e-helpers';

describe('MatchingController (e2e)', () => {
  let context: E2eAppContext;
  let mockMatchingServer: Server | null = null;

  const patientQuestionnairePayload = {
    motivoTerapia: 0,
    abordagem: 1,
    estiloTerapeutico: 2,
    objetivo: 0,
    genero: 3,
    experiencia: 1,
    contextos: [1, 0, 0, 0, 1],
    ignoraContextos: false,
    tempoBusca: 0,
    experienciaPrevia: 0,
    precisaSuporteFora: false,
    restricaoHorario: false,
  };

  const professionalQuestionnairePayload = {
    motivosTerapia: [1, 0, 1, 0, 0],
    abordagem: 1,
    estiloTerapeutico: 2,
    objetivo: 0,
    genero: 0,
    experiencia: 1,
    contextos: [1, 0, 1, 0, 1],
    suporteFora: 1,
    periodoAtendimento: 0,
  };

  async function startMockMatchingService(
    handler: (request: IncomingMessage, response: ServerResponse, body: unknown) => void,
  ) {
    mockMatchingServer = createServer((request, response) => {
      void (async () => {
        const chunks: Buffer[] = [];

        for await (const chunk of request) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        const rawBody = Buffer.concat(chunks).toString('utf8');
        const body = rawBody ? (JSON.parse(rawBody) as unknown) : null;

        handler(request, response, body);
      })();
    });

    mockMatchingServer.listen(8000, '127.0.0.1');
    await once(mockMatchingServer, 'listening');
  }

  async function stopMockMatchingService() {
    if (!mockMatchingServer) {
      return;
    }

    const server = mockMatchingServer;
    mockMatchingServer = null;
    server.close();
    await once(server, 'close');
  }

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterEach(async () => {
    await stopMockMatchingService();
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('POST /matching/patient/questionnaire lets a patient create and update their questionnaire', async () => {
    const patient = await createPatientUser(context.prisma);
    const accessToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    const createResponse = await request(context.app.getHttpServer())
      .post('/matching/patient/questionnaire')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(patientQuestionnairePayload)
      .expect(201);

    expect(createResponse.body).toMatchObject({
      userId: patient.id,
      ...patientQuestionnairePayload,
    });

    const updatePayload = {
      ...patientQuestionnairePayload,
      objetivo: 2,
      ignoraContextos: true,
      contextos: [0, 1, 0, 1, 0],
    };

    const updateResponse = await request(context.app.getHttpServer())
      .post('/matching/patient/questionnaire')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatePayload)
      .expect(201);

    expect(updateResponse.body).toMatchObject({
      userId: patient.id,
      ...updatePayload,
    });

    const persisted = await context.prisma.patientQuestionnaire.findUniqueOrThrow({
      where: { userId: patient.id },
    });

    expect(persisted).toMatchObject({
      userId: patient.id,
      ...updatePayload,
    });
  });

  it('POST /matching/professional/questionnaire lets a professional create and update their questionnaire', async () => {
    const professional = await createProfessionalUser(context.prisma);
    const accessToken = await createAuthToken(context.app, context.prisma, {
      id: professional.id,
      role: Role.PROFESSIONAL,
    });

    const createResponse = await request(context.app.getHttpServer())
      .post('/matching/professional/questionnaire')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(professionalQuestionnairePayload)
      .expect(201);

    expect(createResponse.body).toMatchObject({
      userId: professional.id,
      ...professionalQuestionnairePayload,
    });

    const updatePayload = {
      ...professionalQuestionnairePayload,
      abordagem: 4,
      suporteFora: 0,
      contextos: [0, 1, 0, 1, 0],
    };

    const updateResponse = await request(context.app.getHttpServer())
      .post('/matching/professional/questionnaire')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(updatePayload)
      .expect(201);

    expect(updateResponse.body).toMatchObject({
      userId: professional.id,
      ...updatePayload,
    });

    const persisted =
      await context.prisma.professionalQuestionnaire.findUniqueOrThrow({
        where: { userId: professional.id },
      });

    expect(persisted).toMatchObject({
      userId: professional.id,
      ...updatePayload,
    });
  });

  it('enforces matching routes by role', async () => {
    const patient = await createPatientUser(context.prisma);
    const professional = await createProfessionalUser(context.prisma);

    const patientToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });
    const professionalToken = await createAuthToken(context.app, context.prisma, {
      id: professional.id,
      role: Role.PROFESSIONAL,
    });

    await request(context.app.getHttpServer())
      .post('/matching/professional/questionnaire')
      .set('Authorization', `Bearer ${patientToken}`)
      .send(professionalQuestionnairePayload)
      .expect(403);

    await request(context.app.getHttpServer())
      .post('/matching/patient/questionnaire')
      .set('Authorization', `Bearer ${professionalToken}`)
      .send(patientQuestionnairePayload)
      .expect(403);

    await request(context.app.getHttpServer())
      .get('/matching/recommendations')
      .set('Authorization', `Bearer ${professionalToken}`)
      .expect(403);
  });

  it('GET /matching/recommendations returns 500 when the patient questionnaire is missing', async () => {
    const patient = await createPatientUser(context.prisma);
    const accessToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    const response = await request(context.app.getHttpServer())
      .get('/matching/recommendations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(500);

    expect(response.body.message).toContain('Questionario do paciente nao encontrado');
  });

  it('GET /matching/recommendations returns an empty list when no professionals answered the questionnaire', async () => {
    const patient = await createPatientUser(context.prisma);
    const accessToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    await context.prisma.patientQuestionnaire.create({
      data: {
        userId: patient.id,
        ...patientQuestionnairePayload,
      },
    });

    const response = await request(context.app.getHttpServer())
      .get('/matching/recommendations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ recommendations: [] });
  });

  it('GET /matching/recommendations returns hydrated recommendations from the matching service', async () => {
    const patient = await createPatientUser(context.prisma);
    const professional = await createProfessionalUser(context.prisma);
    let capturedBody: unknown = null;

    await context.prisma.user.update({
      where: { id: professional.id },
      data: {
        name: 'Dra. Paula Match',
        avatarUrl: 'https://cdn.psique.test/professional.png',
        professionalProfile: {
          update: {
            specialty: 'Terapia Cognitivo-Comportamental',
            scoreAvg: 4.5,
            reviewCount: 12,
          },
        },
      },
    });

    const accessToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    await context.prisma.patientQuestionnaire.create({
      data: {
        userId: patient.id,
        ...patientQuestionnairePayload,
      },
    });

    await context.prisma.professionalQuestionnaire.create({
      data: {
        userId: professional.id,
        ...professionalQuestionnairePayload,
      },
    });

    await startMockMatchingService((request, response, body) => {
      capturedBody = body;
      expect(request.method).toBe('POST');
      expect(request.url).toBe('/match');

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          recommendations: [
            {
              professional_id: professional.id,
              score_display: 97.5,
              score_bruto: 8.42,
              cosine: 0.91,
              hamming: 0.12,
              penalidade: 0,
              mod_clinico: 0.3,
              explicacoes: ['Abordagem compativel', 'Contextos alinhados'],
            },
          ],
        }),
      );
    });

    const response = await request(context.app.getHttpServer())
      .get('/matching/recommendations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(capturedBody).toEqual({
      patient: {
        motivo_terapia: patientQuestionnairePayload.motivoTerapia,
        abordagem: patientQuestionnairePayload.abordagem,
        estilo_terapeutico: patientQuestionnairePayload.estiloTerapeutico,
        objetivo: patientQuestionnairePayload.objetivo,
        genero: patientQuestionnairePayload.genero,
        experiencia: patientQuestionnairePayload.experiencia,
        contextos: patientQuestionnairePayload.contextos,
        ignora_contextos: patientQuestionnairePayload.ignoraContextos,
        tempo_busca: patientQuestionnairePayload.tempoBusca,
        experiencia_previa: patientQuestionnairePayload.experienciaPrevia,
        precisa_suporte_fora: patientQuestionnairePayload.precisaSuporteFora,
        restricao_horario: patientQuestionnairePayload.restricaoHorario,
      },
      professionals: [
        {
          id: professional.id,
          motivos_terapia: professionalQuestionnairePayload.motivosTerapia,
          abordagem: professionalQuestionnairePayload.abordagem,
          estilo_terapeutico: professionalQuestionnairePayload.estiloTerapeutico,
          objetivo: professionalQuestionnairePayload.objetivo,
          genero: professionalQuestionnairePayload.genero,
          experiencia: professionalQuestionnairePayload.experiencia,
          contextos: professionalQuestionnairePayload.contextos,
          suporte_fora: professionalQuestionnairePayload.suporteFora,
          periodo_atendimento: professionalQuestionnairePayload.periodoAtendimento,
        },
      ],
    });

    expect(response.body).toEqual({
      recommendations: [
        {
          professionalId: professional.id,
          professionalName: 'Dra. Paula Match',
          avatarUrl: 'https://cdn.psique.test/professional.png',
          specialty: 'Terapia Cognitivo-Comportamental',
          scoreAvg: 4.5,
          reviewCount: 12,
          scoreDisplay: 97.5,
          scoreBruto: 8.42,
          cosine: 0.91,
          hamming: 0.12,
          penalidade: 0,
          modClinico: 0.3,
          explicacoes: ['Abordagem compativel', 'Contextos alinhados'],
        },
      ],
    });
  });

  it('GET /matching/recommendations surfaces matching service failures', async () => {
    const patient = await createPatientUser(context.prisma);
    const professional = await createProfessionalUser(context.prisma);
    const accessToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    await context.prisma.patientQuestionnaire.create({
      data: {
        userId: patient.id,
        ...patientQuestionnairePayload,
      },
    });

    await context.prisma.professionalQuestionnaire.create({
      data: {
        userId: professional.id,
        ...professionalQuestionnairePayload,
      },
    });

    await startMockMatchingService((_request, response) => {
      response.writeHead(500, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ detail: 'boom' }));
    });

    const response = await request(context.app.getHttpServer())
      .get('/matching/recommendations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(500);

    expect(response.body.message).toContain('Servico de matching indisponivel');
  });
});
