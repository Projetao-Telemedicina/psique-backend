import { IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

export class SubscribePlanDto {
  @IsUUID('4', { message: 'O ID do plano deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do plano é obrigatório' })
  planId!: string;

  @IsUUID('4', { message: 'O ID do método de pagamento deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do método de pagamento é obrigatório' })
  paymentMethodId!: string;

  @IsOptional()
  @IsUUID('4', { message: 'O ID do cupom do usuário deve ser um UUID válido' })
  userCouponId?: string;
}
