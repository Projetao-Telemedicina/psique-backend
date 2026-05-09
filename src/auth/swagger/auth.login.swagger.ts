import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOperation } from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  authTokensResponseSchema,
  loginRequestSchema,
} from './auth.schemas';

export function LoginAuthApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Login de usuario',
      description:
        'Valida e-mail e senha e retorna access token e refresh token.',
    }),
    ApiBody({
      required: true,
      schema: loginRequestSchema,
    }),
    ApiCreatedResponse({
      description: 'Tokens gerados com sucesso.',
      schema: authTokensResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: true,
      includeConflict: false,
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: false,
    }),
  );
}

