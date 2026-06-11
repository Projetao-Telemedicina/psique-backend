import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import {
  couponResponseSchema,
  createCouponRequestSchema,
} from './coupon.schemas';

export function CreateCouponApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria um novo cupom',
      description:
        'Cria um cupom com as configurações fornecidas. Apenas administradores podem criar cupons.',
    }),
    ApiBody({
      required: true,
      schema: createCouponRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Cupom criado com sucesso.',
      schema: couponResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
    }),
  );
}
