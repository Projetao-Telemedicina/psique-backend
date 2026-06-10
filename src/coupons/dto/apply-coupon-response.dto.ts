import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyCouponResponseDto {
  @ApiProperty({ description: 'Valor original da transação em centavos', example: 10000 })
  originalAmountCents!: number;

  @ApiProperty({ description: 'Valor do desconto aplicado em centavos', example: 2000 })
  discountAppliedCents!: number;

  @ApiProperty({ description: 'Valor final após desconto em centavos', example: 8000 })
  finalAmountCents!: number;

  @ApiProperty({ description: 'Código do cupom aplicado', example: 'PSIQUE-BEMVINDO' })
  couponCode!: string;

  @ApiProperty({ description: 'Mensagem de resultado', example: 'Desconto aplicado' })
  message!: string;

  @ApiProperty({ description: 'Status do cupom após aplicação', example: 'applied' })
  couponStatus!: string;

  @ApiPropertyOptional({
    description: 'Aviso adicional (ex: desconto apenas no primeiro mês)',
    example: 'Desconto aplicado apenas para o primeiro mês',
  })
  warning?: string | null;
}
