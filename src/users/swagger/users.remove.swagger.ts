import { applyDecorators } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import { userListItemSchema } from './users.schemas';

export function RemoveUserApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Inativa um usuário',
      description:
        'Realiza uma exclusão lógica do usuário, atualizando seu status para INACTIVE.',
    }),
    ApiUuidParam('id', 'ID do usuário.'),
    ApiOkResponse({
      description: 'Usuário inativado com sucesso.',
      schema: userListItemSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}

