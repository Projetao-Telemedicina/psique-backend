import request from 'supertest';
import { JwtService } from '@nestjs/jwt';
import { ProfessionalApprovalStatus, Role, UserStatus } from '@prisma/client';
import { E2eAppContext, createE2eApp, resetDatabase } from '../e2e-helpers';

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

describe('AuthController (e2e)', () => {
  let context: E2eAppContext;
  let sequence = 0;

  const nextEmail = (prefix: string) =>
    `${prefix}-${Date.now()}-${++sequence}@example.com`;

  const userPayload = (role: Role, prefix = role.toLowerCase()) => ({
    name: `${role} User`,
    email: nextEmail(prefix),
    password: 'Password123',
    role,
    ...(role === Role.PROFESSIONAL && {
      professionalProfile: {
        crp: `CRP-${Date.now()}-${sequence}`,
      },
    }),
  });

  const registerUser = async (role: Role, prefix?: string) => {
    const payload = userPayload(role, prefix);
    const response = await request(context.app.getHttpServer())
      .post('/auth/register')
      .send(payload)
      .expect(201);

    return {
      payload,
      user: response.body,
    };
  };

  const login = async (email: string, password = 'Password123'): Promise<AuthTokens> => {
    const response = await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return response.body as AuthTokens;
  };

  const decodePayload = (token: string) =>
    JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
  });

  afterAll(async () => {
    await context.app.close();
  });

  it('registers users publicly without returning passwordHash', async () => {
    const { payload, user } = await registerUser(Role.PATIENT, 'register');

    expect(user).toMatchObject({
      email: payload.email,
      role: Role.PATIENT,
    });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('registers professionals as inactive and pending approval by default', async () => {
    const { user } = await registerUser(Role.PROFESSIONAL, 'register-professional');

    expect(user).toMatchObject({
      role: Role.PROFESSIONAL,
      professionalProfile: {
        approvalStatus: ProfessionalApprovalStatus.PENDING,
        onlineStatus: 'OFFLINE',
      },
    });

    const persistedUser = await context.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        status: true,
      },
    });

    expect(persistedUser.status).toBe(UserStatus.INACTIVE);
  });

  it('logs in and returns JWT access and refresh tokens with the expected payload', async () => {
    const { payload, user } = await registerUser(Role.PATIENT, 'login');

    const tokens = await login(payload.email);
    const accessPayload = decodePayload(tokens.accessToken);

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(accessPayload).toMatchObject({
      sub: user.id,
      email: payload.email,
      role: Role.PATIENT,
    });
  });

  it('rejects login with a wrong password', async () => {
    const { payload } = await registerUser(Role.PATIENT, 'wrong-password');

    await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({ email: payload.email, password: 'Password999' })
      .expect(401);
  });

  it('rejects login for a nonexistent user', async () => {
    await request(context.app.getHttpServer())
      .post('/auth/login')
      .send({ email: nextEmail('missing'), password: 'Password123' })
      .expect(401);
  });

  it('protects JWT routes against missing, invalid, expired, and valid tokens', async () => {
    const { payload, user } = await registerUser(Role.PATIENT, 'jwt');
    const tokens = await login(payload.email);
    const jwtService = new JwtService();
    const expiredToken = jwtService.sign(
      {
        sub: user.id,
        email: payload.email,
        role: Role.PATIENT,
      },
      {
        secret: process.env.JWT_SECRET,
        expiresIn: '-1s',
      },
    );

    await request(context.app.getHttpServer()).get('/auth/me').expect(401);

    await request(context.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    await request(context.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);

    const response = await request(context.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      id: user.id,
      email: payload.email,
      role: Role.PATIENT,
    });
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('authorizes routes by role without bypass for other roles', async () => {
    const patient = await registerUser(Role.PATIENT, 'role-patient');
    const admin = await registerUser(Role.ADMIN, 'role-admin');

    const patientTokens = await login(patient.payload.email);
    const adminTokens = await login(admin.payload.email);

    await request(context.app.getHttpServer())
      .post('/auth/revoke')
      .set('Authorization', `Bearer ${patientTokens.accessToken}`)
      .send({ userId: admin.user.id })
      .expect(403);

    await request(context.app.getHttpServer())
      .post('/auth/revoke')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ userId: patient.user.id })
      .expect(201);
  });

  it('rotates refresh tokens and rejects malformed refresh requests', async () => {
    const { payload } = await registerUser(Role.PATIENT, 'refresh');
    const tokens = await login(payload.email);

    await request(context.app.getHttpServer()).post('/auth/refresh').expect(401);

    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', tokens.refreshToken)
      .expect(401);

    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', 'Bearer invalid-refresh-token')
      .expect(401);

    const refreshed = await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${tokens.refreshToken}`)
      .expect(201);

    expect(refreshed.body.accessToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).toEqual(expect.any(String));
    expect(refreshed.body.refreshToken).not.toBe(tokens.refreshToken);

    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${tokens.refreshToken}`)
      .expect(401);

    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${refreshed.body.refreshToken}`)
      .expect(201);
  });

  it('requires admin authorization to revoke tokens and invalidates revoked refresh tokens', async () => {
    const patient = await registerUser(Role.PATIENT, 'revoke-patient');
    const admin = await registerUser(Role.ADMIN, 'revoke-admin');

    const patientTokens = await login(patient.payload.email);
    const adminTokens = await login(admin.payload.email);

    await request(context.app.getHttpServer())
      .post('/auth/revoke')
      .send({ userId: patient.user.id })
      .expect(401);

    await request(context.app.getHttpServer())
      .post('/auth/revoke')
      .set('Authorization', `Bearer ${patientTokens.accessToken}`)
      .send({ userId: patient.user.id })
      .expect(403);

    await request(context.app.getHttpServer())
      .post('/auth/revoke')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ userId: patient.user.id })
      .expect(201);

    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${patientTokens.refreshToken}`)
      .expect(401);
  });

  it('invalidates the current access token when an admin revokes their own tokens', async () => {
    const admin = await registerUser(Role.ADMIN, 'self-revoke-admin');
    const adminTokens = await login(admin.payload.email);

    await request(context.app.getHttpServer())
      .post('/auth/revoke')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .send({ userId: admin.user.id })
      .expect(201);

    await request(context.app.getHttpServer())
      .post('/auth/refresh')
      .set('Authorization', `Bearer ${adminTokens.refreshToken}`)
      .expect(401);

    await request(context.app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${adminTokens.accessToken}`)
      .expect(401);
  });
});
