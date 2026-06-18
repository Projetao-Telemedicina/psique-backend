import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { couponListResponseSchema } from './coupon.schemas';

export function GetAllCouponsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista todos os cupons',
      description:
        'Retorna todos os cupons cadastrados ordenados por data de expiração. Apenas administradores.',
    }),
    ApiOkResponse({
      description: 'Lista de cupons.',
      schema: couponListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
    }),
  );
}
