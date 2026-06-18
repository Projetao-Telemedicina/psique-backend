import { applyDecorators } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';
import { reserveCouponResponseSchema } from './coupon.schemas';

export function ReserveCouponApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Reserva um cupom',
      description:
        'Bloqueia temporariamente um cupom do paciente por 15 minutos durante o fluxo de checkout. ' +
        'Evita que o cupom seja usado concorrentemente.',
    }),
    ApiUuidParam('id', 'ID do UserCoupon'),
    ApiCreatedResponse({
      description: 'Cupom reservado com sucesso.',
      schema: reserveCouponResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
