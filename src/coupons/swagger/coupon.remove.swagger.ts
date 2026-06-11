import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses, ApiUuidParam } from '../../common/swagger';

export function RemoveCouponApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Remove um cupom',
      description:
        'Remove um cupom do sistema. Apenas administradores.',
    }),
    ApiUuidParam('id', 'ID do cupom'),
    ApiOkResponse({
      description: 'Cupom removido com sucesso.',
      schema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'c0a80121-0001-4000-8000-123456789012' },
        },
      },
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
