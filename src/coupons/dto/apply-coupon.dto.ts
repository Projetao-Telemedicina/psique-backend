import { IsEnum, IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { CouponCategory } from '@prisma/client';

export class ApplyCouponDto {
  @IsUUID('4', { message: 'O ID do cupom do usuário deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do cupom do usuário é obrigatório' })
  userCouponId!: string;

  @IsInt({ message: 'O valor da compra deve ser um número inteiro (em centavos)' })
  @Min(0, { message: 'O valor da compra não pode ser negativo' })
  @IsNotEmpty({ message: 'O valor da compra é obrigatório' })
  amountCents!: number;

  @IsEnum(CouponCategory, { message: 'Categoria inválida' })
  @IsNotEmpty({ message: 'A categoria é obrigatória' })
  category!: CouponCategory;
}
