import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  Min,
} from 'class-validator';

export class CheckoutAppointmentDto {
  @IsUUID('4', { message: 'O ID do profissional deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do profissional é obrigatório' })
  professionalId!: string;

  @IsUUID('4', { message: 'O ID do método de pagamento deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do método de pagamento é obrigatório' })
  paymentMethodId!: string;

  @IsDateString({}, { message: 'A data de início deve ser uma data e hora ISO 8601 válida' })
  @IsNotEmpty({ message: 'A data de início é obrigatória' })
  startsAt!: string;

  @IsDateString({}, { message: 'A data de término deve ser uma data e hora ISO 8601 válida' })
  @IsNotEmpty({ message: 'A data de término é obrigatória' })
  endsAt!: string;

  @IsInt({ message: 'O preço deve ser um número inteiro (em centavos)' })
  @Min(0, { message: 'O preço não pode ser negativo' })
  priceCents!: number;

  @IsOptional()
  @IsUUID('4', { message: 'O ID do cupom do usuário deve ser um UUID válido' })
  userCouponId?: string;
}
