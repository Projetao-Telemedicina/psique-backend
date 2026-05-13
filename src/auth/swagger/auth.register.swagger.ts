import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  createUserRequestExamples,
  createUserRequestSchema,
  createUserResponseSchema,
} from './auth.schemas';

export function RegisterAuthApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Cadastra um usuario',
      description:
        'Cria um usuario administrador, paciente ou profissional, reaproveitando as validacoes do modulo de usuarios.',
    }),
    ApiBody({
      required: true,
      schema: createUserRequestSchema,
      examples: createUserRequestExamples,
    }),
    ApiCreatedResponse({
      description: 'Usuario cadastrado com sucesso.',
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

