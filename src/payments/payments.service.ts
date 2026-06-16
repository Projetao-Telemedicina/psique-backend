import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, Role } from '@prisma/client';
import { AppointmentService } from '@/appointment/appointment.service';
import { CouponsService } from '@/coupons/coupons.service';
import { PrismaService } from '@/prisma';
import { CheckoutAppointmentDto } from './dto/checkout-appointment.dto';
import { PaymentMethodsService } from './payment-methods.service';
import { PromotionsService } from './promotions.service';
import { StripeService } from './stripe/stripe.service';
import { SubscriptionsService } from './subscriptions.service';

const PAYMENT_FAILURE_REASON = 'Pagamento nÃ£o aprovado.';

type StripeWebhookPaymentIntent = {
  id: string;
  last_payment_error?: {
    message?: string | null;
  } | null;
};

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointmentService: AppointmentService,
    private readonly couponsService: CouponsService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly stripeService: StripeService,
    private readonly promotionsService: PromotionsService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async checkoutAppointment(userId: string, dto: CheckoutAppointmentDto) {
    const paymentMethod = await this.paymentMethodsService.getOwnedPaymentMethod(
      userId,
      dto.paymentMethodId,
    );

    const customerId = await this.paymentMethodsService.getStripeCustomerId(userId);

    let appliedCoupon:
      | Awaited<ReturnType<CouponsService['findBestApplicableCoupon']>>
      | null = null;

    if (dto.userCouponId) {
      appliedCoupon = {
        userCouponId: dto.userCouponId,
        result: await this.couponsService.applyCoupon(
          userId,
          dto.userCouponId,
          dto.priceCents,
          'SINGLE_APPOINTMENT',
        ),
      };
    } else {
      appliedCoupon = await this.couponsService.findBestApplicableCoupon(
        userId,
        'SINGLE_APPOINTMENT',
        dto.priceCents,
      );
    }

    if (appliedCoupon) {
      await this.couponsService.reserveCoupon(userId, appliedCoupon.userCouponId);
    }

    let appointmentId: string | null = null;
    let paymentId: string | null = null;
    const finalAmountCents = appliedCoupon?.result.finalAmountCents ?? dto.priceCents;
    const discountAmountCents = appliedCoupon?.result.discountAppliedCents ?? 0;

    try {
      const appointment = await this.appointmentService.createPendingAppointment({
        patientId: userId,
        professionalId: dto.professionalId,
        startsAt: dto.startsAt,
        endsAt: dto.endsAt,
        priceCents: dto.priceCents,
      });

      appointmentId = appointment.id;

      const payment = await this.prisma.payment.create({
        data: {
          userId,
          paymentMethodId: paymentMethod.id,
          purpose: 'APPOINTMENT',
          appointmentId: appointment.id,
          userCouponId: appliedCoupon?.userCouponId ?? null,
          originalAmountCents: dto.priceCents,
          discountAmountCents,
          walletAmountCents: 0,
          finalAmountCents,
          status: 'PENDING',
        },
      });

      paymentId = payment.id;

      if (finalAmountCents === 0) {
        const approvedPayment = await this.handlePaymentSucceeded(payment.id, null);
        return this.toCheckoutResponse(approvedPayment, null, true);
      }

      const paymentIntent = await this.stripeService.createAndConfirmPaymentIntent({
        amountCents: finalAmountCents,
        customerId,
        paymentMethodId: paymentMethod.gatewayToken,
        metadata: {
          paymentId: payment.id,
          appointmentId: appointment.id,
          purpose: 'APPOINTMENT',
        },
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayTransactionId: paymentIntent.id },
      });

      if (paymentIntent.status === 'succeeded') {
        const approvedPayment = await this.handlePaymentSucceeded(
          payment.id,
          paymentIntent.id,
        );
        return this.toCheckoutResponse(approvedPayment, paymentIntent.clientSecret, true);
      }

      if (this.isPendingStripeStatus(paymentIntent.status)) {
        const pendingPayment = await this.prisma.payment.findUniqueOrThrow({
          where: { id: payment.id },
        });
        return this.toCheckoutResponse(
          pendingPayment,
          paymentIntent.clientSecret,
          false,
        );
      }

      const failedPayment = await this.handlePaymentFailed(
        payment.id,
        paymentIntent.id,
        PAYMENT_FAILURE_REASON,
        'FAILED',
      );

      return this.toCheckoutResponse(failedPayment, paymentIntent.clientSecret, false);
    } catch (error) {
      if (paymentId) {
        await this.handlePaymentFailed(paymentId, null, PAYMENT_FAILURE_REASON, 'FAILED');
      } else {
        if (appointmentId) {
          await this.appointmentService.cancelPendingAppointment(
            appointmentId,
            PAYMENT_FAILURE_REASON,
          );
        }

        if (appliedCoupon) {
          await this.couponsService.releaseReservation(appliedCoupon.userCouponId);
        }
      }

      throw error;
    }
  }

  async getPaymentById(userId: string, role: Role, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento nÃ£o encontrado.');
    }

    if (role !== Role.ADMIN && payment.userId !== userId) {
      throw new NotFoundException('Pagamento nÃ£o encontrado.');
    }

    return payment;
  }

  async handleWebhook(signature: string | string[] | undefined, rawBody?: Buffer) {
    if (!signature || Array.isArray(signature)) {
      throw new BadRequestException('Assinatura do webhook do Stripe ausente.');
    }

    if (!rawBody) {
      throw new BadRequestException('Payload bruto do webhook nÃ£o encontrado.');
    }

    const event = this.stripeService.constructWebhookEvent(rawBody, signature);

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handleGatewayPaymentSucceeded(event.data.object);
        break;
      case 'payment_intent.payment_failed':
        await this.handleGatewayPaymentFailed(event.data.object);
        break;
      case 'payment_intent.canceled':
        await this.handleGatewayPaymentCanceled(event.data.object);
        break;
      case 'invoice.paid':
        await this.subscriptionsService.handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.subscriptionsService.handleInvoicePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await this.subscriptionsService.syncSubscriptionFromGateway(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await this.subscriptionsService.expireSubscriptionFromGateway(event.data.object);
        break;
      default:
        break;
    }

    return { received: true };
  }

  private async handleGatewayPaymentSucceeded(paymentIntent: StripeWebhookPaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayTransactionId: paymentIntent.id },
      select: { id: true, purpose: true },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento nÃ£o encontrado para este evento.');
    }

    if (payment.purpose === 'PLAN_SUBSCRIPTION') {
      return;
    }

    if (payment.purpose === 'PROFILE_PROMOTION') {
      await this.promotionsService.activatePromotionPayment(
        payment.id,
        paymentIntent.id,
      );
      return;
    }

    await this.handlePaymentSucceeded(payment.id, paymentIntent.id);
  }

  private async handleGatewayPaymentFailed(paymentIntent: StripeWebhookPaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayTransactionId: paymentIntent.id },
      select: { id: true, purpose: true },
    });

    if (!payment) {
      return;
    }

    if (payment.purpose === 'PLAN_SUBSCRIPTION') {
      return;
    }

    if (payment.purpose === 'PROFILE_PROMOTION') {
      await this.promotionsService.markPromotionPaymentFailed(
        payment.id,
        paymentIntent.id,
        paymentIntent.last_payment_error?.message ?? PAYMENT_FAILURE_REASON,
        'FAILED',
      );
      return;
    }

    await this.handlePaymentFailed(
      payment.id,
      paymentIntent.id,
      paymentIntent.last_payment_error?.message ?? PAYMENT_FAILURE_REASON,
      'FAILED',
    );
  }

  private async handleGatewayPaymentCanceled(paymentIntent: StripeWebhookPaymentIntent) {
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayTransactionId: paymentIntent.id },
      select: { id: true, purpose: true },
    });

    if (!payment) {
      return;
    }

    if (payment.purpose === 'PLAN_SUBSCRIPTION') {
      return;
    }

    if (payment.purpose === 'PROFILE_PROMOTION') {
      await this.promotionsService.markPromotionPaymentFailed(
        payment.id,
        paymentIntent.id,
        'Pagamento cancelado pelo provedor.',
        'CANCELED',
      );
      return;
    }

    await this.handlePaymentFailed(
      payment.id,
      paymentIntent.id,
      'Pagamento cancelado pelo provedor.',
      'CANCELED',
    );
  }

  private async handlePaymentSucceeded(paymentId: string, gatewayTransactionId: string | null) {
    const currentPayment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        appointmentId: true,
      },
    });

    if (!currentPayment) {
      throw new NotFoundException('Pagamento nÃ£o encontrado.');
    }

    if (currentPayment.status === PaymentStatus.APPROVED) {
      return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    }

    if (!currentPayment.appointmentId) {
      throw new BadRequestException('Pagamento sem consulta vinculada.');
    }

    await this.appointmentService.confirmPendingAppointment(currentPayment.appointmentId);

    await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          status: true,
          userCouponId: true,
        },
      });

      if (!payment || payment.status === PaymentStatus.APPROVED) {
        return;
      }

      if (payment.userCouponId) {
        await this.couponsService.consumeCouponInTransaction(tx, payment.userCouponId);
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          paidAt: new Date(),
          ...(gatewayTransactionId ? { gatewayTransactionId } : {}),
        },
      });
    });

    return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }

  private async handlePaymentFailed(
    paymentId: string,
    gatewayTransactionId: string | null,
    reason: string,
    status: 'FAILED' | 'CANCELED',
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        appointmentId: true,
        userCouponId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento nÃ£o encontrado.');
    }

    if (payment.status === PaymentStatus.APPROVED) {
      return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status,
        ...(gatewayTransactionId ? { gatewayTransactionId } : {}),
      },
    });

    if (payment.appointmentId) {
      await this.appointmentService.cancelPendingAppointment(payment.appointmentId, reason);
    }

    if (payment.userCouponId) {
      await this.couponsService.releaseReservation(payment.userCouponId);
    }

    return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }

  private isPendingStripeStatus(status: string) {
    return [
      'processing',
      'requires_action',
      'requires_capture',
      'requires_confirmation',
      'requires_payment_method',
    ].includes(status);
  }

  private toCheckoutResponse(
    payment: {
      id: string;
      appointmentId: string | null;
      status: PaymentStatus;
      originalAmountCents: number;
      discountAmountCents: number;
      finalAmountCents: number;
      gatewayTransactionId: string | null;
      paidAt: Date | null;
    },
    clientSecret: string | null,
    appointmentConfirmed: boolean,
  ) {
    return {
      id: payment.id,
      appointmentId: payment.appointmentId,
      status: payment.status,
      originalAmountCents: payment.originalAmountCents,
      discountAmountCents: payment.discountAmountCents,
      finalAmountCents: payment.finalAmountCents,
      gatewayTransactionId: payment.gatewayTransactionId,
      paidAt: payment.paidAt,
      clientSecret,
      appointmentConfirmed,
    };
  }
}
