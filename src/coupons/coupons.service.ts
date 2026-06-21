import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CouponCategory, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/index';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

const DEFAULT_MAX_DISCOUNT_CENTS = 10000;
const COUPON_RESERVATION_WINDOW_MS = 15 * 60 * 1000;

export interface ApplyCouponResult {
  originalAmountCents: number;
  discountAppliedCents: number;
  finalAmountCents: number;
  couponCode: string;
  message: string;
  couponStatus: string;
  warning: string | null;
}

export interface ApplicableCouponPreview {
  userCouponId: string;
  result: ApplyCouponResult;
}

type UserCouponWithCoupon = {
  id: string;
  userId: string;
  couponId: string;
  isUsed: boolean;
  reservedAt: Date | null;
  coupon: {
    code: string;
    expiresAt: Date;
    category: CouponCategory;
    discountType: string;
    discountValue: unknown;
    maxDiscountCents: number | null;
    minPurchaseCents: number | null;
    firstMonthOnly: boolean;
    isActive: boolean;
    maxUses: number | null;
    currentUses: number;
  };
};

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    return this.prisma.coupon.create({
      data: {
        code: dto.code,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        maxDiscountCents: dto.maxDiscountCents,
        minPurchaseCents: dto.minPurchaseCents,
        maxUses: dto.maxUses,
        maxUsesPerUser: dto.maxUsesPerUser ?? 1,
        distributionType: dto.distributionType ?? 'PUBLIC',
        firstMonthOnly: dto.firstMonthOnly ?? false,
        expiresAt: new Date(dto.expiresAt),
        isActive: dto.isActive ?? true,
      },
    });
  }

  async getAll() {
    return this.prisma.coupon.findMany({
      orderBy: { expiresAt: 'asc' },
    });
  }

  async getById(id: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });

    if (!coupon) {
      throw new NotFoundException('Cupom não encontrado');
    }

    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.getById(id);

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.discountType !== undefined && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.maxDiscountCents !== undefined && { maxDiscountCents: dto.maxDiscountCents }),
        ...(dto.minPurchaseCents !== undefined && { minPurchaseCents: dto.minPurchaseCents }),
        ...(dto.maxUses !== undefined && { maxUses: dto.maxUses }),
        ...(dto.maxUsesPerUser !== undefined && { maxUsesPerUser: dto.maxUsesPerUser }),
        ...(dto.distributionType !== undefined && { distributionType: dto.distributionType }),
        ...(dto.firstMonthOnly !== undefined && { firstMonthOnly: dto.firstMonthOnly }),
        ...(dto.expiresAt !== undefined && { expiresAt: new Date(dto.expiresAt) }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);

    return this.prisma.coupon.delete({ where: { id } });
  }

  async listMyCoupons(userId: string) {
    const userCoupons = await this.prisma.userCoupon.findMany({
      where: {
        userId,
        isUsed: false,
        coupon: {
          expiresAt: { gt: new Date() },
          isActive: true,
        },
      },
      include: {
        coupon: true,
      },
      orderBy: {
        coupon: { expiresAt: 'asc' },
      },
    });

    return userCoupons.map((uc) => ({
      userCouponId: uc.id,
      code: uc.coupon.code,
      title: uc.coupon.title,
      category: uc.coupon.category,
      discountType: uc.coupon.discountType,
      discountValue: Number(uc.coupon.discountValue),
      maxDiscountCents: uc.coupon.maxDiscountCents,
      expiresAt: uc.coupon.expiresAt,
    }));
  }

  async applyCoupon(
    userId: string,
    userCouponId: string,
    amountCents: number,
    category: CouponCategory,
  ): Promise<ApplyCouponResult> {
    const userCoupon = await this.prisma.userCoupon.findUnique({
      where: { id: userCouponId },
      include: { coupon: true },
    });

    this.ensureCouponCanBeApplied(userCoupon, userId, category, amountCents);
    const applicableUserCoupon = userCoupon as UserCouponWithCoupon;

    const { discountCents, warning } = this.calculateDiscount(
      amountCents,
      applicableUserCoupon.coupon.discountType,
      Number(applicableUserCoupon.coupon.discountValue),
      applicableUserCoupon.coupon.maxDiscountCents,
      applicableUserCoupon.coupon.firstMonthOnly,
    );

    return {
      originalAmountCents: amountCents,
      discountAppliedCents: discountCents,
      finalAmountCents: amountCents - discountCents,
      couponCode: applicableUserCoupon.coupon.code,
      message: 'Desconto aplicado',
      couponStatus: 'applied',
      warning,
    };
  }

  async validateApplication(
    userId: string,
    userCouponId: string,
    category: CouponCategory,
    amountCents?: number,
  ) {
    const userCoupon = await this.prisma.userCoupon.findUnique({
      where: { id: userCouponId },
      include: { coupon: true },
    });

    this.ensureCouponCanBeApplied(userCoupon, userId, category, amountCents);

    return { valid: true, userCoupon };
  }

  async findBestApplicableCoupon(
    userId: string,
    category: CouponCategory,
    amountCents: number,
  ): Promise<ApplicableCouponPreview | null> {
    const userCoupons = await this.prisma.userCoupon.findMany({
      where: {
        userId,
        isUsed: false,
        reservedAt: null,
        coupon: {
          isActive: true,
          expiresAt: { gt: new Date() },
          category,
        },
      },
      include: {
        coupon: true,
      },
      orderBy: {
        coupon: { expiresAt: 'asc' },
      },
    });

    const candidates = userCoupons
      .filter((userCoupon) => {
        if (
          userCoupon.coupon.maxUses !== null &&
          userCoupon.coupon.currentUses >= userCoupon.coupon.maxUses
        ) {
          return false;
        }

        if (
          userCoupon.coupon.minPurchaseCents !== null &&
          amountCents < userCoupon.coupon.minPurchaseCents
        ) {
          return false;
        }

        return true;
      })
      .map((userCoupon) => {
        const { discountCents, warning } = this.calculateDiscount(
          amountCents,
          userCoupon.coupon.discountType,
          Number(userCoupon.coupon.discountValue),
          userCoupon.coupon.maxDiscountCents,
          userCoupon.coupon.firstMonthOnly,
        );

        return {
          userCouponId: userCoupon.id,
          expiresAt: userCoupon.coupon.expiresAt,
          result: {
            originalAmountCents: amountCents,
            discountAppliedCents: discountCents,
            finalAmountCents: amountCents - discountCents,
            couponCode: userCoupon.coupon.code,
            message: 'Desconto aplicado automaticamente',
            couponStatus: 'auto_applied',
            warning,
          } satisfies ApplyCouponResult,
        };
      })
      .sort((left, right) => {
        if (right.result.discountAppliedCents !== left.result.discountAppliedCents) {
          return right.result.discountAppliedCents - left.result.discountAppliedCents;
        }

        return left.expiresAt.getTime() - right.expiresAt.getTime();
      });

    if (candidates.length === 0) {
      return null;
    }

    return {
      userCouponId: candidates[0].userCouponId,
      result: candidates[0].result,
    };
  }

  calculateDiscount(
    amountCents: number,
    discountType: string,
    discountValue: number,
    maxDiscountCents: number | null,
    firstMonthOnly: boolean,
  ): { discountCents: number; warning: string | null } {
    let discountCents: number;

    if (discountType === 'PERCENTAGE') {
      const maxDiscount = maxDiscountCents ?? DEFAULT_MAX_DISCOUNT_CENTS;
      const rawDiscount = Math.floor((amountCents * discountValue) / 100);
      discountCents = Math.min(rawDiscount, maxDiscount);
    } else {
      const fixedDiscountCents = Math.round(discountValue * 100);
      discountCents = Math.min(fixedDiscountCents, amountCents);
    }

    const warning = firstMonthOnly
      ? 'Desconto aplicado apenas para o primeiro mês'
      : null;

    return { discountCents, warning };
  }

  async reserveCoupon(userId: string, userCouponId: string) {
    const userCoupon = await this.prisma.userCoupon.findUnique({
      where: { id: userCouponId },
      include: { coupon: true },
    });

    if (!userCoupon) {
      throw new BadRequestException('Cupom não encontrado');
    }

    this.ensureCouponCanBeApplied(
      userCoupon,
      userId,
      userCoupon.coupon.category,
    );

    if (userCoupon.reservedAt !== null) {
      throw new BadRequestException('Este cupom já está reservado');
    }

    return this.prisma.userCoupon.update({
      where: { id: userCouponId },
      data: { reservedAt: new Date() },
    });
  }

  async releaseReservation(userCouponId: string) {
    return this.prisma.userCoupon.update({
      where: { id: userCouponId },
      data: { reservedAt: null },
    });
  }

  async consumeCoupon(userCouponId: string) {
    return this.prisma.$transaction(async (tx) => {
      return this.consumeCouponInTransaction(tx, userCouponId);
    });
  }

  async consumeCouponInTransaction(
    tx: Prisma.TransactionClient,
    userCouponId: string,
  ) {
    const userCoupon = await tx.userCoupon.findUnique({
      where: { id: userCouponId },
      include: { coupon: true },
    });

    if (!userCoupon) {
      throw new BadRequestException('Cupom não encontrado');
    }

    if (userCoupon.isUsed) {
      throw new BadRequestException('Este cupom já foi utilizado');
    }

    if (
      userCoupon.reservedAt !== null &&
      userCoupon.reservedAt.getTime() < Date.now() - COUPON_RESERVATION_WINDOW_MS
    ) {
      throw new BadRequestException('A reserva deste cupom expirou');
    }

    if (
      userCoupon.coupon.maxUses !== null &&
      userCoupon.coupon.currentUses >= userCoupon.coupon.maxUses
    ) {
      throw new BadRequestException('Limite de usos do cupom atingido');
    }

    await tx.coupon.update({
      where: { id: userCoupon.couponId },
      data: { currentUses: { increment: 1 } },
    });

    return tx.userCoupon.update({
      where: { id: userCouponId },
      data: {
        isUsed: true,
        usedAt: new Date(),
        reservedAt: null,
      },
    });
  }

  async claimPublicCoupon(userId: string, couponId: string) {
    const coupon = await this.getById(couponId);

    if (coupon.distributionType !== 'PUBLIC') {
      throw new BadRequestException('Este cupom não está disponível para resgate');
    }

    if (!coupon.isActive) {
      throw new BadRequestException('Este cupom não está mais ativo');
    }

    if (coupon.expiresAt <= new Date()) {
      throw new BadRequestException('Este cupom não é mais válido');
    }

    return this.prisma.userCoupon.create({
      data: {
        couponId,
        userId,
      },
    });
  }

  async distributeCoupon(couponId: string, targetUserId: string) {
    await this.getById(couponId);

    return this.prisma.userCoupon.create({
      data: {
        couponId,
        userId: targetUserId,
      },
    });
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async releaseExpiredReservations() {
    const fifteenMinutesAgo = new Date(Date.now() - COUPON_RESERVATION_WINDOW_MS);

    const result = await this.prisma.userCoupon.updateMany({
      where: {
        isUsed: false,
        reservedAt: { lt: fifteenMinutesAgo },
      },
      data: { reservedAt: null },
    });

    return result.count;
  }

  private ensureCouponCanBeApplied(
    userCoupon: UserCouponWithCoupon | null,
    userId: string,
    category: CouponCategory,
    amountCents?: number,
  ) {
    if (!userCoupon) {
      throw new BadRequestException('Cupom não encontrado');
    }

    if (userCoupon.userId !== userId) {
      throw new BadRequestException('Você não possui este cupom');
    }

    if (userCoupon.isUsed) {
      throw new BadRequestException('Este cupom já foi utilizado');
    }

    if (userCoupon.coupon.expiresAt <= new Date()) {
      throw new BadRequestException('Este cupom não é mais válido');
    }

    if (userCoupon.coupon.category !== category) {
      throw new BadRequestException('Este cupom não é válido para esta categoria');
    }

    if (!userCoupon.coupon.isActive) {
      throw new BadRequestException('Este cupom não está mais ativo');
    }

    if (
      userCoupon.coupon.maxUses !== null &&
      userCoupon.coupon.currentUses >= userCoupon.coupon.maxUses
    ) {
      throw new BadRequestException('Limite de usos do cupom atingido');
    }

    if (
      amountCents !== undefined &&
      userCoupon.coupon.minPurchaseCents !== null &&
      amountCents < userCoupon.coupon.minPurchaseCents
    ) {
      throw new BadRequestException('Valor mínimo para este cupom não atingido');
    }
  }
}
