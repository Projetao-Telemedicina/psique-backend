import { CouponCategory, Role } from '@prisma/client';
import request from 'supertest';
import {
  E2eAppContext,
  createAdminUser,
  createAuthToken,
  createE2eApp,
  createPatientUser,
  createProfessionalUser,
  mockGoogleCalendarService,
  mockStripeService,
  resetDatabase,
} from './e2e-helpers';

describe('PaymentsModule (e2e)', () => {
  let context: E2eAppContext;

  beforeAll(async () => {
    context = await createE2eApp();
  });

  beforeEach(async () => {
    await resetDatabase(context.prisma);
    jest.clearAllMocks();
    mockStripeService.createAndConfirmPaymentIntent.mockResolvedValue({
      id: 'pi_test_123',
      status: 'succeeded',
      clientSecret: 'pi_test_123_secret',
    });
    mockStripeService.createSubscription.mockResolvedValue({
      id: 'sub_test_123',
      status: 'active',
      currentPeriodStart: new Date('2026-06-12T20:35:00.000Z'),
      currentPeriodEnd: new Date('2026-07-12T20:35:00.000Z'),
      cancelAtPeriodEnd: false,
      canceledAt: null,
      endedAt: null,
      paymentIntentId: 'pi_sub_test_123',
      clientSecret: 'pi_sub_test_123_secret',
    });
    mockStripeService.cancelSubscriptionAtPeriodEnd.mockResolvedValue({
      id: 'sub_test_123',
      status: 'active',
      currentPeriodStart: new Date('2026-06-12T20:35:00.000Z'),
      currentPeriodEnd: new Date('2026-07-12T20:35:00.000Z'),
      cancelAtPeriodEnd: true,
      canceledAt: null,
      endedAt: null,
      paymentIntentId: null,
      clientSecret: null,
    });
  });

  afterAll(async () => {
    await context.app.close();
  });

  async function setupPatientAndProfessional() {
    const patient = await createPatientUser(context.prisma);
    const professional = await createProfessionalUser(context.prisma);

    const patientToken = await createAuthToken(context.app, context.prisma, {
      id: patient.id,
      role: Role.PATIENT,
    });

    return {
      patient,
      professional,
      patientToken,
    };
  }

  async function createAdminSession() {
    const admin = await createAdminUser(context.prisma);
    const token = await createAuthToken(context.app, context.prisma, {
      id: admin.id,
      role: Role.ADMIN,
    });

    return { admin, token };
  }

  async function createSavedPaymentMethod(
    token: string,
    stripePaymentMethodId = 'pm_test_001',
  ) {
    const response = await request(context.app.getHttpServer())
      .post('/payment-methods')
      .set('Authorization', `Bearer ${token}`)
      .send({
        stripePaymentMethodId,
        isDefault: true,
      })
      .expect(201);

    return response.body as {
      id: string;
      gatewayToken: string;
    };
  }

  async function createUserCoupon(
    patientId: string,
    overrides: Partial<{
      code: string;
      category: CouponCategory;
      discountType: 'PERCENTAGE' | 'FIXED';
      discountValue: number;
      maxDiscountCents: number | null;
      minPurchaseCents: number | null;
      expiresAt: Date;
      firstMonthOnly: boolean;
    }> = {},
  ) {
    const coupon = await context.prisma.coupon.create({
      data: {
        code: overrides.code ?? `PSIQUE-${Date.now()}`,
        title: 'Cupom pagamento',
        category: overrides.category ?? 'SINGLE_APPOINTMENT',
        discountType: overrides.discountType ?? 'PERCENTAGE',
        discountValue: overrides.discountValue ?? 20,
        maxDiscountCents: overrides.maxDiscountCents ?? 3000,
        minPurchaseCents: overrides.minPurchaseCents ?? 0,
        maxUses: 10,
        maxUsesPerUser: 1,
        distributionType: 'TARGETED',
        firstMonthOnly: overrides.firstMonthOnly ?? false,
        expiresAt: overrides.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    return context.prisma.userCoupon.create({
      data: {
        userId: patientId,
        couponId: coupon.id,
      },
      include: {
        coupon: true,
      },
    });
  }

  async function createPlan(
    token: string,
    overrides: Partial<{
      name: string;
      description: string;
      priceCents: number;
      billingCycle: 'MONTHLY' | 'YEARLY';
      benefits: string[];
      stripeProductId: string;
      stripePriceId: string;
    }> = {},
  ) {
    const response = await request(context.app.getHttpServer())
      .post('/plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: overrides.name ?? 'Plano Essencial',
        description:
          overrides.description ??
          'Plano mensal com consultas a preço reduzido para pacientes.',
        priceCents: overrides.priceCents ?? 4990,
        billingCycle: overrides.billingCycle ?? 'MONTHLY',
        benefits: overrides.benefits ?? [
          'Consultas com valor reduzido',
          'Pacote mensal de atendimento',
        ],
        stripeProductId:
          overrides.stripeProductId ?? `prod_plan_${Date.now()}`,
        stripePriceId:
          overrides.stripePriceId ?? `price_plan_${Date.now()}`,
      })
      .expect(201);

    return response.body as {
      id: string;
      priceCents: number;
      stripeProductId: string;
      stripePriceId: string;
    };
  }

  function futureDate(hoursFromNow: number) {
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
  }

  describe('payment methods', () => {
    it('deve criar setup intent para usuÃ¡rio autenticado', async () => {
      const { patientToken } = await setupPatientAndProfessional();

      const response = await request(context.app.getHttpServer())
        .post('/payment-methods/setup-intent')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(201);

      expect(response.body).toEqual({
        id: 'seti_test_123',
        clientSecret: 'seti_test_123_secret',
      });
      expect(mockStripeService.createSetupIntent).toHaveBeenCalledTimes(1);
    });

    it('deve salvar, listar e remover mÃ©todos prÃ³prios', async () => {
      const { patientToken } = await setupPatientAndProfessional();

      const paymentMethod = await createSavedPaymentMethod(patientToken, 'pm_test_own');

      const listResponse = await request(context.app.getHttpServer())
        .get('/payment-methods')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(listResponse.body).toHaveLength(1);
      expect(listResponse.body[0].id).toBe(paymentMethod.id);
      expect(listResponse.body[0].last4).toBe('4242');

      const removeResponse = await request(context.app.getHttpServer())
        .delete(`/payment-methods/${paymentMethod.id}`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(removeResponse.body).toEqual({
        id: paymentMethod.id,
        removed: true,
      });
      expect(mockStripeService.detachPaymentMethod).toHaveBeenCalledWith('pm_test_own');
    });
  });

  describe('plans and subscriptions', () => {
    it('admin deve criar plano e paciente deve listar planos ativos', async () => {
      const { token: adminToken } = await createAdminSession();
      const { patientToken } = await setupPatientAndProfessional();

      const createdPlan = await createPlan(adminToken, {
        stripeProductId: 'prod_plan_essencial',
        stripePriceId: 'price_plan_essencial_monthly',
      });

      const response = await request(context.app.getHttpServer())
        .get('/plans')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].id).toBe(createdPlan.id);
      expect(response.body[0].billingCycle).toBe('MONTHLY');
    });

    it('paciente deve assinar plano com cupom PLAN_SUBSCRIPTION e ativar assinatura', async () => {
      const { token: adminToken } = await createAdminSession();
      const { patient, patientToken } = await setupPatientAndProfessional();
      const plan = await createPlan(adminToken, {
        priceCents: 7000,
        stripeProductId: 'prod_plan_signature',
        stripePriceId: 'price_plan_signature_monthly',
      });
      const paymentMethod = await createSavedPaymentMethod(
        patientToken,
        'pm_test_subscription',
      );
      const userCoupon = await createUserCoupon(patient.id, {
        category: 'PLAN_SUBSCRIPTION',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        maxDiscountCents: 2000,
        firstMonthOnly: true,
      });

      const response = await request(context.app.getHttpServer())
        .post('/subscriptions/checkout')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId: plan.id,
          paymentMethodId: paymentMethod.id,
          userCouponId: userCoupon.id,
        })
        .expect(201);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.subscriptionActivated).toBe(true);
      expect(response.body.discountAmountCents).toBe(1750);
      expect(response.body.finalAmountCents).toBe(5250);
      expect(response.body.warning).toBe('Desconto aplicado apenas para o primeiro mês');
      expect(mockStripeService.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: 'price_plan_signature_monthly',
          productId: 'prod_plan_signature',
          discountAmountCents: 1750,
        }),
      );

      const subscription = await context.prisma.subscription.findUniqueOrThrow({
        where: { id: response.body.subscriptionId },
      });
      const payment = await context.prisma.payment.findUniqueOrThrow({
        where: { id: response.body.id },
      });
      const usedCoupon = await context.prisma.userCoupon.findUniqueOrThrow({
        where: { id: userCoupon.id },
      });

      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.planId).toBe(plan.id);
      expect(payment.status).toBe('APPROVED');
      expect(payment.purpose).toBe('PLAN_SUBSCRIPTION');
      expect(usedCoupon.isUsed).toBe(true);
    });

    it('paciente deve consultar a prÃ³pria assinatura e cancelar no fim do perÃ­odo', async () => {
      const { token: adminToken } = await createAdminSession();
      const { patientToken } = await setupPatientAndProfessional();
      const plan = await createPlan(adminToken, {
        stripeProductId: 'prod_plan_cancel',
        stripePriceId: 'price_plan_cancel_monthly',
      });
      const paymentMethod = await createSavedPaymentMethod(
        patientToken,
        'pm_test_cancel_sub',
      );

      const checkoutResponse = await request(context.app.getHttpServer())
        .post('/subscriptions/checkout')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId: plan.id,
          paymentMethodId: paymentMethod.id,
        })
        .expect(201);

      const getResponse = await request(context.app.getHttpServer())
        .get('/subscriptions/me')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(getResponse.body.subscription.id).toBe(checkoutResponse.body.subscriptionId);
      expect(getResponse.body.subscription.plan.id).toBe(plan.id);

      const cancelResponse = await request(context.app.getHttpServer())
        .post(`/subscriptions/${checkoutResponse.body.subscriptionId}/cancel`)
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(201);

      expect(cancelResponse.body.cancelAtPeriodEnd).toBe(true);
      expect(mockStripeService.cancelSubscriptionAtPeriodEnd).toHaveBeenCalledTimes(1);
    });

    it('deve registrar renovaÃ§Ã£o da assinatura via webhook invoice.paid', async () => {
      const { token: adminToken } = await createAdminSession();
      const { patientToken } = await setupPatientAndProfessional();
      const plan = await createPlan(adminToken, {
        priceCents: 9000,
        stripeProductId: 'prod_plan_renewal',
        stripePriceId: 'price_plan_renewal_monthly',
      });
      const paymentMethod = await createSavedPaymentMethod(
        patientToken,
        'pm_test_renewal',
      );

      const checkoutResponse = await request(context.app.getHttpServer())
        .post('/subscriptions/checkout')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          planId: plan.id,
          paymentMethodId: paymentMethod.id,
        })
        .expect(201);

      await request(context.app.getHttpServer())
        .post('/payments/webhook')
        .set('stripe-signature', 'test-signature')
        .send({
          type: 'invoice.paid',
          data: {
            object: {
              id: 'in_renewal_123',
              subscription: 'sub_test_123',
              payment_intent: 'pi_renewal_123',
              amount_paid: 9000,
              lines: {
                data: [
                  {
                    period: {
                      start: 1783898100,
                      end: 1786480100,
                    },
                  },
                ],
              },
            },
          },
        })
        .expect(201);

      const subscription = await context.prisma.subscription.findUniqueOrThrow({
        where: { id: checkoutResponse.body.subscriptionId },
      });
      const renewalPayments = await context.prisma.payment.findMany({
        where: {
          subscriptionId: checkoutResponse.body.subscriptionId,
        },
        orderBy: { createdAt: 'asc' },
      });

      expect(subscription.status).toBe('ACTIVE');
      expect(subscription.currentPeriodEnd).toEqual(
        new Date(1786480100 * 1000),
      );
      expect(renewalPayments).toHaveLength(2);
      expect(renewalPayments[1].gatewayTransactionId).toBe('pi_renewal_123');
      expect(renewalPayments[1].status).toBe('APPROVED');
    });
  });

  describe('appointment checkout', () => {
    it('deve aplicar automaticamente o melhor cupom e aprovar a consulta', async () => {
      const { patient, professional, patientToken } = await setupPatientAndProfessional();
      const paymentMethod = await createSavedPaymentMethod(patientToken, 'pm_test_checkout');
      const weakerCoupon = await createUserCoupon(patient.id, {
        code: 'PSIQUE-WEAK',
        discountValue: 10,
        maxDiscountCents: 1000,
      });
      const strongerCoupon = await createUserCoupon(patient.id, {
        code: 'PSIQUE-STRONG',
        discountValue: 25,
        maxDiscountCents: 4000,
      });

      const response = await request(context.app.getHttpServer())
        .post('/payments/appointments/checkout')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          paymentMethodId: paymentMethod.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
          priceCents: 15000,
        })
        .expect(201);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.discountAmountCents).toBe(3750);
      expect(response.body.finalAmountCents).toBe(11250);
      expect(response.body.appointmentConfirmed).toBe(true);

      const payment = await context.prisma.payment.findUniqueOrThrow({
        where: { id: response.body.id },
      });
      const appointment = await context.prisma.appointment.findUniqueOrThrow({
        where: { id: response.body.appointmentId },
      });
      const usedCoupon = await context.prisma.userCoupon.findUniqueOrThrow({
        where: { id: strongerCoupon.id },
      });
      const unusedCoupon = await context.prisma.userCoupon.findUniqueOrThrow({
        where: { id: weakerCoupon.id },
      });

      expect(payment.status).toBe('APPROVED');
      expect(appointment.confirmedAt).not.toBeNull();
      expect(appointment.googleCalendarEventId).toBe('google-event-id-123');
      expect(usedCoupon.isUsed).toBe(true);
      expect(unusedCoupon.isUsed).toBe(false);
      expect(mockGoogleCalendarService.createAppointmentEvent).toHaveBeenCalledTimes(1);
    });

    it('deve aprovar sem chamar Stripe quando o cupom zera o valor final', async () => {
      const { patient, professional, patientToken } = await setupPatientAndProfessional();
      const paymentMethod = await createSavedPaymentMethod(patientToken, 'pm_test_zero');
      const fullCoupon = await createUserCoupon(patient.id, {
        discountType: 'FIXED',
        discountValue: 500,
        maxDiscountCents: null,
      });

      const response = await request(context.app.getHttpServer())
        .post('/payments/appointments/checkout')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          paymentMethodId: paymentMethod.id,
          startsAt: futureDate(48),
          endsAt: futureDate(49),
          priceCents: 15000,
          userCouponId: fullCoupon.id,
        })
        .expect(201);

      expect(response.body.status).toBe('APPROVED');
      expect(response.body.finalAmountCents).toBe(0);
      expect(mockStripeService.createAndConfirmPaymentIntent).not.toHaveBeenCalled();
    });

    it('deve concluir o pagamento pendente apÃ³s webhook do Stripe', async () => {
      const { professional, patientToken } = await setupPatientAndProfessional();
      const paymentMethod = await createSavedPaymentMethod(patientToken, 'pm_test_pending');

      mockStripeService.createAndConfirmPaymentIntent.mockResolvedValueOnce({
        id: 'pi_pending_123',
        status: 'requires_action',
        clientSecret: 'pi_pending_123_secret',
      });

      const checkoutResponse = await request(context.app.getHttpServer())
        .post('/payments/appointments/checkout')
        .set('Authorization', `Bearer ${patientToken}`)
        .send({
          professionalId: professional.id,
          paymentMethodId: paymentMethod.id,
          startsAt: futureDate(72),
          endsAt: futureDate(73),
          priceCents: 18000,
        })
        .expect(201);

      expect(checkoutResponse.body.status).toBe('PENDING');
      expect(checkoutResponse.body.appointmentConfirmed).toBe(false);

      await request(context.app.getHttpServer())
        .post('/payments/webhook')
        .set('stripe-signature', 'test-signature')
        .send({
          type: 'payment_intent.succeeded',
          data: {
            object: {
              id: 'pi_pending_123',
            },
          },
        })
        .expect(201);

      const payment = await context.prisma.payment.findUniqueOrThrow({
        where: { id: checkoutResponse.body.id },
      });
      const appointment = await context.prisma.appointment.findUniqueOrThrow({
        where: { id: checkoutResponse.body.appointmentId },
      });

      expect(payment.status).toBe('APPROVED');
      expect(appointment.confirmedAt).not.toBeNull();
      expect(appointment.googleCalendarEventId).toBe('google-event-id-123');
    });
  });
});
