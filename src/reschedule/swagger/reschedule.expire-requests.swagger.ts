import { applyDecorators } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';

export function ExpireRescheduleRequestsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Expira solicitacoes de reagendamento pendentes',
      description:
        'Marca solicitacoes vencidas como expiradas e cancela as consultas relacionadas.',
    }),
    ApiNoContentResponse({
      description: 'Expiracao executada com sucesso.',
    }),
    ApiCommonErrorResponses({
      includeBadRequest: false,
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
    }),
  );
}
