import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  PaymentStatus,
  ProfessionalApprovalStatus,
  PromotionStatus,
  UserStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma';
import { CheckoutPromotionDto } from './dto/checkout-promotion.dto';
import { PaymentMethodsService } from './payment-methods.service';
import { PromotionPlansService } from './promotion-plans.service';
import { StripeService } from './stripe/stripe.service';

const PROMOTION_PAYMENT_FAILURE_REASON = 'Pagamento do impulsionamento não aprovado.';

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionPlansService: PromotionPlansService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly stripeService: StripeService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleExpiredPromotions() {
    await this.syncExpiredPromotions();
  }

  async checkoutPromotion(userId: string, dto: CheckoutPromotionDto) {
    await this.syncExpiredPromotions();
    await this.ensureEligibleProfessional(userId);
    await this.ensureNoBlockingPromotion(userId);

    const promotionPlan = await this.promotionPlansService.getActivePlanById(
      dto.promotionPlanId,
    );
    const paymentMethod = await this.paymentMethodsService.getOwnedPaymentMethod(
      userId,
      dto.paymentMethodId,
    );
    const customerId = await this.paymentMethodsService.getStripeCustomerId(userId);

    let promotionId: string | null = null;
    let paymentId: string | null = null;

    try {
      const promotion = await this.prisma.professionalPromotion.create({
        data: {
          professionalId: userId,
          promotionPlanId: promotionPlan.id,
          status: 'PENDING',
        },
      });

      promotionId = promotion.id;

      const payment = await this.prisma.payment.create({
        data: {
          userId,
          paymentMethodId: paymentMethod.id,
          purpose: 'PROFILE_PROMOTION',
          promotionId: promotion.id,
          originalAmountCents: promotionPlan.priceCents,
          discountAmountCents: 0,
          walletAmountCents: 0,
          finalAmountCents: promotionPlan.priceCents,
          status: 'PENDING',
        },
      });

      paymentId = payment.id;

      if (promotionPlan.priceCents === 0) {
        return this.activatePromotionPayment(payment.id, null);
      }

      const paymentIntent = await this.stripeService.createAndConfirmPaymentIntent({
        amountCents: promotionPlan.priceCents,
        customerId,
        paymentMethodId: paymentMethod.gatewayToken,
        metadata: {
          paymentId: payment.id,
          promotionId: promotion.id,
          promotionPlanId: promotionPlan.id,
          purpose: 'PROFILE_PROMOTION',
          userId,
        },
      });

      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayTransactionId: paymentIntent.id },
      });

      if (paymentIntent.status === 'succeeded') {
        return this.activatePromotionPayment(payment.id, paymentIntent.id);
      }

      if (this.isPendingStripeStatus(paymentIntent.status)) {
        return this.buildCheckoutResponse(payment.id, paymentIntent.clientSecret, false);
      }

      await this.markPromotionPaymentFailed(
        payment.id,
        paymentIntent.id,
        PROMOTION_PAYMENT_FAILURE_REASON,
        'FAILED',
      );

      return this.buildCheckoutResponse(payment.id, paymentIntent.clientSecret, false);
    } catch (error) {
      if (paymentId) {
        await this.markPromotionPaymentFailed(
          paymentId,
          null,
          PROMOTION_PAYMENT_FAILURE_REASON,
          'FAILED',
        );
      } else if (promotionId) {
        await this.prisma.professionalPromotion.update({
          where: { id: promotionId },
          data: {
            status: 'FAILED',
          },
        });
      }

      throw error;
    }
  }

  async activatePromotionPayment(
    paymentId: string,
    gatewayTransactionId: string | null,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        promotionId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    if (payment.status === PaymentStatus.APPROVED) {
      return this.buildCheckoutResponse(payment.id, null, true);
    }

    if (!payment.promotionId) {
      throw new BadRequestException('Pagamento sem impulsionamento vinculado.');
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          status: true,
          promotionId: true,
        },
      });

      if (!currentPayment || currentPayment.status === PaymentStatus.APPROVED) {
        return;
      }

      const promotion = await tx.professionalPromotion.findUnique({
        where: { id: currentPayment.promotionId! },
        include: {
          promotionPlan: {
            select: {
              durationDays: true,
            },
          },
        },
      });

      if (!promotion) {
        throw new NotFoundException('Impulsionamento não encontrado.');
      }

      const endsAt = this.calculatePromotionEndsAt(
        now,
        promotion.promotionPlan.durationDays,
      );

      await tx.professionalPromotion.update({
        where: { id: promotion.id },
        data: {
          status: 'ACTIVE',
          startsAt: now,
          endsAt,
        },
      });

      await tx.professionalProfile.update({
        where: { userId: promotion.professionalId },
        data: {
          isPromoted: true,
          promotionEndsAt: endsAt,
        },
      });

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'APPROVED',
          paidAt: now,
          ...(gatewayTransactionId ? { gatewayTransactionId } : {}),
        },
      });
    });

    return this.buildCheckoutResponse(payment.id, null, true);
  }

  async markPromotionPaymentFailed(
    paymentId: string,
    gatewayTransactionId: string | null,
    _reason: string,
    status: 'FAILED' | 'CANCELED',
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        promotionId: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    if (payment.status === PaymentStatus.APPROVED) {
      return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    }

    await this.prisma.$transaction(async (tx) => {
      const currentPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        select: {
          id: true,
          status: true,
          promotionId: true,
        },
      });

      if (!currentPayment || currentPayment.status === PaymentStatus.APPROVED) {
        return;
      }

      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status,
          ...(gatewayTransactionId ? { gatewayTransactionId } : {}),
        },
      });

      if (currentPayment.promotionId) {
        await tx.professionalPromotion.update({
          where: { id: currentPayment.promotionId },
          data: {
            status: status === 'CANCELED' ? 'CANCELED' : 'FAILED',
          },
        });
      }
    });

    return this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
  }

  async syncExpiredPromotions() {
    const now = new Date();
    const expiredPromotions = await this.prisma.professionalPromotion.findMany({
      where: {
        status: 'ACTIVE',
        endsAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        professionalId: true,
      },
    });

    if (expiredPromotions.length === 0) {
      return 0;
    }

    const promotionIds = expiredPromotions.map((promotion) => promotion.id);
    const professionalIds = expiredPromotions.map(
      (promotion) => promotion.professionalId,
    );

    await this.prisma.$transaction([
      this.prisma.professionalPromotion.updateMany({
        where: {
          id: {
            in: promotionIds,
          },
        },
        data: {
          status: 'EXPIRED',
        },
      }),
      this.prisma.professionalProfile.updateMany({
        where: {
          userId: {
            in: professionalIds,
          },
          isPromoted: true,
          promotionEndsAt: {
            lt: now,
          },
        },
        data: {
          isPromoted: false,
          promotionEndsAt: null,
        },
      }),
    ]);

    return expiredPromotions.length;
  }

  private async ensureEligibleProfessional(userId: string) {
    const professional = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            status: true,
          },
        },
      },
    });

    if (!professional) {
      throw new NotFoundException('Perfil do profissional não encontrado.');
    }

    if (
      professional.approvalStatus !== ProfessionalApprovalStatus.APPROVED ||
      professional.user.status !== UserStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Somente profissionais aprovados e ativos podem contratar impulsionamento.',
      );
    }
  }

  private async ensureNoBlockingPromotion(userId: string) {
    const now = new Date();
    const blockingPromotion = await this.prisma.professionalPromotion.findFirst({
      where: {
        professionalId: userId,
        OR: [
          {
            status: 'PENDING',
          },
          {
            status: 'ACTIVE',
            OR: [
              { endsAt: null },
              {
                endsAt: {
                  gt: now,
                },
              },
            ],
          },
        ],
      },
    });

    if (blockingPromotion) {
      throw new ConflictException(
        'O profissional já possui um impulsionamento ativo ou pendente.',
      );
    }
  }

  private calculatePromotionEndsAt(startsAt: Date, durationDays: number) {
    const endsAt = new Date(startsAt);
    endsAt.setUTCDate(endsAt.getUTCDate() + durationDays);
    return endsAt;
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

  private async buildCheckoutResponse(
    paymentId: string,
    clientSecret: string | null,
    promotionActivated: boolean,
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        promotion: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Pagamento não encontrado.');
    }

    return {
      id: payment.id,
      promotionId: payment.promotionId,
      status: payment.status,
      originalAmountCents: payment.originalAmountCents,
      discountAmountCents: payment.discountAmountCents,
      finalAmountCents: payment.finalAmountCents,
      gatewayTransactionId: payment.gatewayTransactionId,
      paidAt: payment.paidAt,
      clientSecret,
      startsAt: payment.promotion?.startsAt ?? null,
      endsAt: payment.promotion?.endsAt ?? null,
      promotionActivated,
      isPromoted: payment.promotion?.status === PromotionStatus.ACTIVE,
    };
  }
}
