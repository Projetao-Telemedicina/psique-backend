import { applyDecorators } from '@nestjs/common';
import { ApiNoContentResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';

export function HandleExpiredRescheduleRequestsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Processa expiracao de solicitacoes pendentes',
      description:
        'Executa a rotina que expira solicitacoes pendentes e cancela consultas sem consenso.',
    }),
    ApiNoContentResponse({
      description: 'Processamento executado com sucesso.',
    }),
    ApiCommonErrorResponses({
      includeBadRequest: false,
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
    }),
  );
}
