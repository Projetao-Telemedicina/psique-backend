import { Role } from '@prisma/client';
import request from 'supertest';
import {
  E2eAppContext,
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

  async function createSavedPaymentMethod(token: string, stripePaymentMethodId = 'pm_test_001') {
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

  async function createUserCoupon(patientId: string, overrides: Partial<{
    code: string;
    discountType: 'PERCENTAGE' | 'FIXED';
    discountValue: number;
    maxDiscountCents: number | null;
    minPurchaseCents: number | null;
    expiresAt: Date;
  }> = {}) {
    const coupon = await context.prisma.coupon.create({
      data: {
        code: overrides.code ?? `PSIQUE-${Date.now()}`,
        title: 'Cupom pagamento',
        category: 'SINGLE_APPOINTMENT',
        discountType: overrides.discountType ?? 'PERCENTAGE',
        discountValue: overrides.discountValue ?? 20,
        maxDiscountCents: overrides.maxDiscountCents ?? 3000,
        minPurchaseCents: overrides.minPurchaseCents ?? 0,
        maxUses: 10,
        maxUsesPerUser: 1,
        distributionType: 'TARGETED',
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

  function futureDate(hoursFromNow: number) {
    return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
  }

  describe('payment methods', () => {
    it('deve criar setup intent para usuário autenticado', async () => {
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

    it('deve salvar, listar e remover métodos próprios', async () => {
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

    it('deve concluir o pagamento pendente após webhook do Stripe', async () => {
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
