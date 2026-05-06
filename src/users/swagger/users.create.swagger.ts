import { applyDecorators } from '@nestjs/common';
import {
  ApiBody,
  ApiCreatedResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index.js';
import {
  createUserRequestSchema,
  createUserResponseSchema,
} from './users.schemas.js';

export function CreateUserApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cria um usuário',
      description:
        'Cria um usuário do tipo administrador, paciente ou profissional, incluindo os perfis relacionados quando enviados.',
    }),
    ApiBody({
      required: true,
      schema: createUserRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Usuário criado com sucesso.',
      schema: createUserResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeUnauthorized: false,
      includeForbidden: false,
      includeNotFound: false,
      includeConflict: true,
    }),
  );
}
