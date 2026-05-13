import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ApiCommonErrorResponses,
  ApiUuidParam,
} from '../../common/swagger/index';
import {
  updateUserRequestSchema,
  userListItemSchema,
} from './users.schemas';

export function UpdateUserApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Atualiza um usuário',
      description:
        'Atualiza os dados cadastrais do usuário e, quando enviado, faz upsert dos perfis de paciente ou profissional.',
    }),
    ApiUuidParam('id', 'ID do usuário.'),
    ApiBody({
      required: true,
      schema: updateUserRequestSchema,
    }),
    ApiOkResponse({
      description: 'Usuário atualizado com sucesso.',
      schema: userListItemSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
    }),
  );
}

