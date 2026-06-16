import { IsNotEmpty, IsUUID } from 'class-validator';

export class CheckoutPromotionDto {
  @IsUUID('4', { message: 'O ID do plano de impulsionamento deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do plano de impulsionamento é obrigatório' })
  promotionPlanId!: string;

  @IsUUID('4', { message: 'O ID do método de pagamento deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do método de pagamento é obrigatório' })
  paymentMethodId!: string;
}
