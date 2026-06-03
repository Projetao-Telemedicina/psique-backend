export class ApplyCouponResponseDto {
  subtotalCents!: number;
  discountCents!: number;
  totalCents!: number;
  couponCode!: string;
  warning!: string | null;
}
