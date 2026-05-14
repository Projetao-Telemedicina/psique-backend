import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import { professionalValidationRequestResponseSchema } from './professionals.schemas';

export function GetProfessionalValidationRequestApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiBearerAuth('access-token'),
    ApiOperation({
      summary: 'Consulta a ultima solicitacao de validacao do profissional',
      description:
        'Retorna o status da solicitacao de validacao mais recente do profissional autenticado.',
    }),
    ApiOkResponse({
      description: 'Solicitacao de validacao encontrada com sucesso.',
      schema: professionalValidationRequestResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: true,
      includeForbidden: true,
      includeNotFound: true,
    }),
  );
}
