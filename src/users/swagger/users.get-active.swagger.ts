import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index.js';
import { userListResponseSchema } from './users.schemas.js';

export function GetActiveUsersApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista os usuários ativos',
      description:
        'Retorna todos os usuários cujo status atual está marcado como ACTIVE.',
    }),
    ApiOkResponse({
      description: 'Lista de usuários ativos retornada com sucesso.',
      schema: userListResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: false,
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
    }),
  );
}
