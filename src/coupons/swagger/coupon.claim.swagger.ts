import { applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { claimCouponResponseSchema } from './coupon.schemas';

export function ClaimCouponApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Resgata um cupom público',
      description:
        'Permite que um paciente resgate um cupom de distribuição pública. ' +
        'O cupom é vinculado ao paciente como um UserCoupon disponível.',
    }),
    ApiUuidParam('id', 'ID do cupom'),
    ApiCreatedResponse({
      description: 'Cupom resgatado com sucesso.',
      schema: claimCouponResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
