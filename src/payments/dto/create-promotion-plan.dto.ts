import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePromotionPlanDto {
  @IsString({ message: 'O nome do plano de impulsionamento deve ser uma string' })
  @IsNotEmpty({ message: 'O nome do plano de impulsionamento é obrigatório' })
  @MaxLength(120, {
    message: 'O nome do plano de impulsionamento deve ter no máximo 120 caracteres',
  })
  name!: string;

  @IsOptional()
  @IsString({ message: 'A descrição do plano de impulsionamento deve ser uma string' })
  @MaxLength(500, {
    message: 'A descrição do plano de impulsionamento deve ter no máximo 500 caracteres',
  })
  description?: string;

  @IsInt({ message: 'O preço deve ser um número inteiro em centavos' })
  @Min(0, { message: 'O preço do plano de impulsionamento não pode ser negativo' })
  priceCents!: number;

  @IsInt({ message: 'A duração deve ser informada em dias inteiros' })
  @Min(1, { message: 'A duração do impulsionamento deve ser de pelo menos 1 dia' })
  durationDays!: number;
}
