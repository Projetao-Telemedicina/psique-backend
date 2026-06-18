import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { couponResponseSchema, updateCouponRequestSchema } from './coupon.schemas';

export function UpdateCouponApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza um cupom',
      description:
        'Atualiza os dados de um cupom existente. Apenas administradores.',
    }),
    ApiUuidParam('id', 'ID do cupom'),
    ApiBody({
      required: true,
      schema: updateCouponRequestSchema,
    }),
    ApiOkResponse({
      description: 'Cupom atualizado com sucesso.',
      schema: couponResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
