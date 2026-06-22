import { PlanBillingCycle } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @IsString({ message: 'O nome do plano deve ser uma string' })
  @IsNotEmpty({ message: 'O nome do plano é obrigatório' })
  @MaxLength(120, { message: 'O nome do plano deve ter no máximo 120 caracteres' })
  name!: string;

  @IsOptional()
  @IsString({ message: 'A descrição do plano deve ser uma string' })
  @MaxLength(500, {
    message: 'A descrição do plano deve ter no máximo 500 caracteres',
  })
  description?: string;

  @IsInt({ message: 'O preço deve ser um número inteiro em centavos' })
  @Min(0, { message: 'O preço do plano não pode ser negativo' })
  priceCents!: number;

  @IsEnum(PlanBillingCycle, { message: 'O ciclo de cobrança informado é inválido' })
  billingCycle!: PlanBillingCycle;

  @IsArray({ message: 'Os benefícios do plano devem ser informados em uma lista' })
  @ArrayMinSize(1, { message: 'Informe ao menos um benefício do plano' })
  @IsString({
    each: true,
    message: 'Cada benefício do plano deve ser um texto válido',
  })
  benefits!: string[];

  @IsString({ message: 'O Stripe Product ID deve ser uma string' })
  @IsNotEmpty({ message: 'O Stripe Product ID é obrigatório' })
  @MaxLength(255, {
    message: 'O Stripe Product ID deve ter no máximo 255 caracteres',
  })
  stripeProductId!: string;

  @IsString({ message: 'O Stripe Price ID deve ser uma string' })
  @IsNotEmpty({ message: 'O Stripe Price ID é obrigatório' })
  @MaxLength(255, {
    message: 'O Stripe Price ID deve ter no máximo 255 caracteres',
  })
  stripePriceId!: string;
}
