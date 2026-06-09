import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import {
  createAppointmentForChat,
  createAuthToken,
  createE2eApp,
  createPatientUser,
  createProfessionalUser,
  resetDatabase,
  type E2eAppContext,
} from './e2e-helpers';

jest.setTimeout(15000);

type AckResponse<T> = {
  ok: boolean;
  message?: T;
  roomId?: string;
};

type ChatMessageResponse = {
  id: string;
  roomId: string;
  type: 'TEXT' | 'IMAGE' | 'FILE' | 'SYSTEM';
  content: string | null;
  attachments: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    downloadUrl: string;
  }>;
};

describe('Chat (e2e)', () => {
  let app: INestApplication;
  let prisma: E2eAppContext['prisma'];
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const context = await createE2eApp();
    app = context.app;
    prisma = context.prisma;

    await app.listen(0);

    const address = app.getHttpServer().address() as { port: number };
    baseUrl = `http://127.0.0.1:${String(address.port)}`;
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterEach(async () => {
    await Promise.all(
      sockets.splice(0).map(
        (socket) =>
          new Promise<void>((resolve) => {
            if (!socket.connected) {
              resolve();
              return;
            }

            socket.once('disconnect', () => resolve());
            socket.disconnect();
          }),
      ),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria uma sala de chat e lista as mensagens para o participante', async () => {
    const patient = await createPatientUser(prisma);
    const professional = await createProfessionalUser(prisma);
    await createAppointmentForChat(prisma, {
      patientId: patient.id,
      professionalId: professional.id,
    });

    const patientToken = await createAuthToken(app, prisma, patient);

    const createResponse = await request(app.getHttpServer())
      .post('/chat/rooms')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ professionalId: professional.id })
      .expect(201);

    expect(createResponse.body.professionalId).toBe(professional.id);
    expect(createResponse.body.patientId).toBe(patient.id);
    expect(createResponse.body.lastMessage).toBeNull();

    const roomsResponse = await request(app.getHttpServer())
      .get('/chat/rooms')
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(roomsResponse.body).toHaveLength(1);
    expect(roomsResponse.body[0].id).toBe(createResponse.body.id);

    const messagesResponse = await request(app.getHttpServer())
      .get(`/chat/rooms/${createResponse.body.id}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(messagesResponse.body).toEqual([]);
  });

  it('envia mensagem de texto em tempo real por websocket', async () => {
    const patient = await createPatientUser(prisma);
    const professional = await createProfessionalUser(prisma);
    await createAppointmentForChat(prisma, {
      patientId: patient.id,
      professionalId: professional.id,
    });

    const patientToken = await createAuthToken(app, prisma, patient);
    const professionalToken = await createAuthToken(app, prisma, professional);

    const roomResponse = await request(app.getHttpServer())
      .post('/chat/rooms')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ professionalId: professional.id })
      .expect(201);

    const roomId = roomResponse.body.id as string;

    const patientSocket = await connectChatSocket(baseUrl, patientToken, sockets);
    const professionalSocket = await connectChatSocket(
      baseUrl,
      professionalToken,
      sockets,
    );

    await emitWithAck(patientSocket, 'chat:join-room', { roomId });
    await emitWithAck(professionalSocket, 'chat:join-room', { roomId });

    const patientEvent = waitForEvent<ChatMessageResponse>(
      patientSocket,
      'chat:message-created',
    );
    const professionalEvent = waitForEvent<ChatMessageResponse>(
      professionalSocket,
      'chat:message-created',
    );

    const ack = await emitWithAck<ChatMessageResponse>(
      patientSocket,
      'chat:send-message',
      {
        roomId,
        content: 'Olá, doutora! Preciso conversar.',
      },
    );

    expect(ack.ok).toBe(true);
    expect(ack.message?.type).toBe('TEXT');
    expect(ack.message?.content).toBe('Olá, doutora! Preciso conversar.');

    const [patientMessage, professionalMessage] = await Promise.all([
      patientEvent,
      professionalEvent,
    ]);

    expect(patientMessage.content).toBe('Olá, doutora! Preciso conversar.');
    expect(professionalMessage.id).toBe(patientMessage.id);

    const messagesInDb = await request(app.getHttpServer())
      .get(`/chat/rooms/${roomId}/messages`)
      .set('Authorization', `Bearer ${patientToken}`)
      .expect(200);

    expect(messagesInDb.body).toHaveLength(1);
    expect(messagesInDb.body[0].content).toBe('Olá, doutora! Preciso conversar.');
  });

  it('envia anexo seguro e transmite a mensagem para os participantes', async () => {
    const patient = await createPatientUser(prisma);
    const professional = await createProfessionalUser(prisma);
    await createAppointmentForChat(prisma, {
      patientId: patient.id,
      professionalId: professional.id,
    });

    const patientToken = await createAuthToken(app, prisma, patient);
    const professionalToken = await createAuthToken(app, prisma, professional);

    const roomResponse = await request(app.getHttpServer())
      .post('/chat/rooms')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ professionalId: professional.id })
      .expect(201);

    const roomId = roomResponse.body.id as string;

    const professionalSocket = await connectChatSocket(
      baseUrl,
      professionalToken,
      sockets,
    );

    const professionalEvent = waitForEvent<ChatMessageResponse>(
      professionalSocket,
      'chat:message-created',
    );

    const uploadResponse = await request(app.getHttpServer())
      .post(`/chat/rooms/${roomId}/attachments`)
      .set('Authorization', `Bearer ${patientToken}`)
      .attach(
        'file',
        Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n'),
        {
          filename: 'relatorio.pdf',
          contentType: 'application/pdf',
        },
      )
      .field('caption', 'Segue o documento solicitado.')
      .expect(201);

    expect(uploadResponse.body.type).toBe('FILE');
    expect(uploadResponse.body.content).toBe('Segue o documento solicitado.');
    expect(uploadResponse.body.attachments).toHaveLength(1);

    const realtimeMessage = await professionalEvent;
    expect(realtimeMessage.id).toBe(uploadResponse.body.id);
    expect(realtimeMessage.attachments[0].fileName).toBe('relatorio.pdf');

    const attachmentId = uploadResponse.body.attachments[0].id as string;

    const downloadResponse = await request(app.getHttpServer())
      .get(`/chat/attachments/${attachmentId}`)
      .set('Authorization', `Bearer ${professionalToken}`)
      .expect(200);

    expect(downloadResponse.headers['x-content-type-options']).toBe('nosniff');
    expect(downloadResponse.headers['content-disposition']).toContain(
      'attachment;',
    );
    expect(downloadResponse.headers['content-type']).toContain('application/pdf');
    expect(downloadResponse.body).toBeInstanceOf(Buffer);
  });

  it('rejeita arquivo disfarçado para evitar injeção de script', async () => {
    const patient = await createPatientUser(prisma);
    const professional = await createProfessionalUser(prisma);
    await createAppointmentForChat(prisma, {
      patientId: patient.id,
      professionalId: professional.id,
    });

    const patientToken = await createAuthToken(app, prisma, patient);

    const roomResponse = await request(app.getHttpServer())
      .post('/chat/rooms')
      .set('Authorization', `Bearer ${patientToken}`)
      .send({ professionalId: professional.id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/chat/rooms/${roomResponse.body.id}/attachments`)
      .set('Authorization', `Bearer ${patientToken}`)
      .attach('file', Buffer.from('<script>alert(1)</script>'), {
        filename: 'imagem.png',
        contentType: 'image/png',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toBe(
          'Assinatura do arquivo inválida para o anexo enviado.',
        );
      });
  });
});

async function connectChatSocket(
  baseUrl: string,
  token: string,
  sockets: Socket[],
) {
  return new Promise<Socket>((resolve, reject) => {
    const socket = io(`${baseUrl}/chat`, {
      transports: ['websocket'],
      auth: {
        token,
      },
    });

    const cleanup = () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };

    const onConnect = () => {
      cleanup();
      sockets.push(socket);
      resolve(socket);
    };

    const onError = (error: Error) => {
      cleanup();
      socket.disconnect();
      reject(error);
    };

    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
  });
}

async function emitWithAck<T>(
  socket: Socket,
  event: string,
  payload: unknown,
) {
  return new Promise<AckResponse<T>>((resolve, reject) => {
    socket.timeout(5000).emit(
      event,
      payload,
      (error: Error | null, response: AckResponse<T>) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(response);
      },
    );
  });
}

async function waitForEvent<T>(socket: Socket, event: string) {
  return new Promise<T>((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });
}
