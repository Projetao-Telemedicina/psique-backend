import request from 'supertest';
import { Role, UserStatus } from '@prisma/client';
import { App } from 'supertest/types';
import { E2eAppContext, createE2eApp, resetDatabase } from './e2e-helpers.js';

describe('UsersController (e2e)', () => {
  let context: E2eAppContext;
  let sequence = 0;

  const nextEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${++sequence}@example.com`;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('POST /users creates a patient user with profile and hashed password', async () => {
    const payload = {
      name: 'Ana Souza',
      email: nextEmail('patient'),
      password: 'Password123',
      role: Role.PATIENT,
      cpf: '529.982.247-25',
      birthDate: '1990-05-10',
      patientProfile: {
        emergencyContactName: 'Maria Souza',
        emergencyContactPhone: '85999999999',
        shareDiaryWithProfessionals: true,
      },
    };

    const response = await request(context.app.getHttpServer() as App)
      .post('/users')
      .send(payload)
      .expect(201);

    expect(response.body).toMatchObject({
      name: payload.name,
      email: payload.email,
      role: Role.PATIENT,
      patientProfile: payload.patientProfile,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
    expect(response.body.birthDate).toContain('1990-05-10');

    const createdUser = await context.prisma.user.findUnique({
      where: { email: payload.email },
      include: { patientProfile: true },
    });

    expect(createdUser).toBeTruthy();
    expect(response.body.id).toBe(createdUser?.id);
    expect(createdUser?.passwordHash).not.toBe(payload.password);
    expect(createdUser?.patientProfile).toMatchObject(payload.patientProfile);
  });

  it('GET /users/active returns only active users', async () => {
    await context.prisma.user.create({
      data: {
        name: 'Active User',
        email: nextEmail('active'),
        passwordHash: 'hash',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    await context.prisma.user.create({
      data: {
        name: 'Inactive User',
        email: nextEmail('inactive'),
        passwordHash: 'hash',
        role: Role.ADMIN,
        status: UserStatus.INACTIVE,
      },
    });

    const response = await request(context.app.getHttpServer() as App)
      .get('/users/active')
      .expect(200);

    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      name: 'Active User',
      status: UserStatus.ACTIVE,
    });
    expect(response.body[0]).not.toHaveProperty('passwordHash');
  });

  it('GET /users/:id returns 404 when the user does not exist', async () => {
    await request(context.app.getHttpServer() as App)
      .get('/users/0f0d6a8f-25fc-457e-a8fa-c3a43e3c8da1')
      .expect(404);
  });

  it('PATCH /users/:id updates user fields and patient profile', async () => {
    const createResponse = await request(context.app.getHttpServer() as App)
      .post('/users')
      .send({
        name: 'Carlos Lima',
        email: nextEmail('update-patient'),
        password: 'Password123',
        role: Role.PATIENT,
        patientProfile: {
          emergencyContactName: 'Contato Inicial',
        },
      })
      .expect(201);

    const response = await request(context.app.getHttpServer() as App)
      .patch(`/users/${createResponse.body.id}`)
      .send({
        name: 'Carlos Lima Atualizado',
        city: 'Fortaleza',
        patientProfile: {
          emergencyContactName: 'Joana Lima',
          emergencyContactPhone: '85988887777',
          shareDiaryWithProfessionals: true,
        },
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: createResponse.body.id,
      name: 'Carlos Lima Atualizado',
      city: 'Fortaleza',
    });
    expect(response.body).not.toHaveProperty('passwordHash');

    const persisted = await context.prisma.user.findUnique({
      where: { id: createResponse.body.id },
      include: { patientProfile: true },
    });

    expect(persisted?.patientProfile).toMatchObject({
      emergencyContactName: 'Joana Lima',
      emergencyContactPhone: '85988887777',
      shareDiaryWithProfessionals: true,
    });
  });

  it('DELETE /users/:id marks the user as inactive', async () => {
    const user = await context.prisma.user.create({
      data: {
        name: 'Delete Me',
        email: nextEmail('delete'),
        passwordHash: 'hash',
        role: Role.ADMIN,
        status: UserStatus.ACTIVE,
      },
    });

    const response = await request(context.app.getHttpServer() as App)
      .delete(`/users/${user.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: user.id,
      status: UserStatus.INACTIVE,
    });

    const persisted = await context.prisma.user.findUnique({
      where: { id: user.id },
    });

    expect(persisted?.status).toBe(UserStatus.INACTIVE);
  });
});
