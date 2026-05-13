import { applyDecorators } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
} from '@nestjs/swagger';
import { ApiCommonErrorResponses } from '../../common/swagger/index';
import {
  authTokensResponseSchema,
  refreshAuthorizationHeaderSchema,
} from './auth.schemas';

export function RefreshAuthApiDocs(): MethodDecorator {
  return applyDecorators(
    ApiOperation({
      summary: 'Renova os tokens',
      description:
        'Recebe um refresh token no header Authorization e retorna um novo par de tokens, invalidando o refresh token anterior.',
    }),
    ApiHeader({
      name: 'Authorization',
      required: true,
      description: 'Header no formato Bearer <refreshToken>.',
      schema: refreshAuthorizationHeaderSchema,
    }),
    ApiCreatedResponse({
      description: 'Tokens renovados com sucesso.',
      schema: authTokensResponseSchema,
    }),
    ApiCommonErrorResponses({
      includeBadRequest: false,
      includeConflict: false,
      includeUnauthorized: true,
      includeForbidden: false,
      includeNotFound: false,
    }),
  );
}

