import {
  CouponCategory,
  CouponDiscountType,
  CouponDistributionType,
  Role,
} from '@prisma/client';
import request from 'supertest';
import {
  E2eAppContext,
  createAuthToken,
  createAdminUser,
  createE2eApp,
  createPatientUser,
  resetDatabase,
} from './e2e-helpers';

describe('CouponsController (e2e)', () => {
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

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async function createPatientSession() {
    const patient = await createPatientUser(context.prisma);
    const token = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });
    return { patient, token };
  }

  async function createAdminSession() {
    const admin = await createAdminUser(context.prisma);
    const token = await createAuthToken(context.app, context.prisma, {
      id: admin.id,
      role: Role.ADMIN,
    });
    return { admin, token };
  }

  async function createCoupon(
    overrides: Partial<{
      category: CouponCategory;
      discountType: CouponDiscountType;
      discountValue: number;
      maxDiscountCents: number | null;
      minPurchaseCents: number | null;
      maxUses: number | null;
      distributionType: CouponDistributionType;
      firstMonthOnly: boolean;
      expiresAt: Date;
      isActive: boolean;
    }> = {},
  ) {
    const { token: adminToken } = await createAdminSession();
    const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const response = await request(context.app.getHttpServer())
      .post('/coupons')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: 'Cupom de Teste',
        description: 'Descrição do cupom de teste',
        category: overrides.category ?? CouponCategory.SINGLE_APPOINTMENT,
        discountType: overrides.discountType ?? CouponDiscountType.PERCENTAGE,
        discountValue: overrides.discountValue ?? 20,
        maxDiscountCents: overrides.maxDiscountCents ?? 5000,
        minPurchaseCents: overrides.minPurchaseCents ?? null,
        maxUses: overrides.maxUses ?? null,
        distributionType: overrides.distributionType ?? CouponDistributionType.PUBLIC,
        firstMonthOnly: overrides.firstMonthOnly ?? false,
        expiresAt: (overrides.expiresAt ?? future).toISOString(),
        isActive: overrides.isActive ?? true,
      })
      .expect(201);

    return response.body as {
      id: string;
      code: string;
      title: string;
      category: string;
      discountType: string;
      discountValue: number;
    };
  }

  async function claimCoupon(
    patientId: string,
    couponId: string,
    token?: string,
  ) {
    const authToken =
      token ??
      (await createAuthToken(context.app, context.prisma, {
        id: patientId,
        role: Role.PATIENT,
      }));

    const response = await request(context.app.getHttpServer())
      .post(`/coupons/${couponId}/claim`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(201);

    return response.body as {
      id: string;
      couponId: string;
      userId: string;
      isUsed: boolean;
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /coupons — Criar cupom (admin)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /coupons', () => {
    it('admin deve criar cupom com sucesso', async () => {
      const { token } = await createAdminSession();
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const response = await request(context.app.getHttpServer())
        .post('/coupons')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'PSIQUE-E2E-TESTE',
          title: 'Cupom E2E',
          description: 'Cupom criado no teste e2e',
          category: CouponCategory.SINGLE_APPOINTMENT,
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 15,
          maxDiscountCents: 10000,
          minPurchaseCents: 5000,
          maxUses: 100,
          maxUsesPerUser: 1,
          distributionType: CouponDistributionType.PUBLIC,
          firstMonthOnly: false,
          expiresAt: future.toISOString(),
          isActive: true,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        code: 'PSIQUE-E2E-TESTE',
        title: 'Cupom E2E',
        category: CouponCategory.SINGLE_APPOINTMENT,
        discountType: CouponDiscountType.PERCENTAGE,
      });
      expect(response.body.id).toBeDefined();
    });

    it('deve rejeitar criacao sem token de admin', async () => {
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await request(context.app.getHttpServer())
        .post('/coupons')
        .send({
          code: 'PSIQUE-SEM-AUTH',
          title: 'Sem token',
          category: CouponCategory.SINGLE_APPOINTMENT,
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
          expiresAt: future.toISOString(),
        })
        .expect(401);
    });

    it('deve rejeitar criacao por paciente', async () => {
      const { token } = await createPatientSession();
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      await request(context.app.getHttpServer())
        .post('/coupons')
        .set('Authorization', `Bearer ${token}`)
        .send({
          code: 'PSIQUE-PACIENTE',
          title: 'Tentativa paciente',
          category: CouponCategory.SINGLE_APPOINTMENT,
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 10,
          expiresAt: future.toISOString(),
        })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /coupons — Listar cupons (admin)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /coupons', () => {
    it('admin deve listar todos os cupons', async () => {
      const coupon1 = await createCoupon({ discountValue: 10 });
      const coupon2 = await createCoupon({ discountValue: 25 });

      const { token } = await createAdminSession();

      const response = await request(context.app.getHttpServer())
        .get('/coupons')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.map((c: { id: string }) => c.id)).toEqual(
        expect.arrayContaining([coupon1.id, coupon2.id]),
      );
    });

    it('deve rejeitar listagem sem role admin', async () => {
      const { token } = await createPatientSession();

      await request(context.app.getHttpServer())
        .get('/coupons')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /coupons/:id — Buscar cupom por ID (admin)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /coupons/:id', () => {
    it('admin deve buscar cupom por ID', async () => {
      const coupon = await createCoupon();
      const { token } = await createAdminSession();

      const response = await request(context.app.getHttpServer())
        .get(`/coupons/${coupon.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.id).toBe(coupon.id);
    });

    it('deve retornar 404 para cupom inexistente', async () => {
      const { token } = await createAdminSession();

      await request(context.app.getHttpServer())
        .get(`/coupons/${NON_EXISTENT_UUID}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PATCH /coupons/:id — Atualizar cupom (admin)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PATCH /coupons/:id', () => {
    it('admin deve atualizar cupom com sucesso', async () => {
      const coupon = await createCoupon();
      const { token } = await createAdminSession();

      const response = await request(context.app.getHttpServer())
        .patch(`/coupons/${coupon.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Cupom Atualizado', discountValue: 30 })
        .expect(200);

      expect(response.body.title).toBe('Cupom Atualizado');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /coupons/:id — Remover cupom (admin)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /coupons/:id', () => {
    it('admin deve remover cupom com sucesso', async () => {
      const coupon = await createCoupon();
      const { token } = await createAdminSession();

      await request(context.app.getHttpServer())
        .delete(`/coupons/${coupon.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(context.app.getHttpServer())
        .get(`/coupons/${coupon.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /coupons/:id/claim — Resgatar cupom público (paciente)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /coupons/:id/claim', () => {
    it('paciente deve resgatar cupom PUBLIC com sucesso', async () => {
      const { patient, token } = await createPatientSession();
      const coupon = await createCoupon();

      const response = await request(context.app.getHttpServer())
        .post(`/coupons/${coupon.id}/claim`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.userId).toBe(patient.id);
      expect(response.body.couponId).toBe(coupon.id);
      expect(response.body.isUsed).toBe(false);
    });

    it('deve rejeitar resgate de cupom TARGETED', async () => {
      const { token } = await createPatientSession();
      const coupon = await createCoupon({
        distributionType: CouponDistributionType.TARGETED,
      });

      await request(context.app.getHttpServer())
        .post(`/coupons/${coupon.id}/claim`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve rejeitar resgate de cupom expirado', async () => {
      const { token } = await createPatientSession();
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const coupon = await createCoupon({ expiresAt: past });

      await request(context.app.getHttpServer())
        .post(`/coupons/${coupon.id}/claim`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve rejeitar resgate de cupom inativo', async () => {
      const { token } = await createPatientSession();
      const coupon = await createCoupon({ isActive: false });

      await request(context.app.getHttpServer())
        .post(`/coupons/${coupon.id}/claim`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve rejeitar resgate sem autenticacao', async () => {
      const coupon = await createCoupon();

      await request(context.app.getHttpServer())
        .post(`/coupons/${coupon.id}/claim`)
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /coupons/mine — Listar meus cupons (paciente)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /coupons/mine', () => {
    it('deve listar apenas cupons do paciente logado', async () => {
      const { patient, token } = await createPatientSession();
      const coupon = await createCoupon();
      await claimCoupon(patient.id, coupon.id, token);

      const response = await request(context.app.getHttpServer())
        .get('/coupons/mine')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].code).toBe(coupon.code);
      expect(response.body[0].category).toBe(coupon.category);
    });

    it('deve retornar lista vazia quando paciente nao tem cupons', async () => {
      const { token } = await createPatientSession();

      const response = await request(context.app.getHttpServer())
        .get('/coupons/mine')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it('nao deve incluir cupons expirados na lista', async () => {
      const { patient, token } = await createPatientSession();
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const coupon = await createCoupon({ expiresAt: past });

      // Cria o UserCoupon diretamente no banco (não via claim, pois o cupom já expirou)
      await context.prisma.userCoupon.create({
        data: {
          couponId: coupon.id,
          userId: patient.id,
        },
      });

      const response = await request(context.app.getHttpServer())
        .get('/coupons/mine')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.length).toBe(0);
    });

    it('deve rejeitar listagem para admin', async () => {
      const { token } = await createAdminSession();

      await request(context.app.getHttpServer())
        .get('/coupons/mine')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /coupons/:id/reserve — Reservar cupom do paciente
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /coupons/:id/reserve', () => {
    it('paciente deve reservar seu cupom com sucesso', async () => {
      const { patient, token } = await createPatientSession();
      const coupon = await createCoupon();
      const userCoupon = await claimCoupon(patient.id, coupon.id, token);

      const response = await request(context.app.getHttpServer())
        .post(`/coupons/${userCoupon.id}/reserve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      expect(response.body.id).toBe(userCoupon.id);
      expect(response.body.reservedAt).toBeDefined();
    });

    it('deve rejeitar reserva de cupom ja reservado', async () => {
      const { patient, token } = await createPatientSession();
      const coupon = await createCoupon();
      const userCoupon = await claimCoupon(patient.id, coupon.id, token);

      // Primeira reserva
      await request(context.app.getHttpServer())
        .post(`/coupons/${userCoupon.id}/reserve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      // Segunda reserva deve falhar
      await request(context.app.getHttpServer())
        .post(`/coupons/${userCoupon.id}/reserve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve rejeitar reserva de cupom de outro usuario', async () => {
      const { patient: owner } = await createPatientSession();
      const { token: attackerToken } = await createPatientSession();
      const coupon = await createCoupon();
      const userCoupon = await claimCoupon(owner.id, coupon.id);

      await request(context.app.getHttpServer())
        .post(`/coupons/${userCoupon.id}/reserve`)
        .set('Authorization', `Bearer ${attackerToken}`)
        .expect(400);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /coupons/apply — Aplicar cupom (paciente)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /coupons/apply', () => {
    async function setupApplyScenario(
      couponOverrides: Parameters<typeof createCoupon>[0] = {},
    ) {
      const { patient, token } = await createPatientSession();
      const coupon = await createCoupon(couponOverrides);
      const userCoupon = await claimCoupon(patient.id, coupon.id, token);

      return { patient, token, coupon, userCoupon };
    }

    it('deve aplicar desconto PERCENTAGE com sucesso', async () => {
      const { token, userCoupon } = await setupApplyScenario({
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 20,
        maxDiscountCents: 5000,
      });

      const response = await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 10000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(201);

      expect(response.body).toMatchObject({
        originalAmountCents: 10000,
        discountAppliedCents: 2000, // 20% de 10000
        finalAmountCents: 8000,
        couponCode: expect.any(String),
        message: 'Desconto aplicado',
        couponStatus: 'applied',
        warning: null,
      });
    });

    it('deve aplicar desconto FIXED sem gerar valor negativo', async () => {
      const { token, userCoupon } = await setupApplyScenario({
        discountType: CouponDiscountType.FIXED,
        discountValue: 200, // R$ 200,00 em reais → 20000 centavos
      });

      const response = await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 5000, // R$ 50,00
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(201);

      // FIXED deve ser limitado ao valor da compra (5000 < 20000)
      expect(response.body.discountAppliedCents).toBe(5000);
      expect(response.body.finalAmountCents).toBe(0);
    });

    it('deve aplicar desconto PERCENTAGE respeitando teto maximo', async () => {
      const { token, userCoupon } = await setupApplyScenario({
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 50,
        maxDiscountCents: 3000, // teto de R$ 30,00
      });

      const response = await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 100000, // R$ 1.000,00
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(201);

      // 50% de 100000 = 50000, mas teto é 3000
      expect(response.body.discountAppliedCents).toBe(3000);
    });

    it('deve aplicar PLAN_SUBSCRIPTION com firstMonthOnly e retornar warning', async () => {
      const { token, userCoupon } = await setupApplyScenario({
        category: CouponCategory.PLAN_SUBSCRIPTION,
        discountType: CouponDiscountType.PERCENTAGE,
        discountValue: 50,
        maxDiscountCents: 10000,
        firstMonthOnly: true,
      });

      const response = await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 30000,
          category: CouponCategory.PLAN_SUBSCRIPTION,
        })
        .expect(201);

      expect(response.body.warning).toBe('Desconto aplicado apenas para o primeiro mês');
    });

    it('deve rejeitar cupom expirado', async () => {
      const { patient, token } = await createPatientSession();
      const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const coupon = await createCoupon({ expiresAt: past });

      // Cria o UserCoupon diretamente no banco (cupom expirado não pode ser resgatado via claim)
      const userCoupon = await context.prisma.userCoupon.create({
        data: {
          couponId: coupon.id,
          userId: patient.id,
        },
      });

      await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 10000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(400);
    });

    it('deve rejeitar cupom de categoria errada', async () => {
      const { token, userCoupon } = await setupApplyScenario({
        category: CouponCategory.PLAN_SUBSCRIPTION,
      });

      await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 10000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(400);
    });

    it('deve rejeitar valor abaixo do minimo', async () => {
      const { token, userCoupon } = await setupApplyScenario({
        minPurchaseCents: 15000,
      });

      await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 5000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(400);
    });

    it('deve rejeitar cupom de outro usuario', async () => {
      const { patient: owner } = await createPatientSession();
      const { token: attackerToken } = await createPatientSession();
      const coupon = await createCoupon();
      const userCoupon = await claimCoupon(owner.id, coupon.id);

      await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${attackerToken}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 10000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(400);
    });

    it('deve ser idempotente — chamadas repetidas retornam mesmo resultado', async () => {
      const { token, userCoupon } = await setupApplyScenario();

      const firstResponse = await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 10000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(201);

      const secondResponse = await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${token}`)
        .send({
          userCouponId: userCoupon.id,
          amountCents: 10000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(201);

      expect(firstResponse.body).toEqual(secondResponse.body);
    });

    it('deve rejeitar aplicacao sem autenticacao', async () => {
      await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .send({
          userCouponId: NON_EXISTENT_UUID,
          amountCents: 10000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /coupons/:id/distribute — Distribuir cupom (admin)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /coupons/:id/distribute', () => {
    it('admin deve distribuir cupom para paciente', async () => {
      const { patient } = await createPatientSession();
      const coupon = await createCoupon({
        distributionType: CouponDistributionType.TARGETED,
      });
      const { token: adminToken } = await createAdminSession();

      const response = await request(context.app.getHttpServer())
        .post(`/coupons/${coupon.id}/distribute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetUserId: patient.id })
        .expect(201);

      expect(response.body.userId).toBe(patient.id);
      expect(response.body.couponId).toBe(coupon.id);
      expect(response.body.isUsed).toBe(false);
    });

    it('deve rejeitar distribuicao para cupom inexistente', async () => {
      const { patient } = await createPatientSession();
      const { token: adminToken } = await createAdminSession();

      await request(context.app.getHttpServer())
        .post(`/coupons/${NON_EXISTENT_UUID}/distribute`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ targetUserId: patient.id })
        .expect(404);
    });

    it('deve rejeitar distribuicao por paciente', async () => {
      const { patient, token } = await createPatientSession();
      const coupon = await createCoupon();

      await request(context.app.getHttpServer())
        .post(`/coupons/${coupon.id}/distribute`)
        .set('Authorization', `Bearer ${token}`)
        .send({ targetUserId: patient.id })
        .expect(403);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Fluxo completo: admin cria → paciente resgata → lista → aplica
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Fluxo completo de cupom', () => {
    it('deve percorrer o fluxo completo de cupom com sucesso', async () => {
      // 1. Admin cria cupom PUBLIC
      const { token: adminToken } = await createAdminSession();
      const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      const createResponse = await request(context.app.getHttpServer())
        .post('/coupons')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: `FLUXO-COMPLETO-${Date.now()}`,
          title: 'Cupom Fluxo Completo',
          category: CouponCategory.SINGLE_APPOINTMENT,
          discountType: CouponDiscountType.PERCENTAGE,
          discountValue: 20,
          maxDiscountCents: 10000,
          expiresAt: future.toISOString(),
        })
        .expect(201);

      const couponId = createResponse.body.id;
      // 2. Paciente resgata cupom publico
      const { token: patientToken } = await createPatientSession();
      const claimResponse = await request(context.app.getHttpServer())
        .post(`/coupons/${couponId}/claim`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(201);

      const userCouponId = claimResponse.body.id;

      // 3. Paciente lista seus cupons
      const listResponse = await request(context.app.getHttpServer())
        .get('/coupons/mine')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(listResponse.body.length).toBe(1);
      expect(listResponse.body[0].userCouponId).toBe(userCouponId);

      // 4. Paciente aplica cupom
      const applyResponse = await request(context.app.getHttpServer())
        .post('/coupons/apply')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          userCouponId,
          amountCents: 15000,
          category: CouponCategory.SINGLE_APPOINTMENT,
        })
        .expect(201);

      expect(applyResponse.body).toMatchObject({
        originalAmountCents: 15000,
        discountAppliedCents: 3000,
        finalAmountCents: 12000,
        message: 'Desconto aplicado',
        couponStatus: 'applied',
      });

      // 5. Cupom nao foi consumido (apenas preview)
      const listAgainResponse = await request(context.app.getHttpServer())
        .get('/coupons/mine')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(listAgainResponse.body.length).toBe(1);
    });
  });
});
