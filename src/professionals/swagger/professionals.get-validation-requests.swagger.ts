import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import { professionalValidationRequestListResponseSchema } from './professionals.schemas';

export function GetProfessionalValidationRequestsApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Lista o historico de solicitacoes de validacao do profissional',
      description:
        'Retorna todas as solicitacoes de validacao do profissional autenticado, da mais recente para a mais antiga.',
    }),
    ApiOkResponse({
      description: 'Historico de solicitacoes retornado com sucesso.',
      schema: professionalValidationRequestListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
