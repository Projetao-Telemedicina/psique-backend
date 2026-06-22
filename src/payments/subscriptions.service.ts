import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, SubscriptionStatus } from '@prisma/client';
import { CouponsService } from '@/coupons/coupons.service';
import { PrismaService } from '@/prisma';
import { PaymentMethodsService } from './payment-methods.service';
import { PlansService } from './plans.service';
import { SubscribePlanDto } from './dto/subscribe-plan.dto';
import {
  StripeService,
  StripeSubscriptionResult,
} from './stripe/stripe.service';

type StripeInvoiceObject = {
  id: string;
  subscription?: string | { id: string } | null;
  payment_intent?:
    | string
    | {
        id: string;
        client_secret?: string | null;
      }
    | null;
  amount_paid?: number | null;
  amount_due?: number | null;
  lines?: {
    data?: Array<{
      period?: {
        start?: number | null;
        end?: number | null;
      };
    }>;
  };
};

type StripeSubscriptionObject = {
  id: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_start?: number | null;
  current_period_end?: number | null;
  canceled_at?: number | null;
  ended_at?: number | null;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly couponsService: CouponsService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly stripeService: StripeService,
  ) {}

  async subscribeToPlan(userId: string, dto: SubscribePlanDto) {
    await this.ensureNoBlockingSubscription(userId);

    const plan = await this.plansService.getActivePlanById(dto.planId);
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
          plan.priceCents,
          'PLAN_SUBSCRIPTION',
        ),
      };
    } else {
      appliedCoupon = await this.couponsService.findBestApplicableCoupon(
        userId,
        'PLAN_SUBSCRIPTION',
        plan.priceCents,
      );
    }

    if (appliedCoupon) {
      await this.couponsService.reserveCoupon(userId, appliedCoupon.userCouponId);
    }

    const discountAmountCents = appliedCoupon?.result.discountAppliedCents ?? 0;
    const finalAmountCents = appliedCoupon?.result.finalAmountCents ?? plan.priceCents;

    let subscriptionId: string | null = null;
    let paymentId: string | null = null;

    try {
      const subscription = await this.prisma.subscription.create({
        data: {
          userId,
          planId: plan.id,
          status: 'PENDING',
        },
      });

      subscriptionId = subscription.id;

      const payment = await this.prisma.payment.create({
        data: {
          userId,
          paymentMethodId: paymentMethod.id,
          purpose: 'PLAN_SUBSCRIPTION',
          subscriptionId: subscription.id,
          userCouponId: appliedCoupon?.userCouponId ?? null,
          originalAmountCents: plan.priceCents,
          discountAmountCents,
          walletAmountCents: 0,
          finalAmountCents,
          status: 'PENDING',
        },
      });

      paymentId = payment.id;

      const stripeSubscription = await this.stripeService.createSubscription({
        customerId,
        priceId: plan.stripePriceId,
        productId: plan.stripeProductId,
        paymentMethodId: paymentMethod.gatewayToken,
        discountAmountCents,
        metadata: {
          subscriptionId: subscription.id,
          paymentId: payment.id,
          planId: plan.id,
          userId,
        },
      });

      await this.prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          stripeSubscriptionId: stripeSubscription.id,
          startedAt: stripeSubscription.currentPeriodStart ?? undefined,
          currentPeriodStart: stripeSubscription.currentPeriodStart ?? undefined,
          currentPeriodEnd: stripeSubscription.currentPeriodEnd ?? undefined,
          cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
          canceledAt: stripeSubscription.canceledAt ?? undefined,
          endedAt: stripeSubscription.endedAt ?? undefined,
          status: this.mapStripeSubscriptionStatus(stripeSubscription.status),
        },
      });

      if (stripeSubscription.paymentIntentId) {
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            gatewayTransactionId: stripeSubscription.paymentIntentId,
          },
        });
      }

      if (stripeSubscription.status === 'active') {
        const approvedPayment = await this.activateSubscriptionPayment(payment.id);
        return this.toCheckoutResponse(
          approvedPayment,
          stripeSubscription,
          true,
          appliedCoupon?.result.warning ?? null,
        );
      }

      const pendingPayment = await this.prisma.payment.findUniqueOrThrow({
        where: { id: payment.id },
      });

      return this.toCheckoutResponse(
        pendingPayment,
        stripeSubscription,
        false,
        appliedCoupon?.result.warning ?? null,
      );
    } catch (error) {
      if (paymentId) {
        await this.markInitialSetupFailed(paymentId);
      } else if (subscriptionId) {
        await this.prisma.subscription.update({
          where: { id: subscriptionId },
          data: {
            status: 'CANCELED',
            canceledAt: new Date(),
            endedAt: new Date(),
          },
        });
      }

      if (!paymentId && appliedCoupon) {
        await this.couponsService.releaseReservation(appliedCoupon.userCouponId);
      }

      throw error;
    }
  }

  async getMySubscription(userId: string) {
    const currentSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['ACTIVE', 'PENDING', 'OVERDUE'],
        },
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (currentSubscription) {
      return {
        subscription: this.toSubscriptionResponse(currentSubscription),
      };
    }

    const lastSubscription = await this.prisma.subscription.findFirst({
      where: { userId },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      subscription: lastSubscription
        ? this.toSubscriptionResponse(lastSubscription)
        : null,
    };
  }

  async cancelAtPeriodEnd(userId: string, subscriptionId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        userId,
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException('Assinatura não encontrada.');
    }

    if (!['ACTIVE', 'OVERDUE', 'PENDING'].includes(subscription.status)) {
      throw new BadRequestException(
        'A assinatura atual não pode mais ser cancelada no fim do período.',
      );
    }

    if (subscription.cancelAtPeriodEnd) {
      return this.toSubscriptionResponse(subscription);
    }

    if (!subscription.stripeSubscriptionId) {
      throw new BadRequestException('Assinatura sem referência no Stripe.');
    }

    const stripeSubscription = await this.stripeService.cancelSubscriptionAtPeriodEnd(
      subscription.stripeSubscriptionId,
    );

    const updatedSubscription = await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
        currentPeriodStart: stripeSubscription.currentPeriodStart ?? undefined,
        currentPeriodEnd: stripeSubscription.currentPeriodEnd ?? undefined,
        canceledAt: stripeSubscription.canceledAt ?? undefined,
        endedAt: stripeSubscription.endedAt ?? undefined,
        status: this.mapStripeSubscriptionStatus(stripeSubscription.status),
      },
      include: {
        plan: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.toSubscriptionResponse(updatedSubscription);
  }

  async handleInvoicePaid(invoice: StripeInvoiceObject) {
    const stripeSubscriptionId = this.extractSubscriptionId(invoice.subscription);

    if (!stripeSubscriptionId) {
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      return;
    }

    const paymentIntentId = this.extractPaymentIntentId(invoice.payment_intent);
    const period = this.extractInvoicePeriod(invoice);

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'ACTIVE',
        startedAt:
          subscription.startedAt ??
          period.currentPeriodStart ??
          subscription.currentPeriodStart ??
          new Date(),
        currentPeriodStart:
          period.currentPeriodStart ?? subscription.currentPeriodStart ?? undefined,
        currentPeriodEnd:
          period.currentPeriodEnd ?? subscription.currentPeriodEnd ?? undefined,
      },
    });

    let payment = paymentIntentId
      ? await this.prisma.payment.findFirst({
          where: { gatewayTransactionId: paymentIntentId },
        })
      : null;

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          userId: subscription.userId,
          purpose: 'PLAN_SUBSCRIPTION',
          subscriptionId: subscription.id,
          originalAmountCents: subscription.plan.priceCents,
          discountAmountCents: 0,
          walletAmountCents: 0,
          finalAmountCents:
            invoice.amount_paid ?? invoice.amount_due ?? subscription.plan.priceCents,
          status: 'PENDING',
          gatewayTransactionId: paymentIntentId ?? undefined,
        },
      });
    }

    await this.activateSubscriptionPayment(payment.id);
  }

  async handleInvoicePaymentFailed(invoice: StripeInvoiceObject) {
    const stripeSubscriptionId = this.extractSubscriptionId(invoice.subscription);

    if (!stripeSubscriptionId) {
      return;
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId },
      include: { plan: true },
    });

    if (!subscription) {
      return;
    }

    const paymentIntentId = this.extractPaymentIntentId(invoice.payment_intent);

    let payment = paymentIntentId
      ? await this.prisma.payment.findFirst({
          where: { gatewayTransactionId: paymentIntentId },
        })
      : null;

    if (!payment) {
      payment = await this.prisma.payment.create({
        data: {
          userId: subscription.userId,
          purpose: 'PLAN_SUBSCRIPTION',
          subscriptionId: subscription.id,
          originalAmountCents: subscription.plan.priceCents,
          discountAmountCents: 0,
          walletAmountCents: 0,
          finalAmountCents:
            invoice.amount_due ?? invoice.amount_paid ?? subscription.plan.priceCents,
          status: 'FAILED',
          gatewayTransactionId: paymentIntentId ?? undefined,
        },
      });
    } else if (payment.status !== PaymentStatus.APPROVED) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'OVERDUE',
      },
    });

    if (payment.userCouponId) {
      await this.couponsService.releaseReservation(payment.userCouponId);
    }
  }

  async syncSubscriptionFromGateway(stripeSubscription: StripeSubscriptionObject) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: this.mapStripeSubscriptionStatus(stripeSubscription.status),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end ?? false,
        currentPeriodStart: stripeSubscription.current_period_start
          ? new Date(stripeSubscription.current_period_start * 1000)
          : undefined,
        currentPeriodEnd: stripeSubscription.current_period_end
          ? new Date(stripeSubscription.current_period_end * 1000)
          : undefined,
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : undefined,
        endedAt: stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000)
          : undefined,
      },
    });
  }

  async expireSubscriptionFromGateway(stripeSubscription: StripeSubscriptionObject) {
    const subscription = await this.prisma.subscription.findFirst({
      where: { stripeSubscriptionId: stripeSubscription.id },
    });

    if (!subscription) {
      return;
    }

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'EXPIRED',
        cancelAtPeriodEnd: false,
        canceledAt: stripeSubscription.canceled_at
          ? new Date(stripeSubscription.canceled_at * 1000)
          : subscription.canceledAt ?? new Date(),
        endedAt: stripeSubscription.ended_at
          ? new Date(stripeSubscription.ended_at * 1000)
          : new Date(),
      },
    });
  }

  private async ensureNoBlockingSubscription(userId: string) {
    const blockingSubscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: {
          in: ['PENDING', 'ACTIVE', 'OVERDUE'],
        },
      },
    });

    if (blockingSubscription) {
      throw new ConflictException(
        'O paciente já possui uma assinatura ativa, pendente ou inadimplente.',
      );
    }
  }

  private async markInitialSetupFailed(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        userCouponId: true,
        subscriptionId: true,
      },
    });

    if (!payment) {
      return;
    }

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'FAILED',
      },
    });

    if (payment.subscriptionId) {
      await this.prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: {
          status: 'CANCELED',
          canceledAt: new Date(),
          endedAt: new Date(),
        },
      });
    }

    if (payment.userCouponId) {
      await this.couponsService.releaseReservation(payment.userCouponId);
    }
  }

  private async activateSubscriptionPayment(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        subscriptionId: true,
        userCouponId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    if (payment.status === PaymentStatus.APPROVED) {
      return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    }

    if (!payment.subscriptionId) {
      throw new BadRequestException('Pagamento sem assinatura vinculada.');
    }

    await this.prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          status: true,
          userCouponId: true,
          subscriptionId: true,
        },
      });

      if (!currentPayment || currentPayment.status === PaymentStatus.APPROVED) {
        return;
      }

      if (currentPayment.userCouponId) {
        await this.couponsService.consumeCouponInTransaction(
          tx,
          currentPayment.userCouponId,
        );
      }

      const subscription = await tx.subscription.findUnique({
        where: { id: currentPayment.subscriptionId! },
        select: {
          startedAt: true,
          currentPeriodStart: true,
        },
      });

      await tx.subscription.update({
        where: { id: currentPayment.subscriptionId! },
        data: {
          status: 'ACTIVE',
          startedAt:
            subscription?.startedAt ??
            subscription?.currentPeriodStart ??
            new Date(),
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          paidAt: new Date(),
        },
      });
    });

    return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }

  private mapStripeSubscriptionStatus(status: string): SubscriptionStatus {
    if (['active', 'trialing'].includes(status)) {
      return 'ACTIVE';
    }

    if (['past_due', 'unpaid'].includes(status)) {
      return 'OVERDUE';
    }

    if (['canceled', 'incomplete_expired'].includes(status)) {
      return 'CANCELED';
    }

    return 'PENDING';
  }

  private extractSubscriptionId(
    subscription: StripeInvoiceObject['subscription'],
  ): string | null {
    if (!subscription) {
      return null;
    }

    return typeof subscription === 'string' ? subscription : subscription.id;
  }

  private extractPaymentIntentId(
    paymentIntent: StripeInvoiceObject['payment_intent'],
  ): string | null {
    if (!paymentIntent) {
      return null;
    }

    return typeof paymentIntent === 'string' ? paymentIntent : paymentIntent.id;
  }

  private extractInvoicePeriod(invoice: StripeInvoiceObject) {
    const firstLine = invoice.lines?.data?.[0];

    return {
      currentPeriodStart: firstLine?.period?.start
        ? new Date(firstLine.period.start * 1000)
        : null,
      currentPeriodEnd: firstLine?.period?.end
        ? new Date(firstLine.period.end * 1000)
        : null,
    };
  }

  private toCheckoutResponse(
    payment: {
      id: string;
      subscriptionId: string | null;
      status: PaymentStatus;
      originalAmountCents: number;
      discountAmountCents: number;
      finalAmountCents: number;
      gatewayTransactionId: string | null;
      paidAt: Date | null;
    },
    stripeSubscription: StripeSubscriptionResult,
    subscriptionActivated: boolean,
    warning: string | null,
  ) {
    return {
      id: payment.id,
      subscriptionId: payment.subscriptionId,
      status: payment.status,
      originalAmountCents: payment.originalAmountCents,
      discountAmountCents: payment.discountAmountCents,
      finalAmountCents: payment.finalAmountCents,
      gatewayTransactionId: payment.gatewayTransactionId,
      paidAt: payment.paidAt,
      clientSecret: stripeSubscription.clientSecret,
      currentPeriodStart: stripeSubscription.currentPeriodStart,
      currentPeriodEnd: stripeSubscription.currentPeriodEnd,
      cancelAtPeriodEnd: stripeSubscription.cancelAtPeriodEnd,
      subscriptionActivated,
      warning,
    };
  }

  private toSubscriptionResponse(subscription: {
    id: string;
    userId: string;
    planId: string;
    status: SubscriptionStatus;
    stripeSubscriptionId: string | null;
    startedAt: Date | null;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    canceledAt: Date | null;
    endedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    plan: {
      id: string;
      name: string;
      description: string | null;
      priceCents: number;
      billingCycle: string;
      benefits: string[];
      stripeProductId: string;
      stripePriceId: string;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    };
    payments: Array<{
      id: string;
      status: PaymentStatus;
      finalAmountCents: number;
      paidAt: Date | null;
      createdAt: Date;
    }>;
  }) {
    return {
      id: subscription.id,
      userId: subscription.userId,
      planId: subscription.planId,
      status: subscription.status,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      startedAt: subscription.startedAt,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      canceledAt: subscription.canceledAt,
      endedAt: subscription.endedAt,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      plan: subscription.plan,
      latestPayment: subscription.payments[0] ?? null,
    };
  }
}
