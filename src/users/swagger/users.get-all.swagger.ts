import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index.js';
import { userListResponseSchema } from './users.schemas.js';

export function GetAllUsersApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Lista todos os usuários',
      description:
        'Retorna todos os usuários cadastrados com os campos públicos e administrativos disponíveis na listagem.',
    }),
    ApiOkResponse({
      description: 'Lista de usuários retornada com sucesso.',
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
