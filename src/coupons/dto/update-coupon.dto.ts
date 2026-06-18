import { PartialType, PickType } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';

export class UpdateCouponDto extends PartialType(
  PickType(CreateCouponDto, [
    'title',
    'description',
    'category',
    'discountType',
    'discountValue',
    'maxDiscountCents',
    'minPurchaseCents',
    'maxUses',
    'maxUsesPerUser',
    'distributionType',
    'firstMonthOnly',
    'expiresAt',
    'isActive',
  ] as const),
) {}
