import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { couponResponseSchema } from './coupon.schemas';

export function GetCouponByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca cupom por ID',
      description: 'Retorna os detalhes de um cupom específico. Apenas administradores.',
    }),
    ApiUuidParam('id', 'ID do cupom'),
    ApiOkResponse({
      description: 'Dados do cupom.',
      schema: couponResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
