import { IsNotEmpty, IsUUID } from 'class-validator';

export class DistributeCouponDto {
  @IsUUID('4', { message: 'O ID do usuário destino deve ser um UUID válido' })
  @IsNotEmpty({ message: 'O ID do usuário destino é obrigatório' })
  targetUserId!: string;
}
