import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index.js';
import { professionalProfileWithUserResponseSchema } from './professionals.schemas.js';

export function GetProfessionalProfileApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca o perfil do profissional',
      description:
        'Retorna os dados completos do perfil profissional junto com as informações públicas do usuário associado.',
    }),
    ApiUuidParam('userId', 'ID do usuário profissional.'),
    ApiOkResponse({
      description: 'Perfil do profissional encontrado com sucesso.',
      schema: professionalProfileWithUserResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}
