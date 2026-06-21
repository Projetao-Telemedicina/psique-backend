import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class SavePaymentMethodDto {
  @IsString({ message: 'O ID do método de pagamento do Stripe deve ser uma string' })
  @IsNotEmpty({ message: 'O ID do método de pagamento do Stripe é obrigatório' })
  @MaxLength(255, {
    message: 'O ID do método de pagamento do Stripe deve ter no máximo 255 caracteres',
  })
  stripePaymentMethodId!: string;

  @IsOptional()
  @IsBoolean({ message: 'O campo isDefault deve ser booleano' })
  isDefault?: boolean;
}
