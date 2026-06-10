import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { applyCouponRequestSchema, applyCouponResponseSchema } from './coupon.schemas';

export function ApplyCouponApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Aplica um cupom',
      description:
        'Calcula o desconto de um cupom sobre um valor de transação. ' +
        'O cupom é validado (existência, expiração, categoria, usos) e o desconto é retornado sem alterar o estado do cupom. ' +
        'Idempotente: chamadas repetidas com os mesmos parâmetros retornam o mesmo resultado.',
    }),
    ApiBody({
      required: true,
      schema: applyCouponRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Desconto calculado com sucesso.',
      schema: applyCouponResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
    }),
  );
}
