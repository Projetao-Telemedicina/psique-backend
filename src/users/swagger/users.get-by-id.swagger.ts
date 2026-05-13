import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import { userListItemSchema } from './users.schemas';

export function GetUserByIdApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Busca um usuário por ID',
      description:
        'Retorna os dados públicos e cadastrais de um usuário específico a partir do seu identificador.',
    }),
    ApiUuidParam('id', 'ID do usuário.'),
    ApiOkResponse({
      description: 'Usuário encontrado com sucesso.',
      schema: userListItemSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}

