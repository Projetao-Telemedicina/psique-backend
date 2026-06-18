import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { userCouponListResponseSchema } from './coupon.schemas';

export function ListMyCouponsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista meus cupons disponíveis',
      description:
        'Retorna os cupons válidos e não utilizados do paciente autenticado. Apenas pacientes.',
    }),
    ApiOkResponse({
      description: 'Lista de cupons do paciente.',
      schema: userCouponListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
    }),
  );
}
