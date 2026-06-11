export class UserCouponResponseDto {
  userCouponId!: string;
  code!: string;
  title!: string;
  category!: string;
  discountType!: string;
  discountValue!: number;
  maxDiscountCents!: number | null;
  expiresAt!: Date;
}
