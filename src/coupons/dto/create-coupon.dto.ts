import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CouponCategory, CouponDiscountType, CouponDistributionType } from '@prisma/client';

export class CreateCouponDto {
  @IsString({ message: 'O código do cupom deve ser uma string' })
  @IsNotEmpty({ message: 'O código do cupom é obrigatório' })
  @MaxLength(50, { message: 'O código do cupom deve ter no máximo 50 caracteres' })
  code!: string;

  @IsString({ message: 'O título do cupom deve ser uma string' })
  @IsNotEmpty({ message: 'O título do cupom é obrigatório' })
  @MaxLength(255, { message: 'O título do cupom deve ter no máximo 255 caracteres' })
  title!: string;

  @IsOptional()
  @IsString({ message: 'A descrição do cupom deve ser uma string' })
  description?: string;

  @IsEnum(CouponCategory, { message: 'Categoria inválida' })
  @IsNotEmpty({ message: 'A categoria do cupom é obrigatória' })
  category!: CouponCategory;

  @IsEnum(CouponDiscountType, { message: 'Tipo de desconto inválido' })
  @IsNotEmpty({ message: 'O tipo de desconto é obrigatório' })
  discountType!: CouponDiscountType;

  @IsNumber({}, { message: 'O valor do desconto deve ser um número' })
  @IsNotEmpty({ message: 'O valor do desconto é obrigatório' })
  @Min(0, { message: 'O valor do desconto não pode ser negativo' })
  discountValue!: number;

  @IsOptional()
  @IsInt({ message: 'O teto de desconto deve ser um número inteiro (em centavos)' })
  @Min(0, { message: 'O teto de desconto não pode ser negativo' })
  maxDiscountCents?: number;

  @IsOptional()
  @IsInt({ message: 'O valor mínimo de compra deve ser um número inteiro (em centavos)' })
  @Min(0, { message: 'O valor mínimo de compra não pode ser negativo' })
  minPurchaseCents?: number;

  @IsOptional()
  @IsInt({ message: 'O limite de usos deve ser um número inteiro' })
  @Min(1, { message: 'O limite de usos deve ser no mínimo 1' })
  maxUses?: number;

  @IsOptional()
  @IsInt({ message: 'O limite de usos por usuário deve ser um número inteiro' })
  @Min(1, { message: 'O limite de usos por usuário deve ser no mínimo 1' })
  maxUsesPerUser?: number;

  @IsOptional()
  @IsEnum(CouponDistributionType, { message: 'Tipo de distribuição inválido' })
  distributionType?: CouponDistributionType;

  @IsOptional()
  @IsBoolean({ message: 'firstMonthOnly deve ser um booleano' })
  firstMonthOnly?: boolean;

  @IsDateString({}, { message: 'A data de expiração deve ser uma data ISO 8601 válida' })
  @IsNotEmpty({ message: 'A data de expiração é obrigatória' })
  expiresAt!: string;

  @IsOptional()
  @IsBoolean({ message: 'isActive deve ser um booleano' })
  isActive?: boolean;
}
