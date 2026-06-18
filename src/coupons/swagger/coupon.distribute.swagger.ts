import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { distributeCouponResponseSchema } from './coupon.schemas';
import { DistributeCouponDto } from '../dto/distribute-coupon.dto';

export function DistributeCouponApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Distribui cupom para um usuário',
      description:
        'Permite que um administrador distribua um cupom diretamente a um paciente específico.',
    }),
    ApiUuidParam('id', 'ID do cupom'),
    ApiBody({
      required: true,
      type: DistributeCouponDto,
    }),
    ApiCreatedResponse({
      description: 'Cupom distribuído com sucesso.',
      schema: distributeCouponResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
